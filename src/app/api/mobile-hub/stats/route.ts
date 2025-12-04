/**
 * Mobile Hub Stats API
 *
 * GET /api/mobile-hub/stats - Get user's mobile hub statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create stats record
    let stats = await prisma.mobileHubStats.findUnique({
      where: { userId: userId },
    });

    if (!stats) {
      // Create initial stats record
      stats = await prisma.mobileHubStats.create({
        data: {
          userId: userId,
          userRole: 'client', // Will be updated
        },
      });
    }

    // Calculate real-time stats if needed
    const shouldRecalculate =
      new Date().getTime() - new Date(stats.lastCalculated).getTime() > 5 * 60 * 1000; // 5 minutes

    if (shouldRecalculate) {
      await recalculateStats(userId);
      // Refetch updated stats
      stats = await prisma.mobileHubStats.findUnique({
        where: { userId: userId },
      });
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

async function recalculateStats(userId: string) {
  try {
    // Count shares
    const shareCount = await prisma.mobileHubShare.count({
      where: { userId: userId },
    });

    // Count clicks
    const clickCount = await prisma.mobileHubLinkClick.count({
      where: { userId: userId },
    });

    // Count conversions
    const conversionCount = await prisma.mobileHubLinkClick.count({
      where: {
        userId: userId,
        converted: true,
      },
    });

    // Update stats
    await prisma.mobileHubStats.update({
      where: { userId: userId },
      data: {
        linkShares: shareCount,
        linkClicks: clickCount,
        formsCompleted: conversionCount,
        lastCalculated: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error recalculating stats', { error });
  }
}
