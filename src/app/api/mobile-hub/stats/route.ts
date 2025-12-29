/**
 * Mobile Hub Stats API
 *
 * GET /api/mobile-hub/stats - Get user's mobile hub statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local TypeScript interface
interface MobileHubStats {
  id: string;
  userId: string;
  supabaseUserId?: string;
  email?: string;
  userRole: string;
  linkShares: number;
  linkViews: number;
  linkClicks: number;
  formsStarted: number;
  formsCompleted: number;
  referrals: number;
  conversions: number;
  earningsCents: number;
  lastCalculated: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create stats record
    const { data: statsRecords } = await db
      .from('mobile_hub_stats')
      .select('*')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email || ''}`)
      .limit(1);

    let stats = firstOrNull(statsRecords) as MobileHubStats | null;

    if (!stats) {
      // Create initial stats record
      const { data: newStats } = await db
        .from('mobile_hub_stats')
        .insert({
          user_id: userId,
          user_role: 'client', // Will be updated
        })
        .select()
        .single();

      stats = newStats as MobileHubStats;
    }

    // Calculate real-time stats if needed
    const shouldRecalculate =
      new Date().getTime() - new Date(stats?.lastCalculated || 0).getTime() > 5 * 60 * 1000; // 5 minutes

    if (shouldRecalculate && stats) {
      await recalculateStats(userId, stats.id);
      // Refetch updated stats
      const { data: refreshedStats } = await db
        .from('mobile_hub_stats')
        .select('*')
        .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email || ''}`)
        .limit(1);

      stats = firstOrNull(refreshedStats) as MobileHubStats | null;
    }

    return NextResponse.json({
      success: true,
      data: {
        linkShares: stats?.linkShares || 0,
        linkViews: stats?.linkViews || 0,
        linkClicks: stats?.linkClicks || 0,
        formsStarted: stats?.formsStarted || 0,
        formsCompleted: stats?.formsCompleted || 0,
        referrals: stats?.referrals || 0,
        conversions: stats?.conversions || 0,
        earnings: (stats?.earningsCents || 0) / 100,
      },
    });
  } catch (error) {
    logger.error('Error fetching mobile hub stats', { error });
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

async function recalculateStats(userId: string, statsId: string) {
  try {
    // Count shares
    const { count: shareCount } = await db
      .from('mobile_hub_shares')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Count clicks
    const { count: clickCount } = await db
      .from('mobile_hub_link_clicks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Count conversions
    const { count: conversionCount } = await db
      .from('mobile_hub_link_clicks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('converted', true);

    // Update stats
    await db
      .from('mobile_hub_stats')
      .update({
        link_shares: shareCount || 0,
        link_clicks: clickCount || 0,
        forms_completed: conversionCount || 0,
        last_calculated: new Date().toISOString(),
      })
      .eq('id', statsId);
  } catch (error) {
    logger.error('Error recalculating stats', { error });
  }
}
