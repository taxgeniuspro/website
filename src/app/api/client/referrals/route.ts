/**
 * Client Referrals API
 *
 * GET /api/client/referrals
 * Returns leads referred by the authenticated user with status tracking
 *
 * Shows for each referral:
 * - Was the referral accepted as a client? (convertedToClient)
 * - Did they file a return? (convertedAt - return filed/complete)
 * - Commission amount (if earned)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces for Supabase data
interface Profile {
  id: string;
  customTrackingCode: string | null;
  trackingCode: string | null;
  shortLinkUsername: string | null;
}

interface TaxIntakeLead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  convertedToClient: boolean;
  convertedAt: string | null;
  unqualified: boolean;
  unqualifiedReason: string | null;
  created_at: string;
}

interface Commission {
  id: string;
  sourceId: string | null;
  amount: number;
  status: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with tracking code - use OR conditions for Supabase Auth compatibility
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id, custom_tracking_code, tracking_code, short_link_username')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (profileError) {
      logger.error('Error fetching profile:', profileError);
    }

    const profile = firstOrNull<Profile>(profileData);

    if (!profile) {
      return NextResponse.json({
        referrals: [],
        stats: {
          total: 0,
          convertedToClient: 0,
          returnsFiled: 0,
          commissionsEarned: 0,
          totalEarned: 0,
        },
      });
    }

    // Get the user's tracking code (custom or original)
    const trackingCode = profile.customTrackingCode || profile.trackingCode || profile.shortLinkUsername;

    if (!trackingCode) {
      return NextResponse.json({
        referrals: [],
        stats: {
          total: 0,
          convertedToClient: 0,
          returnsFiled: 0,
          commissionsEarned: 0,
          totalEarned: 0,
        },
      });
    }

    // Fetch leads referred by this user (matching referrer_username to tracking code)
    const { data: leadsData, error: leadsError } = await db
      .from('tax_intake_leads')
      .select('id, first_name, last_name, email, converted_to_client, converted_at, unqualified, unqualified_reason, created_at')
      .eq('referrer_username', trackingCode)
      .order('created_at', { ascending: false });

    if (leadsError) {
      logger.error('Error fetching leads:', leadsError);
      return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 });
    }

    const leads = (leadsData || []).map((l: Record<string, unknown>) => ({
      id: l.id,
      first_name: l.first_name,
      last_name: l.last_name,
      email: l.email,
      convertedToClient: l.converted_to_client,
      convertedAt: l.converted_at,
      unqualified: l.unqualified,
      unqualifiedReason: l.unqualified_reason,
      created_at: l.created_at,
    })) as TaxIntakeLead[];

    // Fetch commissions for this referrer
    const { data: commissionsData, error: commissionsError } = await db
      .from('commissions')
      .select('id, source_id, amount, status')
      .eq('referrer_id', profile.id);

    if (commissionsError) {
      logger.error('Error fetching commissions:', commissionsError);
    }

    const commissions = (commissionsData || []).map((c: Record<string, unknown>) => ({
      id: c.id,
      sourceId: c.source_id,
      amount: Number(c.amount),
      status: c.status,
    })) as Commission[];

    // Create a map of leadId -> commission
    const commissionByLeadId = new Map(
      commissions.map((c) => [c.sourceId, c])
    );

    // Format referrals with status columns
    const referrals = leads.map((lead) => {
      const commission = commissionByLeadId.get(lead.id);

      // Determine status
      let status: 'pending' | 'client' | 'complete' | 'unqualified' = 'pending';
      if (lead.unqualified) {
        status = 'unqualified';
      } else if (lead.convertedAt) {
        status = 'complete';
      } else if (lead.convertedToClient) {
        status = 'client';
      }

      return {
        id: lead.id,
        name: `${lead.first_name} ${lead.last_name}`,
        email: lead.email,
        isClient: lead.convertedToClient,
        returnFiled: !!lead.convertedAt,
        isUnqualified: lead.unqualified,
        unqualifiedReason: lead.unqualifiedReason,
        status,
        commissionAmount: commission ? Number(commission.amount) : null,
        commissionStatus: commission?.status || null,
        createdAt: lead.created_at,
      };
    });

    // Calculate stats
    const stats = {
      total: leads.length,
      convertedToClient: leads.filter((l) => l.convertedToClient).length,
      returnsFiled: leads.filter((l) => l.convertedAt).length,
      unqualified: leads.filter((l) => l.unqualified).length,
      commissionsEarned: commissions.length,
      totalEarned: commissions.reduce((sum, c) => sum + Number(c.amount), 0),
      pendingAmount: commissions
        .filter((c) => c.status === 'PENDING' || c.status === 'APPROVED')
        .reduce((sum, c) => sum + Number(c.amount), 0),
      paidAmount: commissions
        .filter((c) => c.status === 'PAID')
        .reduce((sum, c) => sum + Number(c.amount), 0),
    };

    logger.info(`Fetched ${referrals.length} referrals for client ${profile.id}`);

    return NextResponse.json({
      success: true,
      referrals,
      stats,
      trackingCode,
    });
  } catch (error) {
    logger.error('Error fetching client referrals', { error });
    return NextResponse.json(
      { error: 'Failed to fetch referrals' },
      { status: 500 }
    );
  }
}
