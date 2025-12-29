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
  userId: string;
}

interface User {
  id: string;
  email: string;
}

export async function GET(req: NextRequest) {
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

    // Get status filter from query params
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'pending';

    // Map tab names to database status values
    const statusMap: Record<string, string> = {
      pending: 'PENDING',
      approved: 'APPROVED',
      paid: 'PAID',
      rejected: 'REJECTED',
    };

    const status = statusMap[statusFilter.toLowerCase()] || 'PENDING';

    // Fetch payout requests
    const { data: payouts, error: payoutsError } = await db.from('payout_requests')
      .select('*')
      .eq('status', status)
      .order('requestedAt', { ascending: false });

    if (payoutsError) {
      throw payoutsError;
    }

    // Get referrer IDs and fetch profiles
    const referrerIds = [...new Set((payouts || []).map((p: PayoutRequest) => p.referrerId))];

    const { data: profiles } = await db.from('profiles')
      .select('id, firstName, lastName, userId')
      .in('id', referrerIds);

    // Get user IDs for emails
    const userIds = [...new Set((profiles || []).map((p: Profile) => p.userId))];

    const { data: users } = await db.from('users')
      .select('id, email')
      .in('id', userIds);

    // Create lookup maps
    const profilesById = new Map<string, Profile>();
    (profiles || []).forEach((p: Profile) => {
      profilesById.set(p.id, p);
    });

    const usersById = new Map<string, User>();
    (users || []).forEach((u: User) => {
      usersById.set(u.id, u);
    });

    // Get stats for dashboard cards
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: pendingRequests } = await db.from('payout_requests')
      .select('amount')
      .eq('status', 'PENDING');

    const { count: approvedThisMonth } = await db.from('payout_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['APPROVED', 'PAID'])
      .gte('processedAt', startOfMonth.toISOString());

    const { data: approvedPayoutsThisMonth } = await db.from('payout_requests')
      .select('amount')
      .in('status', ['APPROVED', 'PAID'])
      .gte('processedAt', startOfMonth.toISOString());

    const stats = {
      pendingCount: (pendingRequests || []).length,
      pendingAmount: (pendingRequests || []).reduce((sum, p: { amount: number }) => sum + Number(p.amount), 0),
      approvedThisMonth: approvedThisMonth || 0,
      approvedAmountThisMonth: (approvedPayoutsThisMonth || []).reduce(
        (sum, p: { amount: number }) => sum + Number(p.amount),
        0
      ),
    };

    // Format response
    const formattedPayouts = (payouts || []).map((payout: PayoutRequest) => {
      const referrer = profilesById.get(payout.referrerId);
      const referrerUser = referrer ? usersById.get(referrer.userId) : null;

      return {
        id: payout.id,
        referrer: {
          firstName: referrer?.firstName || 'N/A',
          lastName: referrer?.lastName || '',
          email: referrerUser?.email || '',
        },
        amount: Number(payout.amount),
        commissionIds: payout.commissionIds,
        status: payout.status,
        paymentMethod: payout.paymentMethod,
        notes: payout.notes,
        requestedAt: payout.requestedAt,
        processedAt: payout.processedAt,
        paymentRef: payout.paymentRef,
      };
    });

    return NextResponse.json({
      payouts: formattedPayouts,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching payouts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
