/**
 * Mark Commission as Paid API
 *
 * POST /api/tax-preparer/payout-obligations/[id]/mark-paid
 * Marks a commission as paid by the tax preparer
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { PaymentStatus } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user?.role as string;
    if (role !== 'tax_preparer' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only tax preparers can mark commissions as paid' },
        { status: 403 }
      );
    }

    const { id: commissionId } = await params;
    const body = await req.json();
    const { paymentMethod, paymentReference, notes } = body;

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method is required' },
        { status: 400 }
      );
    }

    // Get preparer's profile
    const preparerProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!preparerProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the commission
    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
      include: {
        referrer: {
          select: {
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
          },
        },
      },
    });

    if (!commission) {
      return NextResponse.json({ error: 'Commission not found' }, { status: 404 });
    }

    // Verify this commission belongs to a lead assigned to this preparer
    if (commission.sourceId) {
      const lead = await prisma.taxIntakeLead.findUnique({
        where: { id: commission.sourceId },
        select: { assignedPreparerId: true },
      });

      if (lead?.assignedPreparerId !== preparerProfile.id && role !== 'admin') {
        return NextResponse.json(
          { error: 'This commission does not belong to your leads' },
          { status: 403 }
        );
      }
    }

    // Only APPROVED commissions can be marked as paid
    if (commission.status !== PaymentStatus.APPROVED) {
      return NextResponse.json(
        { error: `Cannot mark ${commission.status} commission as paid. Only APPROVED commissions can be marked as paid.` },
        { status: 400 }
      );
    }

    // Update commission to PAID
    const updatedCommission = await prisma.commission.update({
      where: { id: commissionId },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        paymentMethod,
        paymentRef: paymentReference || null,
        approvalNotes: notes
          ? `${commission.approvalNotes || ''}\n[PAID] ${notes}`.trim()
          : commission.approvalNotes,
      },
    });

    logger.info('Commission marked as paid', {
      commissionId,
      referrerId: commission.referrerId,
      amount: commission.amount,
      paymentMethod,
      paidBy: user.id,
    });

    return NextResponse.json({
      success: true,
      commission: {
        id: updatedCommission.id,
        status: updatedCommission.status,
        amount: Number(updatedCommission.amount),
        paidAt: updatedCommission.paidAt?.toISOString(),
        referrerName: `${commission.referrer?.firstName || ''} ${commission.referrer?.lastName || ''}`.trim(),
      },
    });
  } catch (error) {
    logger.error('Error marking commission as paid:', error);
    return NextResponse.json(
      { error: 'Failed to mark commission as paid' },
      { status: 500 }
    );
  }
}
