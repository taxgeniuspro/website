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
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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
    const preparerProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!preparerProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'all';

    // Find all leads assigned to this preparer that have referrers
    const leads = await prisma.taxIntakeLead.findMany({
      where: {
        assignedPreparerId: preparerProfile.id,
        referrerUsername: { not: null },
      },
      select: {
        id: true,
        referrerUsername: true,
      },
    });

    const leadIds = leads.map((l) => l.id);

    // Build commission query
    const whereClause: any = {
      sourceType: 'RETURN_FILED',
      sourceId: { in: leadIds },
    };

    if (statusFilter !== 'all') {
      whereClause.status = statusFilter;
    }

    // Get commissions for these leads
    const commissions = await prisma.commission.findMany({
      where: whereClause,
      include: {
        referrer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: {
              select: { email: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get lead details for client info
    const leadsMap = new Map<string, any>();
    const leadDetails = await prisma.taxIntakeLead.findMany({
      where: { id: { in: commissions.map((c) => c.sourceId).filter(Boolean) as string[] } },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
      },
    });
    leadDetails.forEach((l) => leadsMap.set(l.id, l));

    // Format commissions for response
    const formattedCommissions = commissions.map((c) => {
      const lead = c.sourceId ? leadsMap.get(c.sourceId) : null;
      return {
        id: c.id,
        referrerId: c.referrerId,
        referrerName: `${c.referrer?.firstName || ''} ${c.referrer?.lastName || ''}`.trim() || 'Unknown',
        referrerEmail: c.referrer?.user?.email || '',
        amount: Number(c.amount),
        status: c.status,
        sourceType: c.sourceType,
        sourceId: c.sourceId,
        clientName: c.clientName || (lead ? `${lead.first_name} ${lead.last_name}` : 'Unknown'),
        clientEmail: c.clientEmail || lead?.email || '',
        tier: c.rateSource?.includes('Tier') ? c.rateSource : 'Standard',
        rateSource: c.rateSource || 'DEFAULT',
        createdAt: c.createdAt.toISOString(),
        approvedAt: c.approvedAt?.toISOString(),
        paidAt: c.paidAt?.toISOString(),
        paymentMethod: (c as any).paymentMethod,
        paymentReference: (c as any).paymentReference,
      };
    });

    // Calculate stats
    const allCommissions = await prisma.commission.findMany({
      where: {
        sourceType: 'RETURN_FILED',
        sourceId: { in: leadIds },
      },
      select: {
        amount: true,
        status: true,
        paidAt: true,
      },
    });

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      totalOwed: allCommissions
        .filter((c) => c.status === 'PENDING' || c.status === 'APPROVED')
        .reduce((sum, c) => sum + Number(c.amount), 0),
      pendingCount: allCommissions.filter((c) => c.status === 'PENDING').length,
      pendingAmount: allCommissions
        .filter((c) => c.status === 'PENDING')
        .reduce((sum, c) => sum + Number(c.amount), 0),
      approvedCount: allCommissions.filter((c) => c.status === 'APPROVED').length,
      approvedAmount: allCommissions
        .filter((c) => c.status === 'APPROVED')
        .reduce((sum, c) => sum + Number(c.amount), 0),
      paidCount: allCommissions.filter((c) => c.status === 'PAID').length,
      paidAmount: allCommissions
        .filter((c) => c.status === 'PAID')
        .reduce((sum, c) => sum + Number(c.amount), 0),
      thisMonthPaid: allCommissions
        .filter((c) => c.status === 'PAID' && c.paidAt && c.paidAt >= thisMonthStart)
        .reduce((sum, c) => sum + Number(c.amount), 0),
    };

    logger.info(`📊 Fetched ${formattedCommissions.length} payout obligations for preparer ${preparerProfile.id}`);

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
