/**
 * Mark Commission as Paid API
 *
 * POST /api/tax-preparer/payout-obligations/[id]/mark-paid
 * Marks a commission as paid by the tax preparer
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Define PaymentStatus locally (matches database enum)
type PaymentStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED' | 'FAILED';

// Local type definitions
interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

interface Commission {
  id: string;
  referrerId: string;
  amount: number;
  status: string;
  sourceId: string | null;
  approvalNotes: string | null;
}

interface TaxIntakeLead {
  id: string;
  assignedPreparerId: string | null;
}

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
    const { data: profiles } = await db
      .from('profiles')
      .select('id')
      .eq('userId', user.id)
      .limit(1);

    const preparerProfile = firstOrNull(profiles) as Profile | null;

    if (!preparerProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the commission with referrer info
    const { data: commissions } = await db
      .from('commissions')
      .select('*')
      .eq('id', commissionId)
      .limit(1);

    const commission = firstOrNull(commissions) as Commission | null;

    if (!commission) {
      return NextResponse.json({ error: 'Commission not found' }, { status: 404 });
    }

    // Get referrer info
    const { data: referrerProfiles } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .eq('id', commission.referrerId)
      .limit(1);

    const referrer = firstOrNull(referrerProfiles) as Profile | null;

    // Verify this commission belongs to a lead assigned to this preparer
    if (commission.sourceId) {
      const { data: leads } = await db
        .from('tax_intake_leads')
        .select('id, assignedPreparerId')
        .eq('id', commission.sourceId)
        .limit(1);

      const lead = firstOrNull(leads) as TaxIntakeLead | null;

      if (lead?.assignedPreparerId !== preparerProfile.id && role !== 'admin') {
        return NextResponse.json(
          { error: 'This commission does not belong to your leads' },
          { status: 403 }
        );
      }
    }

    // Only APPROVED commissions can be marked as paid
    if (commission.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `Cannot mark ${commission.status} commission as paid. Only APPROVED commissions can be marked as paid.` },
        { status: 400 }
      );
    }

    // Update commission to PAID
    const newApprovalNotes = notes
      ? `${commission.approvalNotes || ''}\n[PAID] ${notes}`.trim()
      : commission.approvalNotes;

    const { data: updatedCommission, error: updateError } = await db
      .from('commissions')
      .update({
        status: 'PAID' as PaymentStatus,
        paidAt: new Date().toISOString(),
        paymentMethod,
        paymentRef: paymentReference || null,
        approvalNotes: newApprovalNotes,
      })
      .eq('id', commissionId)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

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
        paidAt: updatedCommission.paidAt,
        referrerName: referrer ? `${referrer.firstName || ''} ${referrer.lastName || ''}`.trim() : 'Unknown',
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
