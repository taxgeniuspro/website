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
import { prisma } from '@/lib/prisma';
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

    const [materials, total] = await prisma.$transaction([
      prisma.marketingLink.findMany({
        where: {
          creatorId: userId,
          isActive: true,
          ...dateFilter,
        },
        orderBy,
        skip,
        take: limit > 0 ? Math.min(limit, take) : take,
        select: {
          id: true,
          title: true,
          linkType: true,
          location: true,
          campaign: true,
          clicks: true,
          intakeStarts: true,
          intakeCompletes: true,
          returnsFiled: true,
          filedConversionRate: true,
          updatedAt: true,
          isActive: true,
        },
      }),
      prisma.marketingLink.count({
        where: {
          creatorId: userId,
          isActive: true,
          ...dateFilter,
        },
      }),
    ]);

    // Get earnings for each material (if referrer/affiliate)
    const materialIds = materials.map((m) => m.id);
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

    // Format response
    const formattedMaterials: MaterialPerformance[] = materials.map((material) => {
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
        total,
        page,
        pageSize: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    logger.error('My materials performance error:', error);
    return NextResponse.json({ error: 'Failed to fetch material performance' }, { status: 500 });
  }
}
