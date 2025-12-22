/**
 * Admin Commission Settings API
 *
 * Allows administrators to manage company-wide default commission tiers.
 * These tiers are used when tax preparers choose "Use Company Defaults".
 *
 * GET: Retrieve current company default tiers
 * PUT: Update company default tiers
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getCompanyDefaultTiers,
  updateCompanyDefaultTiers,
} from '@/lib/services/tiered-commission.service';
import { logger } from '@/lib/logger';
import {
  FlexibleTierStructure,
  validateTierStructure,
} from '@/lib/types/commission-tiers';

/**
 * GET /api/admin/commission-settings
 *
 * Returns the current company default commission tiers
 */
export async function GET() {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Get company default tiers
    const tiers = await getCompanyDefaultTiers();

    // Get last update info
    const setting = await prisma.systemSettings.findUnique({
      where: { key: 'commission_default_tiers' },
      include: {
        updatedBy: {
          select: {
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
          },
        },
      },
    });

    return NextResponse.json({
      tiers,
      lastUpdatedAt: setting?.updatedAt ?? null,
      lastUpdatedBy: setting?.updatedBy
        ? `${setting.updatedBy.firstName || ''} ${setting.updatedBy.lastName || ''}`.trim() ||
          setting.updatedBy.user.email
        : null,
    });
  } catch (error) {
    logger.error('Error fetching admin commission settings', { error });
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/commission-settings
 *
 * Updates the company default commission tiers
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Get admin's profile ID for audit
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    const body = await request.json();
    const { tiers } = body;

    // Validate tiers
    if (!tiers || !Array.isArray(tiers)) {
      return NextResponse.json(
        { error: 'tiers must be an array' },
        { status: 400 }
      );
    }

    const validation = validateTierStructure(tiers as FlexibleTierStructure);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Invalid tier structure: ${validation.errors.join(', ')}` },
        { status: 400 }
      );
    }

    // Update company default tiers
    await updateCompanyDefaultTiers(tiers as FlexibleTierStructure, profile?.id);

    logger.info('Company commission settings updated', {
      updatedBy: user.id,
      tierCount: tiers.length,
    });

    // Return updated tiers
    const updatedTiers = await getCompanyDefaultTiers();

    return NextResponse.json({
      success: true,
      tiers: updatedTiers,
    });
  } catch (error) {
    logger.error('Error updating admin commission settings', { error });
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
