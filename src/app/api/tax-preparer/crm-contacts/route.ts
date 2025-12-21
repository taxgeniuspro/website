import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        role: true,
        customTrackingCode: true,
        trackingCode: true,
      },
    });

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

    // Build where clause
    const whereClause: Record<string, unknown> = {};

    // For tax preparers, only show contacts assigned to them OR with their tracking code
    if (profile.role === 'tax_preparer') {
      const trackingCode = profile.customTrackingCode || profile.trackingCode;
      whereClause.OR = [
        { assignedPreparerId: profile.id },
        ...(trackingCode ? [{ referrerUsername: trackingCode }] : []),
      ];
    }

    // Stage filter
    if (stage) {
      whereClause.stage = stage;
    }

    // Search filter
    if (search) {
      whereClause.AND = [
        {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        },
      ];
    }

    // Only show LEADs and CLIENTs (not PREPARER or AFFILIATE contact types)
    whereClause.contactType = { in: ['LEAD', 'CLIENT'] };

    // Get contacts with pagination
    const [contacts, totalCount] = await Promise.all([
      prisma.cRMContact.findMany({
        where: whereClause,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          contactType: true,
          stage: true,
          source: true,
          leadScore: true,
          createdAt: true,
          lastContactedAt: true,
          referrerUsername: true,
          referrerType: true,
          attributionMethod: true,
          filingStatus: true,
          taxYear: true,
          interactions: {
            orderBy: { occurredAt: 'desc' },
            take: 1,
            select: {
              type: true,
              subject: true,
              occurredAt: true,
            },
          },
        },
      }),
      prisma.cRMContact.count({ where: whereClause }),
    ]);

    // Get stage counts for filters
    const stageCounts = await prisma.cRMContact.groupBy({
      by: ['stage'],
      where: {
        ...whereClause,
        stage: undefined, // Remove stage filter for count
      },
      _count: true,
    });

    const stageCountMap = stageCounts.reduce(
      (acc, item) => {
        acc[item.stage] = item._count;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      success: true,
      contacts: contacts.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`.trim(),
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
        lastInteraction: c.interactions[0] || null,
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
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
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

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        role: true,
        customTrackingCode: true,
        trackingCode: true,
      },
    });

    if (!profile || (profile.role !== 'tax_preparer' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, stage, lastContactedAt, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    // Verify the contact belongs to this preparer
    const contact = await prisma.cRMContact.findUnique({
      where: { id },
      select: {
        id: true,
        assignedPreparerId: true,
        referrerUsername: true,
      },
    });

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
      updateData.stageEnteredAt = new Date();
    }
    if (lastContactedAt) {
      updateData.lastContactedAt = new Date(lastContactedAt);
    }

    // Update the contact
    const updatedContact = await prisma.cRMContact.update({
      where: { id },
      data: updateData,
    });

    // Create an interaction if notes were provided
    if (notes) {
      await prisma.cRMInteraction.create({
        data: {
          contactId: id,
          type: 'NOTE',
          direction: 'OUTBOUND',
          subject: stage ? `Stage changed to ${stage}` : 'Note added',
          body: notes,
          occurredAt: new Date(),
        },
      });
    }

    // Create stage history if stage changed
    if (stage) {
      await prisma.cRMStageHistory.create({
        data: {
          contactId: id,
          stage: stage,
          notes: notes || `Stage updated to ${stage}`,
        },
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
