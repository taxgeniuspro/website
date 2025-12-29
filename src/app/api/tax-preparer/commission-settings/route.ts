/**
 * Commission Settings API
 *
 * Allows tax preparers to manage their commission tier settings for referrers.
 * Tax Preparers do NOT earn commissions - they manage rates for their referrers.
 *
 * Supports flexible 1-5 tier commission structures.
 *
 * GET: Retrieve current commission settings
 * PUT: Update commission tier settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import {
  getPreparerCommissionSettings,
  updatePreparerCommissionSettings,
  getPreparerReferrersWithRates,
} from '@/lib/services/tiered-commission.service';
import { logger } from '@/lib/logger';
import {
  FlexibleTierStructure,
  validateTierStructure,
  isLegacyFormat,
  normalizeToFlexible,
} from '@/lib/types/commission-tiers';

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
    const { data: profiles } = await db
      .from('profiles')
      .select('id')
      .eq('userId', user.id)
      .limit(1);

    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get commission settings (already normalized to flexible format)
    const settings = await getPreparerCommissionSettings(profile.id);

    // Get referrers with their rates
    const referrers = await getPreparerReferrersWithRates(profile.id);

    return NextResponse.json({
      settings: {
        useCompanyDefaults: settings.useCompanyDefaults,
        customTierStructure: settings.customTierStructure,
        companyDefaultTiers: settings.companyDefaultTiers,
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
 * Accepts flexible tier structure (1-5 tiers) or legacy format for backward compatibility
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
    const { data: profiles } = await db
      .from('profiles')
      .select('id')
      .eq('userId', user.id)
      .limit(1);

    const profile = firstOrNull(profiles);

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
    let normalizedTiers: FlexibleTierStructure | undefined;
    if (!useCompanyDefaults && customTierStructure) {
      // Handle legacy format for backward compatibility
      if (isLegacyFormat(customTierStructure)) {
        normalizedTiers = normalizeToFlexible(customTierStructure);
      } else if (Array.isArray(customTierStructure)) {
        normalizedTiers = customTierStructure as FlexibleTierStructure;
      } else {
        return NextResponse.json(
          { error: 'customTierStructure must be an array of tiers' },
          { status: 400 }
        );
      }

      // Validate the tier structure
      const validation = validateTierStructure(normalizedTiers);
      if (!validation.valid) {
        return NextResponse.json(
          { error: `Invalid tier structure: ${validation.errors.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Update settings
    await updatePreparerCommissionSettings(profile.id, {
      useCompanyDefaults,
      customTierStructure: useCompanyDefaults ? undefined : normalizedTiers,
    });

    logger.info('Commission settings updated', {
      preparerId: profile.id,
      useCompanyDefaults,
      tierCount: normalizedTiers?.length,
    });

    // Return updated settings
    const updatedSettings = await getPreparerCommissionSettings(profile.id);

    return NextResponse.json({
      success: true,
      settings: {
        useCompanyDefaults: updatedSettings.useCompanyDefaults,
        customTierStructure: updatedSettings.customTierStructure,
        companyDefaultTiers: updatedSettings.companyDefaultTiers,
      },
    });
  } catch (error) {
    logger.error('Error updating commission settings', { error });
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
