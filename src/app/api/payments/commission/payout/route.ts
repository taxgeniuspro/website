/**
 * Commission Payout API
 *
 * GET /api/payments/commission/payout
 * Returns pending commission balance and payout eligibility
 *
 * POST /api/payments/commission/payout
 * Creates a payout request for referrer commissions
 *
 * Epic 5 - Story 5.2: Commission Automation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/services/email.service';
import { logger } from '@/lib/logger';

const MINIMUM_PAYOUT_AMOUNT = Number(process.env.MINIMUM_PAYOUT_AMOUNT) || 50;

/**
 * GET: Return pending commission balance and payout eligibility
 */
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

    // Only referrers can request payouts
    if (profile.role !== 'REFERRER') {
      return NextResponse.json(
        { error: 'Only referrers can request commission payouts' },
        { status: 403 }
      );
    }

    // Get all pending commissions
    const pendingCommissions = await prisma.commission.findMany({
      where: {
        referrerId: profile.id,
        status: 'PENDING',
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate total pending balance
    const totalPending = pendingCommissions.reduce((sum, c) => sum + Number(c.amount), 0);

    // Get processing/paid commissions for history
    const paidCommissions = await prisma.commission.findMany({
      where: {
        referrerId: profile.id,
        status: { in: ['PROCESSING', 'PAID'] },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 10,
    });

    const totalPaid = await prisma.commission.aggregate({
      where: {
        referrerId: profile.id,
        status: 'PAID',
      },
      _sum: {
        amount: true,
      },
    });

    return NextResponse.json({
      pendingBalance: totalPending,
      pendingCommissions: pendingCommissions.map((c) => ({
        id: c.id,
        amount: Number(c.amount),
        clientName:
          `${c.referral.client.firstName || ''} ${c.referral.client.lastName || ''}`.trim() ||
          'Client',
        createdAt: c.createdAt.toISOString(),
      })),
      commissionCount: pendingCommissions.length,
      totalEarningsAllTime: Number(totalPaid._sum.amount || 0) + totalPending,
      totalPaidOut: Number(totalPaid._sum.amount || 0),
      minimumPayout: MINIMUM_PAYOUT_AMOUNT,
      canRequestPayout: totalPending >= MINIMUM_PAYOUT_AMOUNT,
      recentPayouts: paidCommissions.map((c) => ({
        id: c.id,
        amount: Number(c.amount),
        status: c.status,
        paidAt: c.paidAt?.toISOString(),
        paymentRef: c.paymentRef,
      })),
    });
  } catch (error) {
    logger.error('Error fetching commission balance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST: Create a payout request for pending commissions
 */
export async function POST(req: NextRequest) {
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

    // Only referrers can request payouts
    if (profile.role !== 'REFERRER') {
      return NextResponse.json(
        { error: 'Only referrers can request commission payouts' },
        { status: 403 }
      );
    }

    // Get all pending commissions
    const pendingCommissions = await prisma.commission.findMany({
      where: {
        referrerId: profile.id,
        status: 'PENDING',
      },
    });

    // Calculate total amount
    const totalAmount = pendingCommissions.reduce((sum, c) => sum + Number(c.amount), 0);

    // Validate minimum payout amount
    if (totalAmount < MINIMUM_PAYOUT_AMOUNT) {
      return NextResponse.json(
        {
          error: `Minimum payout amount is $${MINIMUM_PAYOUT_AMOUNT}. Your current balance is $${totalAmount.toFixed(2)}.`,
          currentBalance: totalAmount,
          minimumRequired: MINIMUM_PAYOUT_AMOUNT,
        },
        { status: 400 }
      );
    }

    // Parse request body for payment method (optional)
    const body = await req.json().catch(() => ({}));
    const { paymentMethod, notes } = body;

    // Create payout request
    // Note: In production, this would integrate with Square/Stripe for automatic payout
    // For now, we create a manual payout request that admin processes
    const payoutRequest = await prisma.payoutRequest.create({
      data: {
        referrerId: profile.id,
        amount: totalAmount,
        commissionIds: pendingCommissions.map((c) => c.id),
        status: 'PENDING',
        paymentMethod: paymentMethod || 'BANK_TRANSFER',
        notes: notes || null,
      },
    });

    // Update commissions to "PROCESSING" status
    await prisma.commission.updateMany({
      where: {
        id: { in: pendingCommissions.map((c) => c.id) },
      },
      data: {
        status: 'PROCESSING',
      },
    });

    // Send payout request notification to admin
    const referrerName = profile.firstName
      ? `${profile.firstName} ${profile.lastName || ''}`.trim()
      : 'Referrer';

    await EmailService.sendPayoutRequestEmail(
      process.env.ADMIN_EMAIL || 'admin@taxgeniuspro.tax',
      referrerName,
      profile.user.email,
      totalAmount,
      pendingCommissions.length,
      payoutRequest.id
    );

    // Send confirmation email to referrer
    await EmailService.sendPayoutConfirmationEmail(
      profile.user.email,
      referrerName,
      totalAmount,
      paymentMethod || 'bank transfer',
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    );

    return NextResponse.json({
      success: true,
      message: 'Payout request submitted successfully',
      payoutRequest: {
        id: payoutRequest.id,
        amount: Number(payoutRequest.amount),
        commissionsIncluded: pendingCommissions.length,
        status: payoutRequest.status,
        requestedAt: payoutRequest.createdAt.toISOString(),
        estimatedProcessingTime: '5-7 business days',
      },
    });
  } catch (error) {
    logger.error('Error creating payout request:', error);
    return NextResponse.json(
      {
        error: 'Failed to create payout request. Please try again later.',
      },
      { status: 500 }
    );
  }
}
