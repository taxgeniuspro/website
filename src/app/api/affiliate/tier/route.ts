import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getTierProgress, getEffectiveCommissionRate } from '@/lib/services/tiered-commission.service';
import { hasAffiliateAccess } from '@/lib/permissions';

// TypeScript interfaces (replacing Prisma types)
interface Profile {
  id: string;
  role: string | null;
  affiliateStatus: string | null;
  totalConversions: number;
  lifetimeEarnings: number | null;
  currentTier: string | null;
}

/**
 * GET /api/affiliate/tier
 * Get the current affiliate's tier progress and commission rate
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile - use Supabase OR conditions for Supabase Auth compatibility
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id, role, affiliateStatus, totalConversions, lifetimeEarnings, currentTier')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (profileError) {
      logger.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const profile = firstOrNull<Profile>(profileData);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user has affiliate access using centralized function
    if (!hasAffiliateAccess(profile.role as any, profile.affiliateStatus as any)) {
      return NextResponse.json({ error: 'Affiliate access required' }, { status: 403 });
    }

    // Get tier progress
    const tierProgress = await getTierProgress(profile.id);

    // Get effective commission rate
    const effectiveRate = await getEffectiveCommissionRate(profile.id);

    return NextResponse.json({
      tierProgress,
      effectiveRate: {
        type: effectiveRate.type,
        rate: effectiveRate.rate,
        flatAmount: effectiveRate.flatAmount,
        source: effectiveRate.source,
        tier: effectiveRate.tier,
        minimumPayout: effectiveRate.minimumPayout,
      },
      stats: {
        totalConversions: profile.totalConversions,
        lifetimeEarnings: profile.lifetimeEarnings ?? 0,
        currentTier: profile.currentTier,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch tier progress', error);
    return NextResponse.json({ error: 'Failed to fetch tier progress' }, { status: 500 });
  }
}
