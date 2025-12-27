import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getMyAffiliateAnalytics } from '@/lib/services/lead-analytics.service';
import { logger } from '@/lib/logger';
import { hasAffiliateAccess } from '@/lib/permissions';

/**
 * GET /api/affiliate/analytics
 * Get analytics data for the authenticated affiliate
 * Access: Affiliate role only
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check affiliate access
    // Use findFirst with OR conditions for Supabase Auth compatibility
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { supabaseUserId: user.id },
          { userId: user.id },
          { email: user.email }
        ]
      },
      select: { role: true, affiliateStatus: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user has affiliate access using centralized function
    if (!hasAffiliateAccess(profile.role as any, profile.affiliateStatus as any)) {
      return NextResponse.json(
        { error: 'Forbidden: Affiliate access required' },
        { status: 403 }
      );
    }

    // Get analytics for this affiliate
    const analyticsData = await getMyAffiliateAnalytics(user.id);

    return NextResponse.json(analyticsData);
  } catch (error) {
    logger.error('Error fetching affiliate analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
