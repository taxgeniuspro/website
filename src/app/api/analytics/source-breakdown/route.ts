/**
 * Source Breakdown Analytics API
 *
 * GET /api/analytics/source-breakdown
 * Returns lead source attribution breakdown (by type, campaign, location)
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface SourceBreakdown {
  byType: Array<{
    type: string;
    count: number;
    clicks: number;
    conversions: number;
    conversionRate: number;
    earnings?: number;
  }>;
  byCampaign: Array<{
    campaign: string;
    count: number;
    clicks: number;
    conversions: number;
    conversionRate: number;
  }>;
  byLocation: Array<{
    location: string;
    count: number;
    clicks: number;
    conversions: number;
    conversionRate: number;
  }>;
  summary: {
    totalMaterials: number;
    totalClicks: number;
    totalConversions: number;
    averageConversionRate: number;
    bestPerformingType: string;
    bestPerformingCampaign: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const dateRange = url.searchParams.get('dateRange') || 'all';

    // Calculate date filter
    let dateFilter = {};
    if (dateRange !== 'all') {
      const now = new Date();
      const start = new Date();

      switch (dateRange) {
        case 'week':
          start.setDate(now.getDate() - 7);
          break;
        case 'month':
          start.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          start.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          start.setFullYear(now.getFullYear() - 1);
          break;
      }

      dateFilter = {
        createdAt: {
          gte: start,
          lte: now,
        },
      };
    }

    // Group by type
    const byType = await prisma.marketingLink.groupBy({
      by: ['linkType'],
      where: {
        creatorId: userId,
        isActive: true,
        ...dateFilter,
      },
      _count: {
        id: true,
      },
      _sum: {
        clicks: true,
        returnsFiled: true,
      },
    });

    // Group by campaign
    const byCampaign = await prisma.marketingLink.groupBy({
      by: ['campaign'],
      where: {
        creatorId: userId,
        isActive: true,
        campaign: { not: null },
        ...dateFilter,
      },
      _count: {
        id: true,
      },
      _sum: {
        clicks: true,
        returnsFiled: true,
      },
    });

    // Group by location
    const byLocation = await prisma.marketingLink.groupBy({
      by: ['location'],
      where: {
        creatorId: userId,
        isActive: true,
        location: { not: null },
        ...dateFilter,
      },
      _count: {
        id: true,
      },
      _sum: {
        clicks: true,
        returnsFiled: true,
      },
    });

    // Get earnings by material (for referrers/affiliates)
    const commissions = await prisma.commission.groupBy({
      by: ['referralId'],
      where: {
        referrerId: userId,
      },
      _sum: {
        amount: true,
      },
    });

    const commissionMap = new Map(
      commissions.map((c) => [c.referralId, Number(c._sum.amount || 0)])
    );

    // Format by type
    const formattedByType = byType.map((item) => {
      const clicks = item._sum.clicks || 0;
      const conversions = item._sum.returnsFiled || 0;
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

      return {
        type: item.linkType,
        count: item._count.id,
        clicks,
        conversions,
        conversionRate: Number(conversionRate.toFixed(2)),
      };
    });

    // Format by campaign
    const formattedByCampaign = byCampaign.map((item) => {
      const clicks = item._sum.clicks || 0;
      const conversions = item._sum.returnsFiled || 0;
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

      return {
        campaign: item.campaign || 'Uncategorized',
        count: item._count.id,
        clicks,
        conversions,
        conversionRate: Number(conversionRate.toFixed(2)),
      };
    });

    // Format by location
    const formattedByLocation = byLocation.map((item) => {
      const clicks = item._sum.clicks || 0;
      const conversions = item._sum.returnsFiled || 0;
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

      return {
        location: item.location || 'Not specified',
        count: item._count.id,
        clicks,
        conversions,
        conversionRate: Number(conversionRate.toFixed(2)),
      };
    });

    // Calculate summary
    const totalMaterials = formattedByType.reduce((sum, item) => sum + item.count, 0);
    const totalClicks = formattedByType.reduce((sum, item) => sum + item.clicks, 0);
    const totalConversions = formattedByType.reduce((sum, item) => sum + item.conversions, 0);
    const averageConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    const bestPerformingType =
      formattedByType.sort((a, b) => b.conversionRate - a.conversionRate)[0]?.type || 'N/A';

    const bestPerformingCampaign =
      formattedByCampaign.sort((a, b) => b.conversionRate - a.conversionRate)[0]?.campaign || 'N/A';

    const response: SourceBreakdown = {
      byType: formattedByType.sort((a, b) => b.conversions - a.conversions),
      byCampaign: formattedByCampaign.sort((a, b) => b.conversions - a.conversions),
      byLocation: formattedByLocation.sort((a, b) => b.conversions - a.conversions),
      summary: {
        totalMaterials,
        totalClicks,
        totalConversions,
        averageConversionRate: Number(averageConversionRate.toFixed(2)),
        bestPerformingType,
        bestPerformingCampaign,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Source breakdown error:', error);
    return NextResponse.json({ error: 'Failed to fetch source breakdown' }, { status: 500 });
  }
}
