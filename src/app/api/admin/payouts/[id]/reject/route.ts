/**
 * Admin Reject Payout API
 *
 * POST /api/admin/payouts/[id]/reject
 * Rejects a payout request and returns commissions to PENDING status
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

    // Only admins can reject payouts
    if (profile.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can reject payouts' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { notes } = body;

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
        { error: `Cannot reject payout with status: ${payout.status}` },
        { status: 400 }
      );
    }

    // Update payout request status to REJECTED
    const updatedPayout = await prisma.payoutRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        processedAt: new Date(),
        notes: notes || 'Payout request rejected by administrator',
      },
    });

    // Return commissions back to PENDING status (so referrer can request again later)
    await prisma.commission.updateMany({
      where: {
        id: { in: payout.commissionIds },
      },
      data: {
        status: 'PENDING',
      },
    });

    // Send rejection email to referrer
    const referrerName = payout.referrer.firstName
      ? `${payout.referrer.firstName} ${payout.referrer.lastName || ''}`.trim()
      : 'Referrer';

    await EmailService.sendPayoutRejectedEmail(
      payout.referrer.user.email,
      referrerName,
      Number(payout.amount),
      notes || 'Your payout request has been rejected. Please contact support for more information.'
    );

    logger.info(`❌ Payout ${id} rejected by admin ${profile.id}`);
    logger.info(`💵 $${payout.amount} returned to PENDING for referrer ${payout.referrerId}`);

    return NextResponse.json({
      success: true,
      message: 'Payout request rejected',
      payout: {
        id: updatedPayout.id,
        status: updatedPayout.status,
        processedAt: updatedPayout.processedAt?.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error rejecting payout:', error);
    return NextResponse.json(
      { error: 'Failed to reject payout. Please try again.' },
      { status: 500 }
    );
  }
}
