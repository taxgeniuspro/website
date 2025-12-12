import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getTierProgress, getEffectiveCommissionRate } from '@/lib/services/tiered-commission.service';

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
      profile.role === 'super_admin';

    if (!isAffiliate) {
      return NextResponse.json({ error: 'Not authorized as affiliate' }, { status: 403 });
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
        lifetimeEarnings: profile.lifetimeEarnings?.toNumber() ?? 0,
        currentTier: profile.currentTier,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch tier progress', error);
    return NextResponse.json({ error: 'Failed to fetch tier progress' }, { status: 500 });
  }
}
