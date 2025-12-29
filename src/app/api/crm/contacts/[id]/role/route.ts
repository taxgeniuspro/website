/**
 * CRM Contact Role Management API
 *
 * PATCH /api/crm/contacts/[id]/role - Update user role from CRM contact
 *
 * This endpoint allows admins to change a user's role directly from the CRM
 * contact view, without navigating to the User Management page.
 *
 * Auth: admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOneOfRoles } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client imports)
type UserRole = 'client' | 'affiliate' | 'tax_preparer' | 'admin';

const updateRoleSchema = z.object({
  role: z.enum(['client', 'affiliate', 'tax_preparer', 'admin']),
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * PATCH /api/crm/contacts/[id]/role
 * Update user role from CRM contact (admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id: contactId } = await params;

  try {
    // Auth check - only admins can change roles
    const { user } = await requireOneOfRoles(['admin']);

    logger.info('[CRM Role API] Role change request', {
      contactId,
      adminId: user.id,
    });

    // Parse and validate body
    const body = await request.json();
    const { role } = updateRoleSchema.parse(body);

    // Get the CRM contact
    const { data: contacts } = await db
      .from('crm_contacts')
      .select('id, userId, firstName, lastName, email')
      .eq('id', contactId)
      .limit(1);

    const contact = firstOrNull(contacts);

    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Check if contact is linked to a user account
    if (!contact.userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'This contact is not linked to a user account. Create a user account first.',
        },
        { status: 400 }
      );
    }

    // Get current profile to check existing role
    const { data: profiles } = await db
      .from('profiles')
      .select('role')
      .eq('userId', contact.userId)
      .limit(1);

    const currentProfile = firstOrNull(profiles);

    if (!currentProfile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    const previousRole = currentProfile.role;

    // Prevent self-demotion for admins
    if (contact.userId === user.id && role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'You cannot demote your own admin account',
        },
        { status: 403 }
      );
    }

    // Update the profile role
    await db
      .from('profiles')
      .update({ role: role as UserRole })
      .eq('userId', contact.userId);

    // Also update the CRM contact type to match
    let contactType: 'CLIENT' | 'AFFILIATE' | 'PREPARER' | 'LEAD' = 'CLIENT';
    switch (role) {
      case 'client':
        contactType = 'CLIENT';
        break;
      case 'affiliate':
        contactType = 'AFFILIATE';
        break;
      case 'tax_preparer':
        contactType = 'PREPARER';
        break;
      case 'admin':
        contactType = 'CLIENT'; // Admins show as clients in CRM
        break;
    }

    await db
      .from('crm_contacts')
      .update({ contactType })
      .eq('id', contactId);

    logger.info('[CRM Role API] Role updated successfully', {
      contactId,
      userId: contact.userId,
      previousRole,
      newRole: role,
      adminId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        contactId,
        userId: contact.userId,
        name: `${contact.firstName} ${contact.lastName}`,
        email: contact.email,
        previousRole,
        newRole: role,
      },
      message: `Successfully updated role from ${previousRole} to ${role}. User should sign out and back in for changes to take effect.`,
    });
  } catch (error: any) {
    logger.error('[CRM Role API] Error updating role', {
      error: error.message,
      stack: error.stack,
      contactId,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid role specified', details: error.issues },
        { status: 400 }
      );
    }

    if (
      error.message?.includes('Access denied') ||
      error.message?.includes('Unauthorized') ||
      error.message?.includes('Insufficient permissions')
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update role' },
      { status: 500 }
    );
  }
}
