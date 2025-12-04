/**
 * Earnings Summary API
 *
 * GET /api/earnings/summary
 * Returns earnings summary for authenticated user
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getEarningsSummary } from '@/lib/services/commission.service';
import { logger } from '@/lib/logger';

export async function GET() {
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
        totalEarnings: 0,
        pendingEarnings: 0,
        approvedEarnings: 0,
        paidEarnings: 0,
        totalLeads: 0,
        convertedLeads: 0,
        averageCommission: 0,
        thisMonthEarnings: 0,
        lastMonthEarnings: 0,
      });
    }

    // Get earnings summary
    const summary = await getEarningsSummary(profile.shortLinkUsername);

    return NextResponse.json(summary);
  } catch (error) {
    logger.error('Error fetching earnings summary', { error });
    return NextResponse.json({ error: 'Failed to fetch earnings summary' }, { status: 500 });
  }
}
