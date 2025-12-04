/**
 * Admin Payouts API
 *
 * GET /api/admin/payouts?status=pending
 * Returns payout requests filtered by status
 *
 * Epic 5 - Story 5.2: Admin Payout Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find user profile
    const profile = await prisma.profile.findFirst({
      where: {
        user: {
          email: user.emailAddresses[0]?.emailAddress,
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only admins and super_admins can access payout management
    if (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can access payout management' },
        { status: 403 }
      );
    }

    // Get status filter from query params
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'pending';

    // Map tab names to database status values
    const statusMap: Record<string, string | string[]> = {
      pending: 'PENDING',
      approved: 'APPROVED',
      paid: 'PAID',
      rejected: 'REJECTED',
    };

    const status = statusMap[statusFilter.toLowerCase()] || 'PENDING';

    // Fetch payout requests with referrer details
    const payouts = await prisma.payoutRequest.findMany({
      where: {
        status: typeof status === 'string' ? status : { in: status },
      },
      include: {
        referrer: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    // Get stats for dashboard cards
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const pendingRequests = await prisma.payoutRequest.findMany({
      where: { status: 'PENDING' },
    });

    const approvedThisMonth = await prisma.payoutRequest.count({
      where: {
        status: { in: ['APPROVED', 'PAID'] },
        processedAt: { gte: startOfMonth },
      },
    });

    const approvedPayoutsThisMonth = await prisma.payoutRequest.findMany({
      where: {
        status: { in: ['APPROVED', 'PAID'] },
        processedAt: { gte: startOfMonth },
      },
    });

    const stats = {
      pendingCount: pendingRequests.length,
      pendingAmount: pendingRequests.reduce((sum, p) => sum + Number(p.amount), 0),
      approvedThisMonth,
      approvedAmountThisMonth: approvedPayoutsThisMonth.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      ),
    };

    // Format response
    const formattedPayouts = payouts.map((payout) => ({
      id: payout.id,
      referrer: {
        firstName: payout.referrer.firstName || 'N/A',
        lastName: payout.referrer.lastName || '',
        email: payout.referrer.user.email,
      },
      amount: Number(payout.amount),
      commissionIds: payout.commissionIds,
      status: payout.status,
      paymentMethod: payout.paymentMethod,
      notes: payout.notes,
      requestedAt: payout.requestedAt.toISOString(),
      processedAt: payout.processedAt?.toISOString() || null,
      paymentRef: payout.paymentRef,
    }));

    return NextResponse.json({
      payouts: formattedPayouts,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching payouts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
