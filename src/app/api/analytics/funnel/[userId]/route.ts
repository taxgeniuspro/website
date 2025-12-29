/**
 * Conversion Funnel Analytics API
 *
 * GET /api/analytics/funnel/[userId]
 * Returns 4-stage conversion funnel with drop-off analysis
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

interface FunnelData {
  funnel: {
    stage1_clicks: number;
    stage2_intakeStarts: number;
    stage3_intakeCompletes: number;
    stage4_returnsFiled: number;
    dropoff: {
      clickToStart: number;
      startToComplete: number;
      completeToFiled: number;
    };
    conversionRates: {
      clickToStart: number;
      startToComplete: number;
      completeToFiled: number;
      overallConversion: number;
    };
  };
  dateRange: {
    start: string;
    end: string;
  };
}

interface MarketingLinkRow {
  clicks: number | null;
  intakeStarts: number | null;
  intakeCompletes: number | null;
  returnsFiled: number | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: authUserId } = await auth();

    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId: targetUserId } = await params;

    // Users can only access their own data (or admins can access any)
    if (authUserId !== targetUserId) {
      // TODO: Add admin check here
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const dateRange = url.searchParams.get('dateRange') || 'all';
    const materialId = url.searchParams.get('materialId');

    // Calculate date filter
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
      case 'all':
        start.setFullYear(2020, 0, 1); // Default to Jan 2020
        break;
    }

    // Build query for marketing links
    let query = db
      .from('marketing_links')
      .select('clicks, intakeStarts, intakeCompletes, returnsFiled')
      .eq('creatorId', targetUserId)
      .eq('isActive', true);

    if (dateRange !== 'all') {
      query = query.gte('createdAt', start.toISOString()).lte('createdAt', now.toISOString());
    }

    if (materialId) {
      query = query.eq('id', materialId);
    }

    const { data: linksData, error } = await query;

    if (error) {
      throw error;
    }

    // Aggregate the sums manually
    const links = (linksData || []) as MarketingLinkRow[];
    const funnelData = {
      _sum: {
        clicks: links.reduce((sum, l) => sum + (l.clicks || 0), 0),
        intakeStarts: links.reduce((sum, l) => sum + (l.intakeStarts || 0), 0),
        intakeCompletes: links.reduce((sum, l) => sum + (l.intakeCompletes || 0), 0),
        returnsFiled: links.reduce((sum, l) => sum + (l.returnsFiled || 0), 0),
      },
    };

    const stage1_clicks = funnelData._sum.clicks || 0;
    const stage2_intakeStarts = funnelData._sum.intakeStarts || 0;
    const stage3_intakeCompletes = funnelData._sum.intakeCompletes || 0;
    const stage4_returnsFiled = funnelData._sum.returnsFiled || 0;

    // Calculate drop-off rates
    const dropoff_clickToStart =
      stage1_clicks > 0 ? ((stage1_clicks - stage2_intakeStarts) / stage1_clicks) * 100 : 0;

    const dropoff_startToComplete =
      stage2_intakeStarts > 0
        ? ((stage2_intakeStarts - stage3_intakeCompletes) / stage2_intakeStarts) * 100
        : 0;

    const dropoff_completeToFiled =
      stage3_intakeCompletes > 0
        ? ((stage3_intakeCompletes - stage4_returnsFiled) / stage3_intakeCompletes) * 100
        : 0;

    // Calculate conversion rates
    const clickToStart = stage1_clicks > 0 ? (stage2_intakeStarts / stage1_clicks) * 100 : 0;
    const startToComplete =
      stage2_intakeStarts > 0 ? (stage3_intakeCompletes / stage2_intakeStarts) * 100 : 0;
    const completeToFiled =
      stage3_intakeCompletes > 0 ? (stage4_returnsFiled / stage3_intakeCompletes) * 100 : 0;
    const overallConversion = stage1_clicks > 0 ? (stage4_returnsFiled / stage1_clicks) * 100 : 0;

    const response: FunnelData = {
      funnel: {
        stage1_clicks,
        stage2_intakeStarts,
        stage3_intakeCompletes,
        stage4_returnsFiled,
        dropoff: {
          clickToStart: Number(dropoff_clickToStart.toFixed(2)),
          startToComplete: Number(dropoff_startToComplete.toFixed(2)),
          completeToFiled: Number(dropoff_completeToFiled.toFixed(2)),
        },
        conversionRates: {
          clickToStart: Number(clickToStart.toFixed(2)),
          startToComplete: Number(startToComplete.toFixed(2)),
          completeToFiled: Number(completeToFiled.toFixed(2)),
          overallConversion: Number(overallConversion.toFixed(2)),
        },
      },
      dateRange: {
        start: start.toISOString(),
        end: now.toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Conversion funnel error:', error);
    return NextResponse.json({ error: 'Failed to fetch conversion funnel' }, { status: 500 });
  }
}
