import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getCurrentFilingTaxYear } from '@/lib/utils/tax-year';

/**
 * GET /api/tax-preparer/leads
 * Fetches TaxIntakeLead records for the authenticated tax preparer
 * These are prospects from the intake forms, not Clerk users yet
 *
 * Query params:
 *  - preparerId: Filter by assigned preparer (optional, defaults to current user)
 *  - status: Filter by lead status (new, contacted, qualified, converted, all)
 *  - search: Search by name, email, or phone
 *  - taxYear: Filter by tax year (optional, defaults to current filing year, use 'all' for all years)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user?.role as string;
    const isAdmin = role === 'admin';
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
    const taxYearParam = searchParams.get('taxYear');

    // Build Supabase query
    let query = db
      .from('tax_intake_leads')
      .select(
        `
        *,
        profile:profiles!assignedPreparerId (
          id,
          firstName,
          lastName,
          role
        )
      `
      )
      .eq('completed', false)
      .order('created_at', { ascending: false });

    // Filter by tax year (default to current filing year, 'all' shows all years)
    if (taxYearParam !== 'all') {
      const taxYear = taxYearParam ? parseInt(taxYearParam) : getCurrentFilingTaxYear();
      query = query.eq('tax_year', taxYear);
    }

    // Tax preparers can only see their own assigned leads
    let currentPreparerProfileId: string | null = null;
    if (isTaxPreparer) {
      // Get preparer profile ID
      const { data: preparerProfile } = await db
        .from('profiles')
        .select('id')
        .eq('userId', user.id)
        .limit(1);

      const profile = firstOrNull(preparerProfile);
      if (!profile) {
        return NextResponse.json({ error: 'Tax preparer profile not found' }, { status: 404 });
      }

      currentPreparerProfileId = profile.id;
      query = query.eq('assignedPreparerId', profile.id);
    } else if (preparerId) {
      // Admins can filter by specific preparer
      query = query.eq('assignedPreparerId', preparerId);
    }

    // Filter by search term (case-insensitive)
    if (searchTerm) {
      query = query.or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
      );
    }

    // Fetch leads
    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      logger.error('Error fetching leads:', leadsError);
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    const leadsList = leads || [];

    // Fetch CRM contact IDs for each lead by email
    const leadEmails = leadsList.map((l) => l.email.toLowerCase());
    const { data: crmContacts } = await db
      .from('crm_contacts')
      .select('id, email, assignedPreparerId')
      .in('email', leadEmails.length > 0 ? leadEmails : ['none']);

    // Create email -> CRM contact ID map (only if preparer has access)
    const emailToCrmId = new Map<string, string | null>();
    for (const c of crmContacts || []) {
      // Only include CRM contact ID if:
      // - User is admin, OR
      // - CRM contact has no assigned preparer, OR
      // - CRM contact is assigned to current preparer
      const canAccess =
        isAdmin || !c.assignedPreparerId || c.assignedPreparerId === currentPreparerProfileId;

      emailToCrmId.set(c.email.toLowerCase(), canAccess ? c.id : null);
    }

    // Determine lead status and filter
    const getLeadStatus = (lead: Record<string, unknown>): string => {
      // Unqualified takes precedence - we can't help this lead
      if (lead.unqualified) return 'unqualified';
      // Complete = has convertedAt timestamp (return filed)
      if (lead.convertedToClient && lead.convertedAt) return 'complete';
      if (lead.convertedToClient) return 'converted';
      if (lead.contactNotes && lead.lastContactedAt) return 'qualified';
      if (lead.lastContactedAt) return 'contacted';
      return 'new';
    };

    const leadsWithStatus = leadsList.map((lead) => ({
      ...lead,
      status: getLeadStatus(lead),
      crmContactId: emailToCrmId.get(lead.email.toLowerCase()) || null,
    }));

    // Filter by status if provided
    const filteredLeads =
      statusFilter && statusFilter !== 'all'
        ? leadsWithStatus.filter((lead) => lead.status === statusFilter)
        : leadsWithStatus;

    // Calculate stats
    const stats = {
      total: leadsList.length,
      new: leadsWithStatus.filter((l) => l.status === 'new').length,
      contacted: leadsWithStatus.filter((l) => l.status === 'contacted').length,
      qualified: leadsWithStatus.filter((l) => l.status === 'qualified').length,
      converted: leadsWithStatus.filter((l) => l.status === 'converted').length,
      complete: leadsWithStatus.filter((l) => l.status === 'complete').length,
      unqualified: leadsWithStatus.filter((l) => l.status === 'unqualified').length,
    };

    logger.info(
      `Fetched ${filteredLeads.length} leads for ${isTaxPreparer ? 'preparer' : 'admin'} ${user.id}`
    );

    return NextResponse.json({
      success: true,
      leads: filteredLeads,
      stats,
      currentFilingYear: getCurrentFilingTaxYear(),
    });
  } catch (error) {
    logger.error('Error fetching tax preparer leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
