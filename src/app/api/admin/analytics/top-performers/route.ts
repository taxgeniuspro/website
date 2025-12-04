/**
 * Admin Analytics Top Performers API
 *
 * GET /api/admin/analytics/top-performers
 * Returns Top 15 rankings for various categories
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// Clerk client removed - using NextAuth;
import { logger } from '@/lib/logger';
import {
  getTop15Preparers,
  getTop15Affiliates,
  getTop15Referrers,
  getTop15Materials,
  getTop15Locations,
  getTop15MaterialTypes,
  parseDateRange,
  type DateRange,
} from '@/lib/services/admin-analytics.service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or super admin
    const role = session?.user?.role;

    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const category = url.searchParams.get('category') || 'all';
    const dateRangeParam = url.searchParams.get('dateRange') || 'month';
    const limit = parseInt(url.searchParams.get('limit') || '15');

    // Parse date range
    const dateRange: DateRange = parseDateRange(dateRangeParam);

    // Fetch rankings based on category
    let rankings: any;

    switch (category) {
      case 'preparers':
        rankings = {
          preparers: await getTop15Preparers(dateRange),
        };
        break;

      case 'affiliates':
        rankings = {
          affiliates: await getTop15Affiliates(dateRange),
        };
        break;

      case 'referrers':
        rankings = {
          referrers: await getTop15Referrers(dateRange),
        };
        break;

      case 'materials':
        rankings = {
          materials: await getTop15Materials(dateRange),
        };
        break;

      case 'locations':
        rankings = {
          locations: await getTop15Locations(dateRange),
        };
        break;

      case 'types':
        rankings = {
          materialTypes: await getTop15MaterialTypes(dateRange),
        };
        break;

      case 'all':
      default:
        // Fetch all categories in parallel
        const [preparers, affiliates, referrers, materials, locations, materialTypes] =
          await Promise.all([
            getTop15Preparers(dateRange),
            getTop15Affiliates(dateRange),
            getTop15Referrers(dateRange),
            getTop15Materials(dateRange),
            getTop15Locations(dateRange),
            getTop15MaterialTypes(dateRange),
          ]);

        rankings = {
          preparers,
          affiliates,
          referrers,
          materials,
          locations,
          materialTypes,
        };
        break;
    }

    return NextResponse.json({
      category,
      rankings,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      },
      limit,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Admin analytics top performers error:', error);
    return NextResponse.json({ error: 'Failed to fetch top performers' }, { status: 500 });
  }
}
