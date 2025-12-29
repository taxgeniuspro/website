/**
 * Tax Preparer Payout Obligations API
 *
 * GET /api/tax-preparer/payout-obligations
 * Returns commissions the tax preparer owes to their referrers
 *
 * Query params:
 *  - status: Filter by status (PENDING, APPROVED, PAID, all)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions
interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

interface User {
  id: string;
  email: string;
}

interface TaxIntakeLead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  referrerUsername: string | null;
}

interface Commission {
  id: string;
  referrerId: string;
  amount: number;
  status: string;
  sourceType: string;
  sourceId: string | null;
  clientName: string | null;
  clientEmail: string | null;
  rateSource: string | null;
  createdAt: string;
  approvedAt: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  paymentRef: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user?.role as string;
    if (role !== 'tax_preparer' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only tax preparers can access payout obligations' },
        { status: 403 }
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

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'all';

    // Find all leads assigned to this preparer that have referrers
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select('id, referrerUsername')
      .eq('assignedPreparerId', preparerProfile.id)
      .not('referrerUsername', 'is', null);

    const leadIds = (leads || []).map((l: TaxIntakeLead) => l.id);

    if (leadIds.length === 0) {
      return NextResponse.json({
        success: true,
        commissions: [],
        stats: {
          totalOwed: 0,
          pendingCount: 0,
          pendingAmount: 0,
          approvedCount: 0,
          approvedAmount: 0,
          paidCount: 0,
          paidAmount: 0,
          thisMonthPaid: 0,
        },
      });
    }

    // Build commission query
    let query = db
      .from('commissions')
      .select('*')
      .eq('sourceType', 'RETURN_FILED')
      .in('sourceId', leadIds);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    query = query.order('createdAt', { ascending: false });

    const { data: commissions, error: commissionsError } = await query;

    if (commissionsError) {
      throw new Error(commissionsError.message);
    }

    // Get referrer info
    const referrerIds = [...new Set((commissions || []).map((c: Commission) => c.referrerId))];
    let referrerMap = new Map<string, Profile>();
    let referrerEmailMap = new Map<string, string>();

    if (referrerIds.length > 0) {
      const { data: referrerProfiles } = await db
        .from('profiles')
        .select('id, firstName, lastName, userId')
        .in('id', referrerIds);

      for (const p of referrerProfiles || []) {
        referrerMap.set(p.id, p);
      }

      // Get emails for referrers
      const userIds = (referrerProfiles || []).map((p: Profile & { userId: string }) => p.userId).filter(Boolean);
      if (userIds.length > 0) {
        const { data: users } = await db
          .from('users')
          .select('id, email')
          .in('id', userIds);

        for (const u of users || []) {
          referrerEmailMap.set(u.id, u.email);
        }
      }
    }

    // Get lead details for client info
    const leadSourceIds = (commissions || [])
      .map((c: Commission) => c.sourceId)
      .filter(Boolean) as string[];

    let leadsMap = new Map<string, TaxIntakeLead>();
    if (leadSourceIds.length > 0) {
      const { data: leadDetails } = await db
        .from('tax_intake_leads')
        .select('id, first_name, last_name, email')
        .in('id', leadSourceIds);

      for (const l of leadDetails || []) {
        leadsMap.set(l.id, l);
      }
    }

    // Format commissions for response
    const formattedCommissions = (commissions || []).map((c: Commission) => {
      const lead = c.sourceId ? leadsMap.get(c.sourceId) : null;
      const referrer = referrerMap.get(c.referrerId);
      const referrerUserId = (referrer as Profile & { userId?: string })?.userId;

      return {
        id: c.id,
        referrerId: c.referrerId,
        referrerName: referrer ? `${referrer.firstName || ''} ${referrer.lastName || ''}`.trim() : 'Unknown',
        referrerEmail: referrerUserId ? referrerEmailMap.get(referrerUserId) || '' : '',
        amount: Number(c.amount),
        status: c.status,
        sourceType: c.sourceType,
        sourceId: c.sourceId,
        clientName: c.clientName || (lead ? `${lead.first_name} ${lead.last_name}` : 'Unknown'),
        clientEmail: c.clientEmail || lead?.email || '',
        tier: c.rateSource?.includes('Tier') ? c.rateSource : 'Standard',
        rateSource: c.rateSource || 'DEFAULT',
        createdAt: c.createdAt,
        approvedAt: c.approvedAt,
        paidAt: c.paidAt,
        paymentMethod: c.paymentMethod,
        paymentReference: c.paymentRef,
      };
    });

    // Calculate stats from all commissions for this preparer
    const { data: allCommissions } = await db
      .from('commissions')
      .select('amount, status, paidAt')
      .eq('sourceType', 'RETURN_FILED')
      .in('sourceId', leadIds);

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      totalOwed: (allCommissions || [])
        .filter((c: Commission) => c.status === 'PENDING' || c.status === 'APPROVED')
        .reduce((sum: number, c: Commission) => sum + Number(c.amount), 0),
      pendingCount: (allCommissions || []).filter((c: Commission) => c.status === 'PENDING').length,
      pendingAmount: (allCommissions || [])
        .filter((c: Commission) => c.status === 'PENDING')
        .reduce((sum: number, c: Commission) => sum + Number(c.amount), 0),
      approvedCount: (allCommissions || []).filter((c: Commission) => c.status === 'APPROVED').length,
      approvedAmount: (allCommissions || [])
        .filter((c: Commission) => c.status === 'APPROVED')
        .reduce((sum: number, c: Commission) => sum + Number(c.amount), 0),
      paidCount: (allCommissions || []).filter((c: Commission) => c.status === 'PAID').length,
      paidAmount: (allCommissions || [])
        .filter((c: Commission) => c.status === 'PAID')
        .reduce((sum: number, c: Commission) => sum + Number(c.amount), 0),
      thisMonthPaid: (allCommissions || [])
        .filter((c: Commission) => c.status === 'PAID' && c.paidAt && new Date(c.paidAt) >= thisMonthStart)
        .reduce((sum: number, c: Commission) => sum + Number(c.amount), 0),
    };

    logger.info(`Fetched ${formattedCommissions.length} payout obligations for preparer ${preparerProfile.id}`);

    return NextResponse.json({
      success: true,
      commissions: formattedCommissions,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching payout obligations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payout obligations' },
      { status: 500 }
    );
  }
}
