/**
 * Admin Approve Payout API
 *
 * POST /api/admin/payouts/[id]/approve
 * Approves a payout request and marks commissions as PAID
 *
 * Epic 5 - Story 5.2: Admin Payout Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/services/email.service';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Only admins can approve payouts
    if (profile.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can approve payouts' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { paymentRef } = body;

    if (!paymentRef || !paymentRef.trim()) {
      return NextResponse.json({ error: 'Payment reference is required' }, { status: 400 });
    }

    // Fetch payout request
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

    // Validate payout is pending
    if (payout.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot approve payout with status: ${payout.status}` },
        { status: 400 }
      );
    }

    // Update payout request status to PAID
    const updatedPayout = await prisma.payoutRequest.update({
      where: { id },
      data: {
        status: 'PAID',
        processedAt: new Date(),
        paymentRef: paymentRef.trim(),
      },
    });

    // Update all related commissions to PAID status
    await prisma.commission.updateMany({
      where: {
        id: { in: payout.commissionIds },
      },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentRef: paymentRef.trim(),
      },
    });

    // Send payout completed email to referrer
    const referrerName = payout.referrer.firstName
      ? `${payout.referrer.firstName} ${payout.referrer.lastName || ''}`.trim()
      : 'Referrer';

    await EmailService.sendPayoutCompletedEmail(
      payout.referrer.user.email,
      referrerName,
      Number(payout.amount),
      paymentRef.trim(),
      payout.paymentMethod
    );

    logger.info(`✅ Payout ${id} approved by admin ${profile.id}`);
    logger.info(`💰 $${payout.amount} paid to referrer ${payout.referrerId}`);

    return NextResponse.json({
      success: true,
      message: 'Payout approved and processed successfully',
      payout: {
        id: updatedPayout.id,
        status: updatedPayout.status,
        processedAt: updatedPayout.processedAt?.toISOString(),
        paymentRef: updatedPayout.paymentRef,
      },
    });
  } catch (error) {
    logger.error('Error approving payout:', error);
    return NextResponse.json(
      { error: 'Failed to approve payout. Please try again.' },
      { status: 500 }
    );
  }
}
