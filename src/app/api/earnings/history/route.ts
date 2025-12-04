/**
 * Commission History API
 *
 * GET /api/earnings/history?limit=50
 * Returns commission history for authenticated user
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCommissionHistory } from '@/lib/services/commission.service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with username
    const profile = await prisma.profile.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        shortLinkUsername: true,
        role: true,
      },
    });

    if (!profile || !profile.shortLinkUsername) {
      return NextResponse.json({
        commissions: [],
        total: 0,
      });
    }

    // Get limit parameter
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get commission history
    const commissions = await getCommissionHistory(profile.shortLinkUsername, limit);

    return NextResponse.json({
      commissions,
      total: commissions.length,
    });
  } catch (error) {
    logger.error('Error fetching commission history', { error });
    return NextResponse.json({ error: 'Failed to fetch commission history' }, { status: 500 });
  }
}
