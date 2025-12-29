/**
 * Attribution Analytics API
 *
 * GET /api/analytics/attribution?period=30d
 * Returns attribution statistics for authenticated user
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 5
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { getReferrerAttributionStats } from '@/lib/services/attribution.service';
import { logger } from '@/lib/logger';

interface Profile {
  id: string;
  shortLinkUsername: string | null;
  role: string;
}

interface Lead {
  id: string;
  status: string;
  commissionRate: number | null;
  source: string | null;
  createdAt: string;
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with username
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id, shortLinkUsername, role')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    const profile = firstOrNull(profileData) as Profile | null;

    if (!profile || !profile.shortLinkUsername) {
      return NextResponse.json({
        totalLeads: 0,
        byMethod: {
          cookie: 0,
          emailMatch: 0,
          phoneMatch: 0,
          direct: 0,
        },
        crossDeviceRate: 0,
        conversionRate: 0,
        totalCommissions: 0,
        averageCommissionRate: 0,
        topSources: [],
      });
    }

    // Get period parameter
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';

    // Calculate date range
    const dateRange = getDateRange(period);

    // Get attribution stats
    const attributionStats = await getReferrerAttributionStats(profile.shortLinkUsername);

    if (!attributionStats) {
      throw new Error('Failed to fetch attribution stats');
    }

    // Get leads with commission data for the period
    let leadsQuery = db
      .from('leads')
      .select('id, status, commissionRate, source, createdAt')
      .eq('referrerUsername', profile.shortLinkUsername);

    if (dateRange) {
      leadsQuery = leadsQuery.gte('createdAt', dateRange.toISOString());
    }

    const { data: leadsData, error: leadsError } = await leadsQuery;

    if (leadsError) {
      throw leadsError;
    }

    const leads = (leadsData || []) as Lead[];

    // Calculate conversion rate (converted leads / total leads)
    const convertedLeads = leads.filter((l) =>
      ['QUALIFIED', 'CONVERTED'].includes(l.status)
    ).length;
    const conversionRate = leads.length > 0 ? (convertedLeads / leads.length) * 100 : 0;

    // Calculate total commissions (only for converted leads)
    const totalCommissions = leads
      .filter((l) => l.status === 'CONVERTED')
      .reduce((sum, lead) => sum + (Number(lead.commissionRate) || 0), 0);

    // Calculate average commission rate
    const commissionsWithRate = leads.filter((l) => l.commissionRate);
    const averageCommissionRate =
      commissionsWithRate.length > 0
        ? commissionsWithRate.reduce((sum, l) => sum + Number(l.commissionRate), 0) /
          commissionsWithRate.length
        : 0;

    // Get top sources
    const sourceCounts: Record<string, number> = {};
    leads.forEach((lead) => {
      const source = lead.source || 'Direct';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    const topSources = Object.entries(sourceCounts)
      .map(([source, count]) => ({
        source,
        count,
        percentage: leads.length > 0 ? (count / leads.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      totalLeads: attributionStats.totalLeads,
      byMethod: attributionStats.byMethod,
      crossDeviceRate: attributionStats.crossDeviceRate,
      conversionRate,
      totalCommissions,
      averageCommissionRate,
      topSources,
    });
  } catch (error) {
    logger.error('Error fetching attribution analytics', { error });
    return NextResponse.json({ error: 'Failed to fetch attribution analytics' }, { status: 500 });
  }
}

/**
 * Get date range based on period
 */
function getDateRange(period: string): Date | null {
  const now = new Date();

  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'all':
      return null;
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}
