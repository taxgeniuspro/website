import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { getMyAffiliateAnalytics } from '@/lib/services/lead-analytics.service';
import { logger } from '@/lib/logger';
import { hasAffiliateAccess } from '@/lib/permissions';

// TypeScript interfaces (replacing Prisma types)
interface ProfileRole {
  role: string | null;
  affiliateStatus: string | null;
}

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
    // Use Supabase OR conditions for Supabase Auth compatibility
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('role, affiliateStatus')
      .or(`supabaseUserId.eq.${user.id},userId.eq.${user.id},email.eq.${user.email}`)
      .limit(1);

    if (profileError) {
      logger.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const profile = firstOrNull<ProfileRole>(profileData);

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
