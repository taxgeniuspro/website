/**
 * CRM Contacts API Route (Epic 7 - Story 7.1)
 *
 * GET /api/crm/contacts - List contacts (paginated, filtered)
 * POST /api/crm/contacts - Create new contact
 *
 * Auth: super_admin, admin, tax_preparer only
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOneOfRoles } from '@/lib/auth';
import { CRMService } from '@/lib/services/crm.service';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ContactType, PipelineStage, UserRole } from '@prisma/client';
import { logger } from '@/lib/logger';
import type { CRMAccessContext } from '@/types/crm';

// Validation schema for creating a contact
const createContactSchema = z.object({
  userId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  contactType: z.nativeEnum(ContactType),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(20).optional(),
  company: z.string().max(200).optional(),
  filingStatus: z.string().max(50).optional(),
  dependents: z.number().int().min(0).max(20).optional(),
  previousYearAGI: z.number().optional(),
  taxYear: z.number().int().min(2000).max(2100).optional(),
  source: z.string().max(200).optional(),
  assignedPreparerId: z.string().optional(),
});

/**
 * GET /api/crm/contacts
 * List contacts with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const { user, role } = await requireOneOfRoles(['super_admin', 'admin', 'tax_preparer']);

    logger.info('[CRM API] Listing contacts', { userId: user.id, role });

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const stage = searchParams.get('stage') as PipelineStage | null;
    const contactType = searchParams.get('contactType') as ContactType | null;
    const assignedPreparerId = searchParams.get('assignedPreparerId');
    const search = searchParams.get('search');

    // Get preparer ID if user is a tax preparer
    let preparerId: string | undefined;
    if (role === 'tax_preparer') {
      const profile = await prisma.profile.findUnique({
        where: { userId: user.id },
      });
      preparerId = profile?.id;
    }

    // Build access context
    const accessContext: CRMAccessContext = {
      userId: user.id,
      userId: user.id,
      userRole: role,
      preparerId,
    };

    // Build filters
    const filters: any = {};
    if (stage) filters.stage = stage;
    if (contactType) filters.contactType = contactType;
    if (assignedPreparerId) filters.assignedPreparerId = assignedPreparerId;
    if (search) filters.search = search;

    // Get contacts
    const result = await CRMService.listContacts(filters, { page, limit }, accessContext);

    logger.info('[CRM API] Contacts listed successfully', {
      total: result.total,
      returned: result.contacts.length,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('[CRM API] Error listing contacts', { error: error.message });

    if (error.message.includes('Unauthorized') || error.message.includes('permissions')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list contacts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/contacts
 * Create a new contact
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const { user, role } = await requireOneOfRoles(['super_admin', 'admin', 'tax_preparer']);

    logger.info('[CRM API] Creating contact', { userId: user.id, role });

    // Parse and validate body
    const body = await request.json();
    const validatedData = createContactSchema.parse(body);

    // Create contact
    const contact = await CRMService.createContact(validatedData);

    logger.info('[CRM API] Contact created successfully', { contactId: contact.id });

    return NextResponse.json({
      success: true,
      data: contact,
    });
  } catch (error: any) {
    logger.error('[CRM API] Error creating contact', { error: error.message });

    if (error.message.includes('Unauthorized') || error.message.includes('permissions')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'Contact with this email already exists' },
        { status: 400 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create contact' },
      { status: 500 }
    );
  }
}
