/**
 * Commission Settings API
 *
 * Allows tax preparers to manage their commission tier settings for referrers.
 * Tax Preparers do NOT earn commissions - they manage rates for their referrers.
 *
 * GET: Retrieve current commission settings
 * PUT: Update commission tier settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getPreparerCommissionSettings,
  updatePreparerCommissionSettings,
  getPreparerReferrersWithRates,
  setReferrerVIPRate,
  COMPANY_DEFAULT_TIERS,
} from '@/lib/services/tiered-commission.service';
import { logger } from '@/lib/logger';

/**
 * GET /api/tax-preparer/commission-settings
 *
 * Returns the preparer's current commission settings and list of referrers with their rates
 */
export async function GET() {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'tax_preparer' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get commission settings
    const settings = await getPreparerCommissionSettings(profile.id);

    // Get referrers with their rates
    const referrers = await getPreparerReferrersWithRates(profile.id);

    return NextResponse.json({
      settings: {
        useCompanyDefaults: settings.useCompanyDefaults,
        customTierStructure: settings.customTierStructure,
        companyDefaultTiers: COMPANY_DEFAULT_TIERS,
      },
      referrers,
    });
  } catch (error) {
    logger.error('Error fetching commission settings', { error });
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

/**
 * PUT /api/tax-preparer/commission-settings
 *
 * Updates the preparer's commission tier settings
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'tax_preparer' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { useCompanyDefaults, customTierStructure } = body;

    // Validate input
    if (typeof useCompanyDefaults !== 'boolean') {
      return NextResponse.json(
        { error: 'useCompanyDefaults must be a boolean' },
        { status: 400 }
      );
    }

    // Validate custom tier structure if not using company defaults
    if (!useCompanyDefaults && customTierStructure) {
      const { tier1, tier2, tier3 } = customTierStructure;

      // Validate tier1
      if (tier1 && (typeof tier1.max !== 'number' || typeof tier1.rate !== 'number')) {
        return NextResponse.json(
          { error: 'tier1 must have max and rate as numbers' },
          { status: 400 }
        );
      }

      // Validate tier2
      if (tier2 && (typeof tier2.max !== 'number' || typeof tier2.rate !== 'number')) {
        return NextResponse.json(
          { error: 'tier2 must have max and rate as numbers' },
          { status: 400 }
        );
      }

      // Validate tier3
      if (tier3 && typeof tier3.rate !== 'number') {
        return NextResponse.json(
          { error: 'tier3 must have rate as a number' },
          { status: 400 }
        );
      }
    }

    // Update settings
    await updatePreparerCommissionSettings(profile.id, {
      useCompanyDefaults,
      customTierStructure: useCompanyDefaults ? undefined : customTierStructure,
    });

    logger.info('Commission settings updated', {
      preparerId: profile.id,
      useCompanyDefaults,
    });

    // Return updated settings
    const updatedSettings = await getPreparerCommissionSettings(profile.id);

    return NextResponse.json({
      success: true,
      settings: {
        useCompanyDefaults: updatedSettings.useCompanyDefaults,
        customTierStructure: updatedSettings.customTierStructure,
        companyDefaultTiers: COMPANY_DEFAULT_TIERS,
      },
    });
  } catch (error) {
    logger.error('Error updating commission settings', { error });
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
