/**
 * Payout History API
 *
 * GET /api/payouts/history?limit=20
 * Returns payout history for authenticated user
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { getPayoutHistory } from '@/lib/services/commission.service';
import { logger } from '@/lib/logger';

// TypeScript interface for profile
interface Profile {
  id: string;
  shortLinkUsername: string | null;
  role: string;
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with username
    const { data: profileData } = await db
      .from('profiles')
      .select('id, shortLinkUsername, role')
      .eq('userId', userId)
      .limit(1);

    const profile = firstOrNull(profileData) as Profile | null;

    if (!profile || !profile.shortLinkUsername) {
      return NextResponse.json({
        payouts: [],
        total: 0,
      });
    }

    // Get limit parameter
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get payout history
    const payouts = await getPayoutHistory(profile.shortLinkUsername, limit);

    return NextResponse.json({
      payouts,
      total: payouts.length,
    });
  } catch (error) {
    logger.error('Error fetching payout history', { error });
    return NextResponse.json({ error: 'Failed to fetch payout history' }, { status: 500 });
  }
}
