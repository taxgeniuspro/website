import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/tax-preparer/leads/[id]
 * Fetches a single TaxIntakeLead by ID
 * Includes CRM contact lookup and document folder info
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: leadId } = await params;

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

    // Get preparer profile ID for access check
    let preparerProfileId: string | undefined;
    if (isTaxPreparer) {
      const { data: profiles } = await db
        .from('profiles')
        .select('id')
        .eq('userId', user.id)
        .limit(1);

      const preparerProfile = firstOrNull(profiles);

      if (!preparerProfile) {
        return NextResponse.json({ error: 'Tax preparer profile not found' }, { status: 404 });
      }
      preparerProfileId = preparerProfile.id;
    }

    // Fetch the lead with relations
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select(
        `
        *,
        profile:profiles!profileId (
          id,
          firstName,
          lastName,
          role
        ),
        clientFolder:folders!clientFolderId (
          id,
          name,
          path
        )
      `
      )
      .eq('id', leadId)
      .limit(1);

    const lead = firstOrNull(leads);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Access check: Tax preparers can only see their assigned leads
    if (isTaxPreparer && lead.assignedPreparerId !== preparerProfileId) {
      return NextResponse.json(
        { error: 'Access denied: This lead is not assigned to you' },
        { status: 403 }
      );
    }

    // Fetch CRM contact by email, but only return it if it's assigned to the same preparer
    const { data: crmContacts } = await db
      .from('crm_contacts')
      .select('id, assignedPreparerId')
      .eq('email', lead.email.toLowerCase())
      .limit(1);

    const crmContact = firstOrNull(crmContacts);

    // Only include CRM contact if it matches the preparer (or user is admin)
    const canAccessCrmContact =
      isAdmin || !crmContact?.assignedPreparerId || crmContact.assignedPreparerId === preparerProfileId;

    // Determine lead status
    const getLeadStatus = (lead: Record<string, unknown>): string => {
      if (lead.unqualified) return 'unqualified';
      if (lead.convertedToClient && lead.convertedAt) return 'complete';
      if (lead.convertedToClient) return 'converted';
      if (lead.contactNotes && lead.lastContactedAt) return 'qualified';
      if (lead.lastContactedAt) return 'contacted';
      return 'new';
    };

    const leadWithStatus = {
      ...lead,
      status: getLeadStatus(lead),
      crmContactId: canAccessCrmContact ? crmContact?.id || null : null,
    };

    logger.info(`Lead ${leadId} fetched by ${isTaxPreparer ? 'preparer' : 'admin'} ${user.id}`);

    return NextResponse.json({
      success: true,
      lead: leadWithStatus,
    });
  } catch (error) {
    logger.error('Error fetching lead:', error);
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 });
  }
}
