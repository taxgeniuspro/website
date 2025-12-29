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
import { db, firstOrNull } from '@/lib/db';
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
  phone: string | null;
  userId: string;
}

interface User {
  id: string;
  email: string;
}

interface Commission {
  id: string;
  amount: number;
  referralId: string;
  createdAt: string;
}

interface Referral {
  id: string;
  clientId: string;
}

interface Client {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
        { error: 'Only administrators can access payout management' },
        { status: 403 }
      );
    }

    const { id } = await params;

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
      .select('id, firstName, lastName, phone, userId')
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

    // Fetch commission details
    const { data: commissions } = await db.from('commissions')
      .select('*')
      .in('id', payout.commissionIds);

    // Fetch referrals for commissions
    const referralIds = [...new Set((commissions || []).map((c: Commission) => c.referralId))];
    const { data: referrals } = await db.from('referrals')
      .select('id, clientId')
      .in('id', referralIds);

    // Fetch clients for referrals
    const clientIds = [...new Set((referrals || []).map((r: Referral) => r.clientId))];
    const { data: clients } = await db.from('profiles')
      .select('id, firstName, lastName')
      .in('id', clientIds);

    // Create lookup maps
    const referralsById = new Map<string, Referral>();
    (referrals || []).forEach((r: Referral) => {
      referralsById.set(r.id, r);
    });

    const clientsById = new Map<string, Client>();
    (clients || []).forEach((c: Client) => {
      clientsById.set(c.id, c);
    });

    // Format response
    const response = {
      id: payout.id,
      referrer: {
        id: referrer?.id || '',
        firstName: referrer?.firstName || 'N/A',
        lastName: referrer?.lastName || '',
        email: referrerEmail,
        phone: referrer?.phone,
      },
      amount: Number(payout.amount),
      commissionIds: payout.commissionIds,
      commissions: (commissions || []).map((c: Commission) => {
        const referral = referralsById.get(c.referralId);
        const client = referral ? clientsById.get(referral.clientId) : null;
        return {
          id: c.id,
          amount: Number(c.amount),
          clientName:
            `${client?.firstName || ''} ${client?.lastName || ''}`.trim() || 'Client',
          createdAt: c.createdAt,
        };
      }),
      status: payout.status,
      paymentMethod: payout.paymentMethod,
      notes: payout.notes,
      requestedAt: payout.requestedAt,
      processedAt: payout.processedAt || null,
      paymentRef: payout.paymentRef,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching payout details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
