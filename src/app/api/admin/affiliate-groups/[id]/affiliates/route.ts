import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  addAffiliateToGroup,
  removeAffiliateFromGroup,
  getAffiliateGroupById,
} from '@/lib/services/affiliate-group.service';

/**
 * GET /api/admin/affiliate-groups/[id]/affiliates
 * Get all affiliates in a group (admin only)
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { supabaseUserId: userId },
          { userId: userId },
          { email: session?.user?.email }
        ]
      },
    });

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if group exists
    const group = await getAffiliateGroupById(id);

    if (!group) {
      return NextResponse.json({ error: 'Affiliate group not found' }, { status: 404 });
    }

    // Parse query params for pagination
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    // Get affiliates in the group
    const [affiliates, total] = await Promise.all([
      prisma.profile.findMany({
        where: { affiliateGroupId: id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          affiliateStatus: true,
          totalConversions: true,
          lifetimeEarnings: true,
          currentTier: true,
          customCommissionType: true,
          customCommissionRate: true,
          customFlatAmount: true,
          createdAt: true,
        },
        orderBy: { totalConversions: 'desc' },
        skip,
        take: limit,
      }),
      prisma.profile.count({
        where: { affiliateGroupId: id },
      }),
    ]);

    // Serialize affiliates (convert Decimal to number)
    const serializedAffiliates = affiliates.map((affiliate) => ({
      ...affiliate,
      lifetimeEarnings: affiliate.lifetimeEarnings?.toNumber() ?? 0,
      customCommissionRate: affiliate.customCommissionRate?.toNumber() ?? null,
      customFlatAmount: affiliate.customFlatAmount?.toNumber() ?? null,
    }));

    return NextResponse.json({
      affiliates: serializedAffiliates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch group affiliates', error);
    return NextResponse.json({ error: 'Failed to fetch group affiliates' }, { status: 500 });
  }
}

/**
 * POST /api/admin/affiliate-groups/[id]/affiliates
 * Add an affiliate to the group (admin only)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { supabaseUserId: userId },
          { userId: userId },
          { email: session?.user?.email }
        ]
      },
    });

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { profileId } = body;

    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    // Check if group exists
    const group = await getAffiliateGroupById(id);

    if (!group) {
      return NextResponse.json({ error: 'Affiliate group not found' }, { status: 404 });
    }

    // Add affiliate to group
    const updatedProfile = await addAffiliateToGroup(profileId, id);

    logger.info('Affiliate added to group', { profileId, groupId: id });

    return NextResponse.json({
      success: true,
      message: 'Affiliate added to group successfully',
      affiliate: {
        id: updatedProfile.id,
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        email: updatedProfile.email,
        affiliateGroupId: updatedProfile.affiliateGroupId,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Profile not found')) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }
      if (error.message.includes('already in this group')) {
        return NextResponse.json({ error: 'Affiliate is already in this group' }, { status: 400 });
      }
    }

    logger.error('Failed to add affiliate to group', error);
    return NextResponse.json({ error: 'Failed to add affiliate to group' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/affiliate-groups/[id]/affiliates
 * Remove an affiliate from the group (admin only)
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
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { supabaseUserId: userId },
          { userId: userId },
          { email: session?.user?.email }
        ]
      },
    });

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Get profileId from query params
    const searchParams = req.nextUrl.searchParams;
    const profileId = searchParams.get('profileId');

    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    // Check if group exists
    const group = await getAffiliateGroupById(id);

    if (!group) {
      return NextResponse.json({ error: 'Affiliate group not found' }, { status: 404 });
    }

    // Remove affiliate from group
    const updatedProfile = await removeAffiliateFromGroup(profileId);

    logger.info('Affiliate removed from group', { profileId, groupId: id });

    return NextResponse.json({
      success: true,
      message: 'Affiliate removed from group successfully',
      affiliate: {
        id: updatedProfile.id,
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        email: updatedProfile.email,
        affiliateGroupId: updatedProfile.affiliateGroupId,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Profile not found')) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    logger.error('Failed to remove affiliate from group', error);
    return NextResponse.json({ error: 'Failed to remove affiliate from group' }, { status: 500 });
  }
}
