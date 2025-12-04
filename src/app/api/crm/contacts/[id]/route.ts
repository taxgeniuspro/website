/**
 * CRM Contact Detail API Route (Epic 7 - Story 7.1)
 *
 * GET /api/crm/contacts/[id] - Get contact details
 * PATCH /api/crm/contacts/[id] - Update contact
 * DELETE /api/crm/contacts/[id] - Delete contact (admin only)
 *
 * Auth: super_admin, admin, tax_preparer only
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOneOfRoles } from '@/lib/auth';
import { CRMService } from '@/lib/services/crm.service';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { PipelineStage } from '@prisma/client';
import { logger } from '@/lib/logger';
import type { CRMAccessContext } from '@/types/crm';

// Validation schema for updating a contact
const updateContactSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(20).optional(),
  company: z.string().max(200).optional(),
  filingStatus: z.string().max(50).optional(),
  dependents: z.number().int().min(0).max(20).optional(),
  previousYearAGI: z.number().optional(),
  taxYear: z.number().int().min(2000).max(2100).optional(),
  stage: z.nativeEnum(PipelineStage).optional(),
  assignedPreparerId: z.string().optional(),
  lastContactedAt: z.string().datetime().optional(),
});

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/crm/contacts/[id]
 * Get contact details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Auth check
    const { user, role } = await requireOneOfRoles(['super_admin', 'admin', 'tax_preparer']);

    logger.info('[CRM API] Getting contact', { contactId: params.id, userId: user.id, role });

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

    // Get contact
    const contact = await CRMService.getContactById(params.id, accessContext);

    logger.info('[CRM API] Contact retrieved successfully', { contactId: params.id });

    return NextResponse.json({
      success: true,
      data: contact,
    });
  } catch (error: any) {
    logger.error('[CRM API] Error getting contact', { error: error.message, contactId: params.id });

    if (error.message.includes('not found')) {
      return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
    }

    if (error.message.includes('Access denied') || error.message.includes('Unauthorized')) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get contact' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/crm/contacts/[id]
 * Update contact
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Auth check
    const { user, role } = await requireOneOfRoles(['super_admin', 'admin', 'tax_preparer']);

    logger.info('[CRM API] Updating contact', { contactId: params.id, userId: user.id, role });

    // Parse and validate body
    const body = await request.json();
    const validatedData = updateContactSchema.parse(body);

    // Convert lastContactedAt string to Date if present
    const updateData: any = { ...validatedData };
    if (updateData.lastContactedAt) {
      updateData.lastContactedAt = new Date(updateData.lastContactedAt);
    }

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

    // Update contact
    const contact = await CRMService.updateContact(params.id, updateData, accessContext);

    logger.info('[CRM API] Contact updated successfully', { contactId: params.id });

    return NextResponse.json({
      success: true,
      data: contact,
    });
  } catch (error: any) {
    logger.error('[CRM API] Error updating contact', {
      error: error.message,
      contactId: params.id,
    });

    if (error.message.includes('not found')) {
      return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
    }

    if (error.message.includes('Access denied') || error.message.includes('Unauthorized')) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update contact' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/crm/contacts/[id]
 * Delete contact (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Auth check - only admins can delete
    const { user, role } = await requireOneOfRoles(['super_admin', 'admin']);

    logger.info('[CRM API] Deleting contact', { contactId: params.id, userId: user.id, role });

    // Build access context
    const accessContext: CRMAccessContext = {
      userId: user.id,
      userId: user.id,
      userRole: role,
    };

    // Delete contact
    const result = await CRMService.deleteContact(params.id, accessContext);

    logger.info('[CRM API] Contact deleted successfully', { contactId: params.id });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('[CRM API] Error deleting contact', {
      error: error.message,
      contactId: params.id,
    });

    if (error.message.includes('not found')) {
      return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
    }

    if (error.message.includes('Access denied') || error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Only admins can delete contacts' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
