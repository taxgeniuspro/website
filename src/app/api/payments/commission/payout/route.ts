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
import { db, firstOrNull } from '@/lib/db';
import { EmailService } from '@/lib/services/email.service';
import { logger } from '@/lib/logger';
import { hasAffiliateAccess } from '@/lib/permissions';

// TypeScript interfaces for database records
interface Profile {
  id: string;
  role: string;
  affiliateStatus: string | null;
  userId: string;
  firstName: string | null;
  lastName: string | null;
}

interface ProfileWithUser extends Profile {
  users?: {
    id: string;
    email: string;
  };
}

interface Commission {
  id: string;
  referrerId: string;
  amount: number | string;
  status: string;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  paymentRef: string | null;
  referrals?: {
    crm_contacts?: {
      firstName: string | null;
      lastName: string | null;
    };
  };
}

interface PayoutRequest {
  id: string;
  referrerId: string;
  amount: number | string;
  commissionIds: string[];
  status: string;
  paymentMethod: string;
  notes: string | null;
  createdAt: string;
}

const MINIMUM_PAYOUT_AMOUNT = Number(process.env.MINIMUM_PAYOUT_AMOUNT) || 50;

/**
 * GET: Return pending commission balance and payout eligibility
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find user profile using session user ID
    const { data: profileData } = await db
      .from('profiles')
      .select('id, role, affiliateStatus, userId, firstName, lastName')
      .eq('userId', user.id)
      .limit(1);

    const profile = firstOrNull(profileData) as Profile | null;

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user has affiliate access using centralized function
    if (!hasAffiliateAccess(profile.role as any, profile.affiliateStatus as any)) {
      return NextResponse.json(
        { error: 'Only users with affiliate access can request commission payouts' },
        { status: 403 }
      );
    }

    // Get all pending commissions with referral and client info
    const { data: pendingCommissionsData } = await db
      .from('commissions')
      .select(`
        id,
        referrerId,
        amount,
        status,
        createdAt,
        updatedAt,
        paidAt,
        paymentRef,
        referrals (
          crm_contacts (
            firstName,
            lastName
          )
        )
      `)
      .eq('referrerId', profile.id)
      .eq('status', 'PENDING')
      .order('createdAt', { ascending: false });

    const pendingCommissions = (pendingCommissionsData || []) as Commission[];

    // Calculate total pending balance
    const totalPending = pendingCommissions.reduce((sum, c) => sum + Number(c.amount), 0);

    // Get processing/paid commissions for history
    const { data: paidCommissionsData } = await db
      .from('commissions')
      .select('id, amount, status, updatedAt, paidAt, paymentRef')
      .eq('referrerId', profile.id)
      .in('status', ['PROCESSING', 'PAID'])
      .order('updatedAt', { ascending: false })
      .limit(10);

    const paidCommissions = (paidCommissionsData || []) as Commission[];

    // Get sum of all paid commissions
    const { data: totalPaidData } = await db
      .from('commissions')
      .select('amount')
      .eq('referrerId', profile.id)
      .eq('status', 'PAID');

    const totalPaidSum = (totalPaidData || []).reduce(
      (sum: number, c: { amount: number | string }) => sum + Number(c.amount),
      0
    );

    return NextResponse.json({
      pendingBalance: totalPending,
      pendingCommissions: pendingCommissions.map((c) => ({
        id: c.id,
        amount: Number(c.amount),
        clientName:
          `${c.referrals?.crm_contacts?.firstName || ''} ${c.referrals?.crm_contacts?.lastName || ''}`.trim() ||
          'Client',
        createdAt: c.createdAt,
      })),
      commissionCount: pendingCommissions.length,
      totalEarningsAllTime: totalPaidSum + totalPending,
      totalPaidOut: totalPaidSum,
      minimumPayout: MINIMUM_PAYOUT_AMOUNT,
      canRequestPayout: totalPending >= MINIMUM_PAYOUT_AMOUNT,
      recentPayouts: paidCommissions.map((c) => ({
        id: c.id,
        amount: Number(c.amount),
        status: c.status,
        paidAt: c.paidAt,
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
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find user profile using session user ID with user email
    const { data: profileData } = await db
      .from('profiles')
      .select(`
        id, role, affiliateStatus, userId, firstName, lastName,
        users!inner (id, email)
      `)
      .eq('userId', user.id)
      .limit(1);

    const profile = firstOrNull(profileData) as ProfileWithUser | null;

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user has affiliate access using centralized function
    if (!hasAffiliateAccess(profile.role as any, profile.affiliateStatus as any)) {
      return NextResponse.json(
        { error: 'Only users with affiliate access can request commission payouts' },
        { status: 403 }
      );
    }

    // Get all pending commissions
    const { data: pendingCommissionsData } = await db
      .from('commissions')
      .select('id, amount, status')
      .eq('referrerId', profile.id)
      .eq('status', 'PENDING');

    const pendingCommissions = (pendingCommissionsData || []) as Commission[];

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
    // Note: In production, this would integrate with Stripe for automatic payout
    // For now, we create a manual payout request that admin processes
    const { data: payoutRequest, error: payoutError } = await db
      .from('payout_requests')
      .insert({
        referrerId: profile.id,
        amount: totalAmount,
        commissionIds: pendingCommissions.map((c) => c.id),
        status: 'PENDING',
        paymentMethod: paymentMethod || 'BANK_TRANSFER',
        notes: notes || null,
      })
      .select()
      .single();

    if (payoutError) throw payoutError;

    // Update commissions to "PROCESSING" status
    const commissionIds = pendingCommissions.map((c) => c.id);
    const { error: updateError } = await db
      .from('commissions')
      .update({ status: 'PROCESSING' })
      .in('id', commissionIds);

    if (updateError) {
      logger.error('Failed to update commission status', { error: updateError });
    }

    // Send payout request notification to admin
    const referrerName = profile.firstName
      ? `${profile.firstName} ${profile.lastName || ''}`.trim()
      : 'Referrer';

    const userEmail = profile.users?.email || '';

    await EmailService.sendPayoutRequestEmail(
      process.env.ADMIN_EMAIL || 'admin@taxgeniuspro.tax',
      referrerName,
      userEmail,
      totalAmount,
      pendingCommissions.length,
      payoutRequest.id
    );

    // Send confirmation email to referrer
    await EmailService.sendPayoutConfirmationEmail(
      userEmail,
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
        requestedAt: payoutRequest.createdAt,
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
