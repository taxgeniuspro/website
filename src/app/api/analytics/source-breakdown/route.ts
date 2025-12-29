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
import { db } from '@/lib/db';
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

interface MarketingLinkRow {
  linkType: string;
  campaign: string | null;
  location: string | null;
  clicks: number | null;
  returnsFiled: number | null;
}

interface CommissionRow {
  referralId: string;
  amount: number | null;
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
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    if (dateRange !== 'all') {
      endDate = new Date();
      startDate = new Date();

      switch (dateRange) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }
    }

    // Query marketing links
    let linksQuery = db
      .from('marketing_links')
      .select('linkType, campaign, location, clicks, returnsFiled')
      .eq('creatorId', userId)
      .eq('isActive', true);

    if (startDate && endDate) {
      linksQuery = linksQuery.gte('createdAt', startDate.toISOString()).lte('createdAt', endDate.toISOString());
    }

    const { data: linksData, error: linksError } = await linksQuery;

    if (linksError) {
      throw linksError;
    }

    const links = (linksData || []) as MarketingLinkRow[];

    // Group by type manually
    const typeMap = new Map<string, { count: number; clicks: number; conversions: number }>();
    for (const link of links) {
      const key = link.linkType || 'unknown';
      const existing = typeMap.get(key) || { count: 0, clicks: 0, conversions: 0 };
      existing.count += 1;
      existing.clicks += link.clicks || 0;
      existing.conversions += link.returnsFiled || 0;
      typeMap.set(key, existing);
    }

    // Group by campaign manually
    const campaignMap = new Map<string, { count: number; clicks: number; conversions: number }>();
    for (const link of links) {
      if (link.campaign) {
        const existing = campaignMap.get(link.campaign) || { count: 0, clicks: 0, conversions: 0 };
        existing.count += 1;
        existing.clicks += link.clicks || 0;
        existing.conversions += link.returnsFiled || 0;
        campaignMap.set(link.campaign, existing);
      }
    }

    // Group by location manually
    const locationMap = new Map<string, { count: number; clicks: number; conversions: number }>();
    for (const link of links) {
      if (link.location) {
        const existing = locationMap.get(link.location) || { count: 0, clicks: 0, conversions: 0 };
        existing.count += 1;
        existing.clicks += link.clicks || 0;
        existing.conversions += link.returnsFiled || 0;
        locationMap.set(link.location, existing);
      }
    }

    // Get earnings by material (for referrers/affiliates)
    const { data: commissionsData, error: commissionsError } = await db
      .from('commissions')
      .select('referralId, amount')
      .eq('referrerId', userId);

    if (commissionsError) {
      throw commissionsError;
    }

    // Group commissions by referralId
    const commissionMap = new Map<string, number>();
    for (const c of (commissionsData || []) as CommissionRow[]) {
      const existing = commissionMap.get(c.referralId) || 0;
      commissionMap.set(c.referralId, existing + Number(c.amount || 0));
    }

    // Format by type
    const formattedByType = Array.from(typeMap.entries()).map(([type, stats]) => {
      const conversionRate = stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0;

      return {
        type,
        count: stats.count,
        clicks: stats.clicks,
        conversions: stats.conversions,
        conversionRate: Number(conversionRate.toFixed(2)),
      };
    });

    // Format by campaign
    const formattedByCampaign = Array.from(campaignMap.entries()).map(([campaign, stats]) => {
      const conversionRate = stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0;

      return {
        campaign: campaign || 'Uncategorized',
        count: stats.count,
        clicks: stats.clicks,
        conversions: stats.conversions,
        conversionRate: Number(conversionRate.toFixed(2)),
      };
    });

    // Format by location
    const formattedByLocation = Array.from(locationMap.entries()).map(([location, stats]) => {
      const conversionRate = stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0;

      return {
        location: location || 'Not specified',
        count: stats.count,
        clicks: stats.clicks,
        conversions: stats.conversions,
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
