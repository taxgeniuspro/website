/**
 * Sign Up API Route
 * Creates new user accounts with hashed passwords and profile
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { assignTrackingCodeToUser } from '@/lib/services/tracking-code.service';

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
      const newProfile = await tx.profile.create({
        data: {
          userId: newUser.id,
          role: 'lead', // Default role for new signups
          firstName,
          middleName,
          lastName,
          email: email.toLowerCase(),
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
