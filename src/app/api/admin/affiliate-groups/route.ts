import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { CommissionType } from '@prisma/client';
import {
  createAffiliateGroup,
  getAffiliateGroups,
  validateTierConfig,
} from '@/lib/services/affiliate-group.service';

/**
 * GET /api/admin/affiliate-groups
 * Fetch all affiliate groups with pagination and filtering (admin only)
 */
export async function GET(req: NextRequest) {
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

    // Parse query params
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search') || undefined;

    const result = await getAffiliateGroups({
      page,
      limit,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Failed to fetch affiliate groups', error);
    return NextResponse.json({ error: 'Failed to fetch affiliate groups' }, { status: 500 });
  }
}

/**
 * POST /api/admin/affiliate-groups
 * Create a new affiliate group (admin only)
 */
export async function POST(req: NextRequest) {
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

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
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

    // Create group
    const group = await createAffiliateGroup({
      name,
      description,
      commissionType: commissionType || CommissionType.PERCENTAGE,
      commissionRate,
      flatAmount,
      tieredRates,
      isActive: isActive !== undefined ? isActive : true,
      minimumPayout: minimumPayout || 50,
      payoutFrequency: payoutFrequency || 'MONTHLY',
    });

    logger.info('Affiliate group created', { groupId: group.id, name: group.name });

    return NextResponse.json(group);
  } catch (error) {
    // Check for unique constraint error
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A group with this name already exists' },
        { status: 400 }
      );
    }

    logger.error('Failed to create affiliate group', error);
    return NextResponse.json({ error: 'Failed to create affiliate group' }, { status: 500 });
  }
}
