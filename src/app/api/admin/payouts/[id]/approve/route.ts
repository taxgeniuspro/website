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
import { db, firstOrNull } from '@/lib/db';
import { EmailService } from '@/lib/services/email.service';
import { logger } from '@/lib/logger';

// Local interfaces
interface PayoutRequest {
  id: string;
  referrerId: string;
  amount: number;
  commissionIds: string[];
  status: string;
  paymentMethod: string | null;
  notes: string | null;
  requestedAt: string;
  processedAt: string | null;
  paymentRef: string | null;
}

interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  userId: string;
}

interface User {
  id: string;
  email: string;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin via session role
    const userRole = user.role as string;
    if (userRole !== 'admin') {
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
    const { data: payoutData, error: payoutError } = await db.from('payout_requests')
      .select('*')
      .eq('id', id)
      .limit(1);

    if (payoutError) {
      throw payoutError;
    }

    const payout = firstOrNull<PayoutRequest>(payoutData);

    if (!payout) {
      return NextResponse.json({ error: 'Payout request not found' }, { status: 404 });
    }

    // Fetch referrer profile
    const { data: profileData } = await db.from('profiles')
      .select('id, firstName, lastName, userId')
      .eq('id', payout.referrerId)
      .limit(1);

    const referrer = firstOrNull<Profile>(profileData);

    // Fetch referrer user for email
    let referrerEmail = '';
    if (referrer) {
      const { data: userData } = await db.from('users')
        .select('id, email')
        .eq('id', referrer.userId)
        .limit(1);

      const referrerUser = firstOrNull<User>(userData);
      referrerEmail = referrerUser?.email || '';
    }

    // Validate payout is pending
    if (payout.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot approve payout with status: ${payout.status}` },
        { status: 400 }
      );
    }

    // Update payout request status to PAID
    const { data: updatedPayoutData, error: updateError } = await db.from('payout_requests')
      .update({
        status: 'PAID',
        processedAt: new Date().toISOString(),
        paymentRef: paymentRef.trim(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Update all related commissions to PAID status
    await db.from('commissions')
      .update({
        status: 'PAID',
        paidAt: new Date().toISOString(),
        paymentRef: paymentRef.trim(),
      })
      .in('id', payout.commissionIds);

    // Send payout completed email to referrer
    const referrerName = referrer?.firstName
      ? `${referrer.firstName} ${referrer.lastName || ''}`.trim()
      : 'Referrer';

    await EmailService.sendPayoutCompletedEmail(
      referrerEmail,
      referrerName,
      Number(payout.amount),
      paymentRef.trim(),
      payout.paymentMethod
    );

    logger.info(`Payout ${id} approved by admin`);
    logger.info(`$${payout.amount} paid to referrer ${payout.referrerId}`);

    return NextResponse.json({
      success: true,
      message: 'Payout approved and processed successfully',
      payout: {
        id: updatedPayoutData.id,
        status: updatedPayoutData.status,
        processedAt: updatedPayoutData.processedAt,
        paymentRef: updatedPayoutData.paymentRef,
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
