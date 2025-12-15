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
    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    });

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
    const { user, profile } = await prisma.$transaction(async (tx) => {
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

    logger.info('[Signup] User created successfully', { email: email.toLowerCase() });

    // Assign tracking code and auto-generate referral links (after transaction commits)
    try {
      await assignTrackingCodeToUser(profile.id);
      logger.info('[Signup] Assigned tracking code to new user', { userId: user.id, profileId: profile.id });
    } catch (trackingError) {
      // Log but don't block signup
      logger.error('[Signup] Failed to assign tracking code', { error: trackingError, userId: user.id });
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
    logger.error('[Signup] Failed to create account', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
