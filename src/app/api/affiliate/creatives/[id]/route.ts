import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { CreativePrivacy, CreativeStatus } from '@prisma/client';

/**
 * GET /api/affiliate/creatives/[id]
 * Get a single creative if accessible to the affiliate
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user is an affiliate
    const isAffiliate =
      profile.role === 'affiliate' ||
      profile.role === 'tax_preparer' ||
      profile.role === 'admin' ||
      profile.role === 'admin';

    if (!isAffiliate) {
      return NextResponse.json({ error: 'Not authorized as affiliate' }, { status: 403 });
    }

    const { id } = await params;

    // Get creative with groups
    const creative = await prisma.affiliateCreative.findUnique({
      where: { id },
      include: {
        groups: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!creative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
    }

    // Check if creative is active
    if (creative.status !== CreativeStatus.ACTIVE) {
      // Admins can see all
      if (profile.role !== 'admin' && profile.role !== 'admin') {
        return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
      }
    }

    // Check access based on privacy
    if (creative.privacy === CreativePrivacy.PRIVATE) {
      // Check if affiliate is in the allowed list
      if (!creative.affiliateIds.includes(profile.id)) {
        // Admins can see all
        if (profile.role !== 'admin' && profile.role !== 'admin') {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }
    } else if (creative.privacy === CreativePrivacy.GROUP_ONLY) {
      // Check if affiliate's group is in the allowed list
      const hasAccess =
        (profile.affiliateGroupId && creative.groupIds.includes(profile.affiliateGroupId)) ||
        creative.affiliateIds.includes(profile.id);

      if (!hasAccess) {
        // Admins can see all
        if (profile.role !== 'admin' && profile.role !== 'admin') {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }
    }

    // Increment views (don't wait for this)
    prisma.affiliateCreative
      .update({
        where: { id },
        data: { views: { increment: 1 } },
      })
      .catch((err) => {
        logger.error('Failed to increment creative views', err);
      });

    return NextResponse.json(creative);
  } catch (error) {
    logger.error('Failed to fetch creative', error);
    return NextResponse.json({ error: 'Failed to fetch creative' }, { status: 500 });
  }
}
