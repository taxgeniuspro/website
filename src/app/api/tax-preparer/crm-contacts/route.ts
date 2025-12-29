import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions
interface Profile {
  id: string;
  role: string;
  customTrackingCode: string | null;
  trackingCode: string | null;
}

interface CRMContact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  contactType: string;
  stage: string;
  source: string | null;
  leadScore: number | null;
  createdAt: string;
  lastContactedAt: string | null;
  referrerUsername: string | null;
  referrerType: string | null;
  attributionMethod: string | null;
  filingStatus: string | null;
  taxYear: number | null;
  assignedPreparerId: string | null;
}

interface CRMInteraction {
  type: string;
  subject: string | null;
  occurredAt: string;
}

/**
 * GET /api/tax-preparer/crm-contacts
 *
 * Returns CRM contacts (leads) assigned to the authenticated tax preparer.
 * This replaces the TaxIntakeLead-based leads page that was filtering out completed intakes.
 *
 * Query params:
 *   - stage: Filter by pipeline stage (NEW, CONTACTED, QUALIFIED, etc.)
 *   - search: Search by name, email, or phone
 *   - limit: Number of records (default 50)
 *   - offset: Pagination offset (default 0)
 *   - sortBy: Sort field (createdAt, lastContactedAt, leadScore)
 *   - sortOrder: asc or desc (default desc)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id, role, customTrackingCode, trackingCode')
      .eq('userId', session.user.id)
      .limit(1);

    const profile = firstOrNull(profiles) as Profile | null;

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only tax preparers and admins can access this endpoint
    if (profile.role !== 'tax_preparer' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Tax preparer or admin access required' }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build query
    let query = db
      .from('crm_contacts')
      .select('*')
      .in('contactType', ['LEAD', 'CLIENT']);

    // For tax preparers, only show contacts assigned to them OR with their tracking code
    if (profile.role === 'tax_preparer') {
      const trackingCode = profile.customTrackingCode || profile.trackingCode;
      if (trackingCode) {
        query = query.or(`assignedPreparerId.eq.${profile.id},referrerUsername.eq.${trackingCode}`);
      } else {
        query = query.eq('assignedPreparerId', profile.id);
      }
    }

    // Stage filter
    if (stage) {
      query = query.eq('stage', stage);
    }

    // Search filter (case-insensitive)
    if (search) {
      query = query.or(
        `firstName.ilike.%${search}%,lastName.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    // Sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: contacts, error: contactsError } = await query;

    if (contactsError) {
      throw new Error(contactsError.message);
    }

    // Get total count for pagination (without pagination limits)
    let countQuery = db
      .from('crm_contacts')
      .select('id', { count: 'exact', head: true })
      .in('contactType', ['LEAD', 'CLIENT']);

    if (profile.role === 'tax_preparer') {
      const trackingCode = profile.customTrackingCode || profile.trackingCode;
      if (trackingCode) {
        countQuery = countQuery.or(`assignedPreparerId.eq.${profile.id},referrerUsername.eq.${trackingCode}`);
      } else {
        countQuery = countQuery.eq('assignedPreparerId', profile.id);
      }
    }

    if (stage) {
      countQuery = countQuery.eq('stage', stage);
    }

    if (search) {
      countQuery = countQuery.or(
        `firstName.ilike.%${search}%,lastName.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    const { count: totalCount } = await countQuery;

    // Get latest interaction for each contact
    const contactIds = (contacts || []).map((c: CRMContact) => c.id);
    let interactionsMap = new Map<string, CRMInteraction>();

    if (contactIds.length > 0) {
      const { data: interactions } = await db
        .from('crm_interactions')
        .select('contactId, type, subject, occurredAt')
        .in('contactId', contactIds)
        .order('occurredAt', { ascending: false });

      // Keep only the latest per contact
      for (const interaction of interactions || []) {
        if (!interactionsMap.has(interaction.contactId)) {
          interactionsMap.set(interaction.contactId, {
            type: interaction.type,
            subject: interaction.subject,
            occurredAt: interaction.occurredAt,
          });
        }
      }
    }

    // Get stage counts for filters
    let stageCountQuery = db
      .from('crm_contacts')
      .select('stage')
      .in('contactType', ['LEAD', 'CLIENT']);

    if (profile.role === 'tax_preparer') {
      const trackingCode = profile.customTrackingCode || profile.trackingCode;
      if (trackingCode) {
        stageCountQuery = stageCountQuery.or(`assignedPreparerId.eq.${profile.id},referrerUsername.eq.${trackingCode}`);
      } else {
        stageCountQuery = stageCountQuery.eq('assignedPreparerId', profile.id);
      }
    }

    const { data: stageData } = await stageCountQuery;

    // Count by stage
    const stageCountMap: Record<string, number> = {};
    for (const item of stageData || []) {
      stageCountMap[item.stage] = (stageCountMap[item.stage] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      contacts: (contacts || []).map((c: CRMContact) => ({
        id: c.id,
        name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        contactType: c.contactType,
        stage: c.stage,
        source: c.source,
        leadScore: c.leadScore,
        createdAt: c.createdAt,
        lastContactedAt: c.lastContactedAt,
        lastInteraction: interactionsMap.get(c.id) || null,
        attribution: {
          referrerUsername: c.referrerUsername,
          referrerType: c.referrerType,
          method: c.attributionMethod,
        },
        taxInfo: {
          filingStatus: c.filingStatus,
          taxYear: c.taxYear,
        },
      })),
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: offset + limit < (totalCount || 0),
      },
      filters: {
        stageCounts: stageCountMap,
      },
    });
  } catch (error) {
    logger.error('Error fetching CRM contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tax-preparer/crm-contacts
 *
 * Update a CRM contact's stage or other fields
 *
 * Body: {
 *   id: string,
 *   stage?: string,
 *   lastContactedAt?: string (ISO date),
 *   notes?: string (creates an interaction)
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profiles } = await db
      .from('profiles')
      .select('id, role, customTrackingCode, trackingCode')
      .eq('userId', session.user.id)
      .limit(1);

    const profile = firstOrNull(profiles) as Profile | null;

    if (!profile || (profile.role !== 'tax_preparer' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, stage, lastContactedAt, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    // Verify the contact exists and check access
    const { data: contacts } = await db
      .from('crm_contacts')
      .select('id, assignedPreparerId, referrerUsername')
      .eq('id', id)
      .limit(1);

    const contact = firstOrNull(contacts);

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const trackingCode = profile.customTrackingCode || profile.trackingCode;
    const isAssigned =
      contact.assignedPreparerId === profile.id || contact.referrerUsername === trackingCode || profile.role === 'admin';

    if (!isAssigned) {
      return NextResponse.json({ error: 'You do not have access to this contact' }, { status: 403 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (stage) {
      updateData.stage = stage;
      updateData.stageEnteredAt = new Date().toISOString();
    }
    if (lastContactedAt) {
      updateData.lastContactedAt = new Date(lastContactedAt).toISOString();
    }

    // Update the contact
    const { data: updatedContact, error: updateError } = await db
      .from('crm_contacts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Create an interaction if notes were provided
    if (notes) {
      await db.from('crm_interactions').insert({
        contactId: id,
        type: 'NOTE',
        direction: 'OUTBOUND',
        subject: stage ? `Stage changed to ${stage}` : 'Note added',
        body: notes,
        occurredAt: new Date().toISOString(),
      });
    }

    // Create stage history if stage changed
    if (stage) {
      await db.from('crm_stage_history').insert({
        contactId: id,
        stage: stage,
        notes: notes || `Stage updated to ${stage}`,
      });
    }

    logger.info('CRM contact updated', {
      contactId: id,
      stage,
      updatedBy: session.user.email,
    });

    return NextResponse.json({
      success: true,
      contact: updatedContact,
    });
  } catch (error) {
    logger.error('Error updating CRM contact:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}
