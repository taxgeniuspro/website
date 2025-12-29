/**
 * My Material Performance API
 *
 * GET /api/materials/my-performance
 * Returns user's materials with performance metrics and journey tracking data
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

interface MaterialPerformance {
  id: string;
  title: string;
  type: string;
  location: string | null;
  campaignName: string | null;
  metrics: {
    clicks: number;
    intakeStarts: number;
    intakeCompletes: number;
    returnsFiled: number;
    conversionRate: number;
  };
  lastActivity: Date | null;
  status: 'ACTIVE' | 'PAUSED';
  earnings?: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '15');
    const sortBy = url.searchParams.get('sortBy') || 'returnsFiled';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const dateRange = url.searchParams.get('dateRange') || 'all';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');

    // Calculate date filter based on range
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

    // Build orderBy clause
    let orderBy: any = {};
    switch (sortBy) {
      case 'clicks':
        orderBy = { clicks: sortOrder };
        break;
      case 'conversions':
      case 'returnsFiled':
        orderBy = { returnsFiled: sortOrder };
        break;
      case 'conversion_rate':
      case 'conversionRate':
        orderBy = { filedConversionRate: sortOrder };
        break;
      default:
        orderBy = { returnsFiled: sortOrder };
    }

    // Fetch materials with pagination
    const skip = (page - 1) * pageSize;
    const take = Math.min(pageSize, 50); // Cap at 50 per page
    const effectiveLimit = limit > 0 ? Math.min(limit, take) : take;

    // Build the query for materials
    let materialsQuery = db
      .from('marketing_links')
      .select('id, title, link_type, location, campaign, clicks, intake_starts, intake_completes, returns_filed, filed_conversion_rate, updated_at, is_active')
      .eq('creator_id', userId)
      .eq('is_active', true);

    // Apply date filter if set
    if (dateFilter.createdAt) {
      materialsQuery = materialsQuery
        .gte('created_at', (dateFilter.createdAt as any).gte.toISOString())
        .lte('created_at', (dateFilter.createdAt as any).lte.toISOString());
    }

    // Apply sorting
    const sortColumn = sortBy === 'clicks' ? 'clicks' :
                       (sortBy === 'conversion_rate' || sortBy === 'conversionRate') ? 'filed_conversion_rate' : 'returns_filed';
    materialsQuery = materialsQuery.order(sortColumn, { ascending: sortOrder === 'asc' });

    // Apply pagination
    materialsQuery = materialsQuery.range(skip, skip + effectiveLimit - 1);

    const { data: rawMaterials, error: materialsError } = await materialsQuery;

    if (materialsError) {
      logger.error('Error fetching materials:', materialsError);
      return NextResponse.json({ error: 'Failed to fetch material performance' }, { status: 500 });
    }

    // Get total count
    let countQuery = db
      .from('marketing_links')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', userId)
      .eq('is_active', true);

    if (dateFilter.createdAt) {
      countQuery = countQuery
        .gte('created_at', (dateFilter.createdAt as any).gte.toISOString())
        .lte('created_at', (dateFilter.createdAt as any).lte.toISOString());
    }

    const { count: total } = await countQuery;

    // Transform snake_case to camelCase
    const materials = (rawMaterials || []).map((m: any) => ({
      id: m.id,
      title: m.title,
      linkType: m.link_type,
      location: m.location,
      campaign: m.campaign,
      clicks: m.clicks || 0,
      intakeStarts: m.intake_starts || 0,
      intakeCompletes: m.intake_completes || 0,
      returnsFiled: m.returns_filed || 0,
      filedConversionRate: m.filed_conversion_rate || 0,
      updatedAt: m.updated_at,
      isActive: m.is_active,
    }));

    // Get earnings for each material (if referrer/affiliate)
    const materialIds = materials.map((m: any) => m.id);

    // Supabase doesn't have a direct groupBy, so we use RPC or manual aggregation
    // For now, we'll fetch commissions and aggregate in JS
    const { data: commissionData } = await db
      .from('commissions')
      .select('referral_id, amount')
      .eq('referrer_id', userId);

    // Aggregate commissions by referralId
    const commissionMap = new Map<string, number>();
    if (commissionData) {
      for (const c of commissionData) {
        const existing = commissionMap.get(c.referral_id) || 0;
        commissionMap.set(c.referral_id, existing + Number(c.amount || 0));
      }
    }

    // Format response
    const formattedMaterials: MaterialPerformance[] = materials.map((material: any) => {
      const conversionRate =
        material.filedConversionRate ||
        (material.clicks > 0 ? (material.returnsFiled / material.clicks) * 100 : 0);

      return {
        id: material.id,
        title: material.title || `Material ${material.id.slice(0, 8)}`,
        type: material.linkType,
        location: material.location,
        campaignName: material.campaign,
        metrics: {
          clicks: material.clicks,
          intakeStarts: material.intakeStarts || 0,
          intakeCompletes: material.intakeCompletes || 0,
          returnsFiled: material.returnsFiled || 0,
          conversionRate: Number(conversionRate.toFixed(2)),
        },
        lastActivity: material.updatedAt,
        status: material.isActive ? 'ACTIVE' : 'PAUSED',
        earnings: commissionMap.get(material.id),
      };
    });

    return NextResponse.json({
      materials: formattedMaterials,
      pagination: {
        total: total || 0,
        page,
        pageSize: take,
        totalPages: Math.ceil((total || 0) / take),
      },
    });
  } catch (error) {
    logger.error('My materials performance error:', error);
    return NextResponse.json({ error: 'Failed to fetch material performance' }, { status: 500 });
  }
}
