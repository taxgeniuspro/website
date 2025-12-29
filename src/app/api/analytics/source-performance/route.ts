/**
 * Source Performance Analytics API
 *
 * GET /api/analytics/source-performance
 * Returns performance data by marketing link/source
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { subDays, startOfDay } from 'date-fns';

interface SourceData {
  id: string;
  name: string;
  type: 'direct' | 'qr_code' | 'social' | 'affiliate' | 'referral' | 'other';
  clicks: number;
  leads: number;
  conversions: number;
  conversionRate: number;
  percentOfTotal: number;
}

interface MarketingLinkRow {
  id: string;
  code: string;
  title: string | null;
  targetPage: string | null;
  clicks: number;
  uniqueClicks: number | null;
  conversions: number;
  createdAt: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30d';
    const preparerId = searchParams.get('preparerId');

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (dateRange) {
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '90d':
        startDate = subDays(now, 90);
        break;
      case 'all':
        startDate = new Date('2020-01-01');
        break;
      default:
        startDate = subDays(now, 30);
    }
    startDate = startOfDay(startDate);

    const role = user.role as string;
    let profileId: string | null = null;

    if (role === 'tax_preparer' || preparerId) {
      const { data: profileData } = await db
        .from('profiles')
        .select('id')
        .eq('userId', preparerId || user.id)
        .limit(1);
      profileId = firstOrNull(profileData)?.id || null;
    }

    // Get marketing links with their stats
    let linksQuery = db
      .from('marketing_links')
      .select('id, code, title, targetPage, clicks, uniqueClicks, conversions, createdAt')
      .gte('createdAt', startDate.toISOString())
      .order('clicks', { ascending: false })
      .limit(20);

    if (profileId) {
      linksQuery = linksQuery.eq('profileId', profileId);
    }

    const { data: linksData, error } = await linksQuery;

    if (error) {
      throw error;
    }

    const marketingLinks = (linksData || []) as MarketingLinkRow[];

    // Calculate totals
    const totalClicks = marketingLinks.reduce((sum, link) => sum + link.clicks, 0);
    const totalConversions = marketingLinks.reduce((sum, link) => sum + link.conversions, 0);

    // Map to source data format
    const sources: SourceData[] = marketingLinks.map((link) => {
      // Determine type based on targetPage or title
      let type: SourceData['type'] = 'other';
      const targetLower = (link.targetPage || '').toLowerCase();
      const titleLower = (link.title || '').toLowerCase();

      if (targetLower.includes('qr') || titleLower.includes('qr')) {
        type = 'qr_code';
      } else if (targetLower.includes('intake') || targetLower.includes('form')) {
        type = 'direct';
      } else if (targetLower.includes('social') || titleLower.includes('facebook') || titleLower.includes('instagram')) {
        type = 'social';
      } else if (titleLower.includes('affiliate') || titleLower.includes('partner')) {
        type = 'affiliate';
      } else if (titleLower.includes('referral') || titleLower.includes('refer')) {
        type = 'referral';
      }

      const conversionRate = link.clicks > 0 ? (link.conversions / link.clicks) * 100 : 0;
      const percentOfTotal = totalClicks > 0 ? (link.clicks / totalClicks) * 100 : 0;

      return {
        id: link.id,
        name: link.title || link.code,
        type,
        clicks: link.clicks,
        leads: link.uniqueClicks || 0,
        conversions: link.conversions,
        conversionRate,
        percentOfTotal,
      };
    });

    // Sort by conversion rate (best performers first)
    sources.sort((a, b) => b.conversions - a.conversions || b.conversionRate - a.conversionRate);

    return NextResponse.json({
      sources,
      totalClicks,
      totalConversions,
      dateRange,
    });
  } catch (error) {
    console.error('Source performance API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch source data' },
      { status: 500 }
    );
  }
}
