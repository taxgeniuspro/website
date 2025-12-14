/**
 * Client Earnings API
 *
 * GET /api/client/earnings
 * Returns commission history and earnings stats for a client/referrer
 *
 * Query params:
 *  - status: Filter by status (PENDING, APPROVED, PAID, all)
 *
 * Includes:
 * - Commission history with payment status
 * - Breakdown: Pending (30-day hold), Approved (ready for payout), Paid
 * - Link performance stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: {
        id: true,
        shortLinkUsername: true,
        role: true,
      },
    });

    if (!profile) {
      return NextResponse.json({
        commissions: [],
        stats: {
          totalEarnings: 0,
          pendingEarnings: 0,
          approvedEarnings: 0,
          paidEarnings: 0,
          thisMonthEarnings: 0,
          totalReferrals: 0,
        },
      });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'all';

    // Build commission query - commissions where this user is the referrer
    const whereClause: any = {
      referrerId: profile.id,
    };

    if (statusFilter !== 'all') {
      whereClause.status = statusFilter;
    }

    // Get commissions for this referrer
    const commissions = await prisma.commission.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    // Format commissions for response
    const formattedCommissions = commissions.map((c) => ({
      id: c.id,
      amount: Number(c.amount),
      status: c.status,
      clientName: c.clientName || 'Unknown',
      clientEmail: c.clientEmail || '',
      tier: c.rateSource?.includes('Tier') ? c.rateSource : 'Standard',
      createdAt: c.createdAt.toISOString(),
      approvedAt: c.approvedAt?.toISOString(),
      paidAt: c.paidAt?.toISOString(),
      paymentMethod: c.paymentMethod,
    }));

    // Calculate stats from ALL commissions (not filtered)
    const allCommissions = await prisma.commission.findMany({
      where: { referrerId: profile.id },
      select: {
        amount: true,
        status: true,
        paidAt: true,
        createdAt: true,
      },
    });

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      totalEarnings: allCommissions.reduce((sum, c) => sum + Number(c.amount), 0),
      pendingEarnings: allCommissions
        .filter((c) => c.status === 'PENDING')
        .reduce((sum, c) => sum + Number(c.amount), 0),
      approvedEarnings: allCommissions
        .filter((c) => c.status === 'APPROVED')
        .reduce((sum, c) => sum + Number(c.amount), 0),
      paidEarnings: allCommissions
        .filter((c) => c.status === 'PAID')
        .reduce((sum, c) => sum + Number(c.amount), 0),
      thisMonthEarnings: allCommissions
        .filter((c) => c.createdAt >= thisMonthStart)
        .reduce((sum, c) => sum + Number(c.amount), 0),
      totalReferrals: allCommissions.length,
    };

    logger.info(`📊 Fetched ${formattedCommissions.length} commissions for client ${profile.id}`);

    return NextResponse.json({
      success: true,
      commissions: formattedCommissions,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching client earnings', { error });
    return NextResponse.json({ error: 'Failed to fetch earnings data' }, { status: 500 });
  }
}
