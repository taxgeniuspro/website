/**
 * Sign Up API Route
 * Creates new user accounts with hashed passwords and profile
 *
 * Also handles pending conversions for rejected preparer applicants:
 * - If user has a rejected preparer application with [PENDING_CONVERSION] marker,
 *   we apply the conversion (to client or affiliate) and assign to Owliver
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { assignTrackingCodeToUser } from '@/lib/services/tracking-code.service';
import { createClientFromPreparerApplication } from '@/lib/services/lead-conversion.service';
import { ContactType } from '@prisma/client';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Password strength validation
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    // Validation - required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Name validation
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return NextResponse.json(
        { error: 'Name must be between 2 and 100 characters' },
        { status: 400 }
      );
    }

    // Email validation
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Password strength validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.errors[0], errors: passwordValidation.errors },
        { status: 400 }
      );
    }

    // Check if user already exists (case-insensitive)
    let existingUser;
    try {
      existingUser = await prisma.user.findFirst({
        where: {
          email: {
            equals: email,
            mode: 'insensitive',
          },
        },
      });
    } catch (dbError) {
      logger.error('[Signup] Database query failed', {
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        code: (dbError as any)?.code,
      });
      return NextResponse.json(
        { error: 'Database connection error. Please try again later.' },
        { status: 503 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Parse name into firstName, middleName, lastName
    const nameParts = name.split(' ').filter((part: string) => part.length > 0);
    let firstName = '';
    let middleName: string | undefined;
    let lastName = '';

    if (nameParts.length === 1) {
      firstName = nameParts[0];
    } else if (nameParts.length === 2) {
      firstName = nameParts[0];
      lastName = nameParts[1];
    } else if (nameParts.length >= 3) {
      firstName = nameParts[0];
      middleName = nameParts.slice(1, -1).join(' ');
      lastName = nameParts[nameParts.length - 1];
    }

    // Create user with profile in a transaction
    let user, profile;
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const newUser = await tx.user.create({
          data: {
            name,
            email: email.toLowerCase(), // Store email in lowercase
            hashedPassword,
          },
        });

        // Create profile for the user
        // All users are auto-approved as affiliates so they can refer others immediately
        // Note: Profile doesn't have an 'email' field - email is stored on User
        const newProfile = await tx.profile.create({
          data: {
            userId: newUser.id,
            role: 'client', // Default role for new signups (client = registered user)
            firstName,
            middleName,
            lastName,
            affiliateStatus: 'APPROVED', // Auto-approve all users as affiliates
            affiliateApprovedAt: new Date(),
          },
        });

        return { user: newUser, profile: newProfile };
      });
      user = result.user;
      profile = result.profile;
    } catch (txError) {
      const txErrorMessage = txError instanceof Error ? txError.message : 'Unknown error';
      logger.error('[Signup] Transaction failed', {
        error: txErrorMessage,
        code: (txError as any)?.code,
        meta: (txError as any)?.meta,
      });

      // Check for specific Prisma errors
      if (txErrorMessage.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create account. Database error.' },
        { status: 500 }
      );
    }

    logger.info('[Signup] User created successfully', { email: email.toLowerCase() });

    // Assign tracking code and auto-generate referral links (after transaction commits)
    try {
      await assignTrackingCodeToUser(profile.id);
      logger.info('[Signup] Assigned tracking code to new user', { userId: user.id, profileId: profile.id });
    } catch (trackingError) {
      // Log but don't block signup
      logger.error('[Signup] Failed to assign tracking code', { error: trackingError, userId: user.id });
    }

    // Create or link CRM contact for unified People Hub view
    // This ensures all users appear in CRM regardless of how they signed up
    try {
      // Check if CRM contact already exists (from previous form submission)
      const existingCrmContact = await prisma.cRMContact.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingCrmContact) {
        // Link existing CRM contact to this user
        await prisma.cRMContact.update({
          where: { id: existingCrmContact.id },
          data: {
            userId: user.id,
            firstName: firstName || existingCrmContact.firstName,
            lastName: lastName || existingCrmContact.lastName,
            contactType: ContactType.CLIENT, // Signed up = Client
            lastContactedAt: new Date(),
          },
        });
        logger.info('[Signup] Linked existing CRM contact to new user', {
          userId: user.id,
          crmContactId: existingCrmContact.id,
        });
      } else {
        // Create new CRM contact
        await prisma.cRMContact.create({
          data: {
            userId: user.id,
            email: email.toLowerCase(),
            firstName: firstName || 'Unknown',
            lastName: lastName || '',
            contactType: ContactType.CLIENT,
            stage: 'NEW',
            source: 'signup',
          },
        });
        logger.info('[Signup] Created CRM contact for new user', { userId: user.id });
      }
    } catch (crmError) {
      // Log but don't block signup - user account was created successfully
      logger.error('[Signup] Failed to create/link CRM contact', {
        error: crmError instanceof Error ? crmError.message : 'Unknown error',
        userId: user.id,
      });
    }

    // Check for pending preparer application conversions
    // If this user was rejected from a preparer application but marked for conversion,
    // process that conversion now and assign them to Owliver
    try {
      const pendingApplication = await prisma.preparerApplication.findFirst({
        where: {
          email: email.toLowerCase(),
          status: 'REJECTED',
          notes: { contains: '[PENDING_CONVERSION:' },
        },
      });

      if (pendingApplication) {
        // Extract conversion type from notes
        const conversionMatch = pendingApplication.notes?.match(/\[PENDING_CONVERSION:(client|affiliate)\]/);
        if (conversionMatch) {
          const conversionType = conversionMatch[1] as 'client' | 'affiliate';
          logger.info('[Signup] Processing pending preparer application conversion', {
            userId: user.id,
            applicationId: pendingApplication.id,
            conversionType,
          });

          await createClientFromPreparerApplication(pendingApplication.id, user.id, conversionType);
          logger.info('[Signup] Applied pending conversion from rejected preparer application', {
            userId: user.id,
            profileId: profile.id,
            conversionType,
          });
        }
      }
    } catch (conversionError) {
      // Log but don't block signup - the user account was created successfully
      logger.error('[Signup] Failed to process pending preparer conversion', {
        error: conversionError,
        userId: user.id,
      });
    }

    // Return success (without password)
    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('[Signup] Failed to create account', {
      error: errorMessage,
      stack: errorStack,
      // Include Prisma-specific error info if available
      code: (error as any)?.code,
      meta: (error as any)?.meta,
    });

    // Provide more specific error messages for common issues
    if (errorMessage.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    if (errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { error: 'Database connection error. Please try again later.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
