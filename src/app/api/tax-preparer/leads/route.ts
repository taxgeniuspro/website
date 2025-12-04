import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/tax-preparer/leads
 * Fetches TaxIntakeLead records for the authenticated tax preparer
 * These are prospects from the intake forms, not Clerk users yet
 *
 * Query params:
 *  - preparerId: Filter by assigned preparer (optional, defaults to current user)
 *  - status: Filter by lead status (new, contacted, qualified, converted, all)
 *  - search: Search by name, email, or phone
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user?.role as string;
    const isAdmin = role === 'admin' || role === 'super_admin';
    const isTaxPreparer = role === 'tax_preparer';

    if (!isAdmin && !isTaxPreparer) {
      return NextResponse.json(
        { error: 'Forbidden: Only tax preparers and admins can access leads' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const preparerId = searchParams.get('preparerId');
    const statusFilter = searchParams.get('status');
    const searchTerm = searchParams.get('search');

    // Build where clause
    const where: any = {};

    // Tax preparers can only see their own assigned leads
    if (isTaxPreparer) {
      // Get preparer profile ID
      const preparerProfile = await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (!preparerProfile) {
        return NextResponse.json(
          { error: 'Tax preparer profile not found' },
          { status: 404 }
        );
      }

      where.assignedPreparerId = preparerProfile.id;
    } else if (preparerId) {
      // Admins can filter by specific preparer
      where.assignedPreparerId = preparerId;
    }

    // Filter by search term
    if (searchTerm) {
      where.OR = [
        { first_name: { contains: searchTerm, mode: 'insensitive' } },
        { last_name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm } },
      ];
    }

    // Fetch all leads (we'll filter by status in memory for derived statuses)
    const leads = await prisma.taxIntakeLead.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    // Determine lead status and filter
    const getLeadStatus = (lead: any): string => {
      if (lead.convertedToClient) return 'converted';
      if (lead.contactNotes && lead.lastContactedAt) return 'qualified';
      if (lead.lastContactedAt) return 'contacted';
      return 'new';
    };

    const leadsWithStatus = leads.map(lead => ({
      ...lead,
      status: getLeadStatus(lead),
    }));

    // Filter by status if provided
    const filteredLeads = statusFilter && statusFilter !== 'all'
      ? leadsWithStatus.filter(lead => lead.status === statusFilter)
      : leadsWithStatus;

    // Calculate stats
    const stats = {
      total: leads.length,
      new: leadsWithStatus.filter(l => l.status === 'new').length,
      contacted: leadsWithStatus.filter(l => l.status === 'contacted').length,
      qualified: leadsWithStatus.filter(l => l.status === 'qualified').length,
      converted: leadsWithStatus.filter(l => l.status === 'converted').length,
    };

    logger.info(`📋 Fetched ${filteredLeads.length} leads for ${isTaxPreparer ? 'preparer' : 'admin'} ${user.id}`);

    return NextResponse.json({
      success: true,
      leads: filteredLeads,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching tax preparer leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
