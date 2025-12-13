import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { CommissionType } from '@prisma/client';
import {
  getAffiliateGroupById,
  updateAffiliateGroup,
  deleteAffiliateGroup,
  getGroupStatistics,
  validateTierConfig,
} from '@/lib/services/affiliate-group.service';

/**
 * GET /api/admin/affiliate-groups/[id]
 * Get a single affiliate group with statistics (admin only)
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Get date range from query params
    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const group = await getAffiliateGroupById(id, true);

    if (!group) {
      return NextResponse.json({ error: 'Affiliate group not found' }, { status: 404 });
    }

    // Get statistics
    const statistics = await getGroupStatistics(
      id,
      startDate && endDate
        ? {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          }
        : undefined
    );

    return NextResponse.json({
      ...group,
      statistics,
    });
  } catch (error) {
    logger.error('Failed to fetch affiliate group', error);
    return NextResponse.json({ error: 'Failed to fetch affiliate group' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/affiliate-groups/[id]
 * Update an affiliate group (admin only)
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      name,
      description,
      commissionType,
      commissionRate,
      flatAmount,
      tieredRates,
      isActive,
      minimumPayout,
      payoutFrequency,
    } = body;

    // Check if group exists
    const existingGroup = await getAffiliateGroupById(id);

    if (!existingGroup) {
      return NextResponse.json({ error: 'Affiliate group not found' }, { status: 404 });
    }

    // Validate commission type
    if (commissionType && !Object.values(CommissionType).includes(commissionType)) {
      return NextResponse.json(
        { error: 'Invalid commission type. Must be PERCENTAGE, FLAT, or TIERED' },
        { status: 400 }
      );
    }

    // Validate tiered rates if commission type is TIERED
    if (commissionType === CommissionType.TIERED) {
      if (!tieredRates || !Array.isArray(tieredRates)) {
        return NextResponse.json(
          { error: 'Tiered rates are required for TIERED commission type' },
          { status: 400 }
        );
      }

      const validation = validateTierConfig(tieredRates);
      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Invalid tiered rates', details: validation.errors },
          { status: 400 }
        );
      }
    }

    // Update group
    const group = await updateAffiliateGroup(id, {
      name,
      description,
      commissionType,
      commissionRate,
      flatAmount,
      tieredRates,
      isActive,
      minimumPayout,
      payoutFrequency,
    });

    logger.info('Affiliate group updated', { groupId: group.id, name: group.name });

    return NextResponse.json(group);
  } catch (error) {
    // Check for unique constraint error
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A group with this name already exists' },
        { status: 400 }
      );
    }

    logger.error('Failed to update affiliate group', error);
    return NextResponse.json({ error: 'Failed to update affiliate group' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/affiliate-groups/[id]
 * Delete an affiliate group (admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if group exists
    const existingGroup = await getAffiliateGroupById(id);

    if (!existingGroup) {
      return NextResponse.json({ error: 'Affiliate group not found' }, { status: 404 });
    }

    // Parse query params for force delete
    const searchParams = req.nextUrl.searchParams;
    const force = searchParams.get('force') === 'true';

    const result = await deleteAffiliateGroup(id, force);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logger.info('Affiliate group deleted', { groupId: id, force });

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    logger.error('Failed to delete affiliate group', error);
    return NextResponse.json({ error: 'Failed to delete affiliate group' }, { status: 500 });
  }
}
