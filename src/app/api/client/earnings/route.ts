/**
 * Client Earnings API
 *
 * GET /api/client/earnings
 * Returns commission history and earnings stats for a client/referrer
 *
 * Query params:
 *  - status: Filter by status (PENDING, APPROVED, PAID, all)
 *
 * Includes:
 * - Commission history with payment status
 * - Breakdown: Pending (30-day hold), Approved (ready for payout), Paid
 * - Link performance stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces for Supabase data
interface Profile {
  id: string;
  shortLinkUsername: string | null;
  role: string;
}

interface Commission {
  id: string;
  amount: number;
  status: string;
  clientName: string | null;
  clientEmail: string | null;
  rateSource: string | null;
  createdAt: string;
  approvedAt: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
}

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile - use OR conditions for Supabase Auth compatibility
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id, short_link_username, role')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (profileError) {
      logger.error('Error fetching profile:', profileError);
    }

    const profile = firstOrNull<Profile>(profileData);

    if (!profile) {
      return NextResponse.json({
        commissions: [],
        stats: {
          totalEarnings: 0,
          pendingEarnings: 0,
          approvedEarnings: 0,
          paidEarnings: 0,
          thisMonthEarnings: 0,
          totalReferrals: 0,
        },
      });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'all';

    // Build commission query - commissions where this user is the referrer
    let query = db
      .from('commissions')
      .select('id, amount, status, client_name, client_email, rate_source, created_at, approved_at, paid_at, payment_method')
      .eq('referrer_id', profile.id)
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: commissionsData, error: commissionsError } = await query;

    if (commissionsError) {
      logger.error('Error fetching commissions:', commissionsError);
      return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 });
    }

    // Format commissions for response
    const formattedCommissions = (commissionsData || []).map((c: Record<string, unknown>) => ({
      id: c.id,
      amount: Number(c.amount),
      status: c.status,
      clientName: c.client_name || 'Unknown',
      clientEmail: c.client_email || '',
      tier: (c.rate_source as string)?.includes('Tier') ? c.rate_source : 'Standard',
      createdAt: c.created_at,
      approvedAt: c.approved_at,
      paidAt: c.paid_at,
      paymentMethod: c.payment_method,
    }));

    // Calculate stats from ALL commissions (not filtered)
    const { data: allCommissionsData } = await db
      .from('commissions')
      .select('amount, status, paid_at, created_at')
      .eq('referrer_id', profile.id);

    const allCommissions = (allCommissionsData || []) as Array<{
      amount: number;
      status: string;
      paid_at: string | null;
      created_at: string;
    }>;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      totalEarnings: allCommissions.reduce((sum, c) => sum + Number(c.amount), 0),
      pendingEarnings: allCommissions
        .filter((c) => c.status === 'PENDING')
        .reduce((sum, c) => sum + Number(c.amount), 0),
      approvedEarnings: allCommissions
        .filter((c) => c.status === 'APPROVED')
        .reduce((sum, c) => sum + Number(c.amount), 0),
      paidEarnings: allCommissions
        .filter((c) => c.status === 'PAID')
        .reduce((sum, c) => sum + Number(c.amount), 0),
      thisMonthEarnings: allCommissions
        .filter((c) => new Date(c.created_at) >= thisMonthStart)
        .reduce((sum, c) => sum + Number(c.amount), 0),
      totalReferrals: allCommissions.length,
    };

    logger.info(`Fetched ${formattedCommissions.length} commissions for client ${profile.id}`);

    return NextResponse.json({
      success: true,
      commissions: formattedCommissions,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching client earnings', { error });
    return NextResponse.json({ error: 'Failed to fetch earnings data' }, { status: 500 });
  }
}
