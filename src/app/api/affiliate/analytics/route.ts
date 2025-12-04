import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMyAffiliateAnalytics } from '@/lib/services/lead-analytics.service';
import { logger } from '@/lib/logger';

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

    const role = user?.role as string;
    if (role !== 'affiliate') {
      return NextResponse.json(
        { error: 'Forbidden: Only affiliates can access this endpoint' },
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
