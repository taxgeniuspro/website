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
import { db, firstOrNull } from '@/lib/db';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { EmailService } from '@/lib/services/email.service';

// Local type definitions (replacing @prisma/client imports)
type UserRole = 'client' | 'affiliate' | 'tax_preparer' | 'admin';

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
    const { data: contacts } = await db
      .from('crm_contacts')
      .select('id, userId, firstName, lastName, email, phone')
      .eq('id', contactId)
      .limit(1);

    const contact = firstOrNull(contacts);

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
    const { data: existingUsers } = await db
      .from('users')
      .select('id')
      .eq('email', contact.email.toLowerCase())
      .limit(1);

    const existingUser = firstOrNull(existingUsers);

    if (existingUser) {
      // Link existing user to this contact
      await db
        .from('crm_contacts')
        .update({ userId: existingUser.id })
        .eq('id', contactId);

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

    // Create user
    const { data: newUser, error: userError } = await db
      .from('users')
      .insert({
        email: contact.email.toLowerCase(),
        hashedPassword: hashedPassword,
        emailVerified: null, // Not verified yet
      })
      .select('id, email')
      .single();

    if (userError || !newUser) {
      throw new Error(userError?.message || 'Failed to create user');
    }

    // Generate tracking code for affiliate/preparer roles
    const initials = `${(contact.firstName?.[0] || 'u').toLowerCase()}${(contact.lastName?.[0] || 'p').toLowerCase()}`;
    const trackingCode = role !== 'client' ? `${initials}-${nanoid(6)}` : null;

    // Create profile
    const { error: profileError } = await db
      .from('profiles')
      .insert({
        userId: newUser.id,
        role: role as UserRole,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        trackingCode,
        shortLinkUsername: role !== 'client' ? initials : null,
        affiliateStatus: role === 'affiliate' || role === 'tax_preparer' ? 'APPROVED' : undefined,
      });

    if (profileError) {
      throw new Error(profileError.message || 'Failed to create profile');
    }

    // Link the user to the CRM contact and update contact type
    let contactType: 'CLIENT' | 'AFFILIATE' | 'PREPARER' = 'CLIENT';
    if (role === 'affiliate') contactType = 'AFFILIATE';
    if (role === 'tax_preparer') contactType = 'PREPARER';

    await db
      .from('crm_contacts')
      .update({ userId: newUser.id, contactType })
      .eq('id', contactId);

    const result = {
      userId: newUser.id,
      email: newUser.email,
      trackingCode,
    };

    // Send invite email if requested
    if (sendInviteEmail) {
      try {
        const fullName = `${contact.firstName} ${contact.lastName}`.trim();

        if (role === 'tax_preparer') {
          // Generate magic link for password setup
          const magicLinkToken = nanoid(32);
          const magicLinkUrl = `${process.env.NEXTAUTH_URL || 'https://taxgeniuspro.tax'}/auth/set-password?token=${magicLinkToken}&email=${encodeURIComponent(result.email)}`;

          // Store token in database for verification (expires in 24 hours)
          await db
            .from('verification_tokens')
            .insert({
              identifier: result.email,
              token: magicLinkToken,
              expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            });

          await EmailService.sendTaxPreparerWelcomeEmail(
            result.email,
            fullName,
            result.email,
            result.trackingCode || '',
            magicLinkUrl,
            '24 hours'
          );
          logger.info('[CRM Create User API] Tax preparer welcome email sent', { email: result.email });
        } else {
          // Send standard welcome email for clients and affiliates
          const emailRole = role === 'affiliate' ? 'AFFILIATE' : 'CLIENT';
          await EmailService.sendWelcomeEmail(result.email, fullName, emailRole);
          logger.info('[CRM Create User API] Welcome email sent', { email: result.email, role: emailRole });
        }
      } catch (emailError: unknown) {
        // Log email error but don't fail the request - user was created successfully
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
        logger.error('[CRM Create User API] Failed to send invite email', {
          email: result.email,
          error: errorMessage,
        });
      }
    }

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
