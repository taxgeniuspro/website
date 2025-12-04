import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/affiliate/leads
 * Fetches leads referred by the authenticated affiliate
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to check role and tracking code
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        role: true,
        trackingCode: true,
        customTrackingCode: true,
        shortLinkUsername: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const isAffiliate = profile.role === 'affiliate';
    const isAdmin = profile.role === 'admin' || profile.role === 'super_admin';

    if (!isAffiliate && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only affiliates can access this endpoint' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const searchTerm = searchParams.get('search');

    // Build where clause to find leads referred by this affiliate
    const where: any = {
      OR: [
        { referrerUsername: profile.trackingCode },
        { referrerUsername: profile.customTrackingCode },
        { referrerUsername: profile.shortLinkUsername },
      ].filter((condition) => Object.values(condition)[0]), // Remove null values
      referrerType: 'affiliate',
    };

    // Add search filter
    if (searchTerm) {
      where.AND = [
        {
          OR: [
            { first_name: { contains: searchTerm, mode: 'insensitive' } },
            { last_name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm } },
          ],
        },
      ];
    }

    // Fetch affiliate's leads - ONLY non-sensitive data (affiliates don't see private info)
    const leads = await prisma.taxIntakeLead.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        // NO: email, phone, SSN, DOB, address - affiliates don't see private info
        referrerUsername: true,
        attributionMethod: true,
        convertedToClient: true,
        created_at: true,
        updated_at: true,
      },
    });

    // Determine lead status
    const getLeadStatus = (lead: any): string => {
      if (lead.convertedToClient) return 'converted';
      if (lead.lastContactedAt) return 'contacted';
      return 'new';
    };

    const leadsWithStatus = leads.map((lead) => ({
      ...lead,
      status: getLeadStatus(lead),
      fullName: `${lead.first_name} ${lead.last_name}`,
    }));

    // Filter by status if provided
    const filteredLeads =
      statusFilter && statusFilter !== 'all'
        ? leadsWithStatus.filter((lead) => lead.status === statusFilter)
        : leadsWithStatus;

    // Calculate stats
    const stats = {
      total: leads.length,
      new: leadsWithStatus.filter((l) => l.status === 'new').length,
      contacted: leadsWithStatus.filter((l) => l.status === 'contacted').length,
      converted: leadsWithStatus.filter((l) => l.status === 'converted').length,
      conversionRate: leads.length > 0
        ? Math.round((leadsWithStatus.filter((l) => l.status === 'converted').length / leads.length) * 100)
        : 0,
    };

    logger.info(`📋 Fetched ${filteredLeads.length} leads for affiliate ${user.id}`);

    return NextResponse.json({
      success: true,
      leads: filteredLeads,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching affiliate leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
