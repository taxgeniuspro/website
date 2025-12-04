/**
 * Admin Payout Detail API
 *
 * GET /api/admin/payouts/[id]
 * Returns detailed information about a specific payout request
 *
 * Epic 5 - Story 5.2: Admin Payout Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Only admins can access payout management
    if (profile.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can access payout management' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Fetch payout request with all related data
    const payout = await prisma.payoutRequest.findUnique({
      where: { id },
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
    });

    if (!payout) {
      return NextResponse.json({ error: 'Payout request not found' }, { status: 404 });
    }

    // Fetch commission details
    const commissions = await prisma.commission.findMany({
      where: {
        id: { in: payout.commissionIds },
      },
      include: {
        referral: {
          include: {
            client: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Format response
    const response = {
      id: payout.id,
      referrer: {
        id: payout.referrer.id,
        firstName: payout.referrer.firstName || 'N/A',
        lastName: payout.referrer.lastName || '',
        email: payout.referrer.user.email,
        phone: payout.referrer.phone,
      },
      amount: Number(payout.amount),
      commissionIds: payout.commissionIds,
      commissions: commissions.map((c) => ({
        id: c.id,
        amount: Number(c.amount),
        clientName:
          `${c.referral.client.firstName || ''} ${c.referral.client.lastName || ''}`.trim() ||
          'Client',
        createdAt: c.createdAt.toISOString(),
      })),
      status: payout.status,
      paymentMethod: payout.paymentMethod,
      notes: payout.notes,
      requestedAt: payout.requestedAt.toISOString(),
      processedAt: payout.processedAt?.toISOString() || null,
      paymentRef: payout.paymentRef,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching payout details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
