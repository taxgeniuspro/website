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
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with tracking code
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        id: true,
        customTrackingCode: true,
        trackingCode: true,
        shortLinkUsername: true,
      },
    });

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

    // Fetch leads referred by this user (matching referrerUsername to tracking code)
    const leads = await prisma.taxIntakeLead.findMany({
      where: {
        referrerUsername: trackingCode,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        convertedToClient: true,
        convertedAt: true,
        unqualified: true,
        unqualifiedReason: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    // Fetch commissions for this referrer
    const commissions = await prisma.commission.findMany({
      where: {
        referrerId: profile.id,
      },
      select: {
        id: true,
        sourceId: true, // This is the leadId
        amount: true,
        status: true,
      },
    });

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
        createdAt: lead.created_at.toISOString(),
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

    logger.info(`📊 Fetched ${referrals.length} referrals for client ${profile.id}`);

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
