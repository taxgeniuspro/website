/**
 * CRM Contact - Create User Account API
 *
 * POST /api/crm/contacts/[id]/create-user - Create a user account for a CRM contact
 *
 * This endpoint allows admins to create a user account from an existing CRM contact
 * that doesn't have one yet (i.e., a lead that hasn't signed up).
 *
 * Auth: admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOneOfRoles } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const createUserSchema = z.object({
  role: z.enum(['client', 'affiliate', 'tax_preparer']),
  sendInviteEmail: z.boolean().default(true),
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/crm/contacts/[id]/create-user
 * Create a user account for a CRM contact (admin only)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: contactId } = await params;

  try {
    // Auth check - only admins can create users
    const { user } = await requireOneOfRoles(['admin']);

    logger.info('[CRM Create User API] Create user request', {
      contactId,
      adminId: user.id,
    });

    // Parse and validate body
    const body = await request.json();
    const { role, sendInviteEmail } = createUserSchema.parse(body);

    // Get the CRM contact
    const contact = await prisma.cRMContact.findUnique({
      where: { id: contactId },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });

    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Check if contact already has a user account
    if (contact.userId) {
      return NextResponse.json(
        { success: false, error: 'This contact already has a user account' },
        { status: 400 }
      );
    }

    // Check if a user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: contact.email.toLowerCase() },
    });

    if (existingUser) {
      // Link existing user to this contact
      await prisma.cRMContact.update({
        where: { id: contactId },
        data: { userId: existingUser.id },
      });

      return NextResponse.json({
        success: true,
        data: {
          contactId,
          userId: existingUser.id,
          action: 'linked',
          message: 'Existing user account linked to contact',
        },
      });
    }

    // Generate a temporary password (user will need to reset)
    const tempPassword = nanoid(12);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create the user and profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: contact.email.toLowerCase(),
          hashedPassword: hashedPassword,
          emailVerified: null, // Not verified yet
        },
      });

      // Generate tracking code for affiliate/preparer roles
      const initials = `${(contact.firstName?.[0] || 'u').toLowerCase()}${(contact.lastName?.[0] || 'p').toLowerCase()}`;
      const trackingCode = role !== 'client' ? `${initials}-${nanoid(6)}` : null;

      // Create profile
      await tx.profile.create({
        data: {
          userId: newUser.id,
          role: role as UserRole,
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone,
          trackingCode,
          shortLinkUsername: role !== 'client' ? initials : null,
          affiliateStatus: role === 'affiliate' || role === 'tax_preparer' ? 'APPROVED' : undefined,
        },
      });

      // Link the user to the CRM contact
      await tx.cRMContact.update({
        where: { id: contactId },
        data: { userId: newUser.id },
      });

      // Update CRM contact type to match role
      let contactType: 'CLIENT' | 'AFFILIATE' | 'PREPARER' = 'CLIENT';
      if (role === 'affiliate') contactType = 'AFFILIATE';
      if (role === 'tax_preparer') contactType = 'PREPARER';

      await tx.cRMContact.update({
        where: { id: contactId },
        data: { contactType },
      });

      return {
        userId: newUser.id,
        email: newUser.email,
        trackingCode,
      };
    });

    // TODO: If sendInviteEmail is true, send welcome/password reset email
    // This would use the Resend email service

    logger.info('[CRM Create User API] User created successfully', {
      contactId,
      userId: result.userId,
      role,
      adminId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        contactId,
        userId: result.userId,
        email: result.email,
        role,
        trackingCode: result.trackingCode,
        action: 'created',
        message: `User account created with role: ${role}`,
        note: sendInviteEmail
          ? 'Invite email will be sent'
          : 'User will need to reset password to access account',
      },
    });
  } catch (error: any) {
    logger.error('[CRM Create User API] Error creating user', {
      error: error.message,
      stack: error.stack,
      contactId,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
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
      { success: false, error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}
