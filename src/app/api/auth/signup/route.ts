/**
 * Sign Up API Route
 * Creates new user accounts with hashed passwords and profile
 *
 * Also handles pending conversions for rejected preparer applicants:
 * - If user has a rejected preparer application with [PENDING_CONVERSION] marker,
 *   we apply the conversion (to client or affiliate) and assign to Owliver
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { assignTrackingCodeToUser } from '@/lib/services/tracking-code.service';
import { createClientFromPreparerApplication } from '@/lib/services/lead-conversion.service';
import { EmailService } from '@/lib/services/email.service';
import { authRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';
import crypto from 'crypto';

// Local TypeScript interfaces (replaces @prisma/client types)
interface User {
  id: string;
  email: string | null;
  name: string | null;
  hashedPassword: string | null;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Profile {
  id: string;
  userId: string;
  role: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  affiliateStatus: string | null;
  affiliateApprovedAt: Date | null;
}

interface CRMContact {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  userId: string | null;
  contactType: string;
}

interface PreparerApplication {
  id: string;
  email: string;
  status: string;
  notes: string | null;
}

// Contact type enum (replaces @prisma/client ContactType)
const ContactType = {
  LEAD: 'LEAD',
  CLIENT: 'CLIENT',
  PARTNER: 'PARTNER',
  OTHER: 'OTHER',
} as const;

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
    // Rate limiting: 10 requests per minute per IP
    const clientIp = getClientIdentifier(req);
    const rateLimitResult = await authRateLimit.limit(clientIp);

    if (!rateLimitResult.success) {
      logger.warn('[Signup] Rate limit exceeded', { ip: clientIp });
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            ...getRateLimitHeaders(rateLimitResult),
            'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    let name: string, email: string, password: string;
    try {
      const body = await req.json();
      name = body.name;
      email = body.email;
      password = body.password;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

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
    let existingUser: User | null = null;
    try {
      const { data: existingUsersData, error: existingUserError } = await db
        .from('users')
        .select('*')
        .ilike('email', email)
        .limit(1);

      if (existingUserError) {
        logger.error('[Signup] Database query failed', {
          error: existingUserError.message,
        });
        return NextResponse.json(
          { error: 'Database connection error. Please try again later.' },
          { status: 503 }
        );
      }

      existingUser = firstOrNull<User>(existingUsersData);
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

    // Check for pre-existing profile (tax preparer migration)
    // This handles the case where a tax preparer profile was created before signup
    const { data: existingProfileData } = await db
      .from('profiles')
      .select('id, userId, role, firstName, lastName, email')
      .eq('email', email.toLowerCase())
      .limit(1);

    const existingProfile = firstOrNull<Profile>(existingProfileData);

    if (existingProfile && existingProfile.role === 'tax_preparer') {
      // This is a pre-created tax preparer claiming their account
      logger.info('[Signup] Pre-created tax preparer found, activating account', {
        email: email.toLowerCase(),
        profileId: existingProfile.id,
      });

      const hashedPwd = await hashPassword(password);

      // Create User record for them
      const { data: newUser, error: userError } = await db
        .from('users')
        .insert({
          email: email.toLowerCase(),
          name,
          hashedPassword: hashedPwd,
          emailVerified: new Date().toISOString(), // Auto-verify pre-created preparers
        })
        .select()
        .single();

      if (userError) {
        logger.error('[Signup] Failed to create user for pre-created preparer', {
          error: userError.message,
          email: email.toLowerCase(),
        });
        throw userError;
      }

      // Link profile to new user
      await db
        .from('profiles')
        .update({ userId: newUser.id })
        .eq('id', existingProfile.id);

      logger.info('[Signup] Tax preparer claimed pre-created account', {
        email: email.toLowerCase(),
        profileId: existingProfile.id,
        userId: newUser.id,
      });

      // Create/link CRM contact for the preparer
      try {
        const { data: existingCrmContactData } = await db
          .from('crm_contacts')
          .select('*')
          .eq('email', email.toLowerCase())
          .limit(1);

        const existingCrmContact = firstOrNull<CRMContact>(existingCrmContactData);

        if (existingCrmContact) {
          await db
            .from('crm_contacts')
            .update({
              userId: newUser.id,
              contactType: 'PARTNER', // Tax preparers are partners
              lastContactedAt: new Date().toISOString(),
            })
            .eq('id', existingCrmContact.id);
        } else {
          await db.from('crm_contacts').insert({
            userId: newUser.id,
            email: email.toLowerCase(),
            firstName: existingProfile.firstName || name.split(' ')[0] || 'Unknown',
            lastName: existingProfile.lastName || name.split(' ').slice(1).join(' ') || '',
            contactType: 'PARTNER',
            stage: 'NEW',
            source: 'preparer_signup',
          });
        }
      } catch (crmError) {
        logger.error('[Signup] Failed to create/link CRM contact for preparer', {
          error: crmError,
          userId: newUser.id,
        });
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Account activated! You can now sign in as a tax preparer.',
          user: { id: newUser.id, name: newUser.name, email: newUser.email },
          role: 'tax_preparer',
        },
        { status: 201 }
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

    // Create user with profile
    // Note: Supabase doesn't have transactions like Prisma, so we handle errors manually
    let user: User | null = null;
    let profile: Profile | null = null;
    try {
      // Create user
      const { data: newUserData, error: userError } = await db
        .from('users')
        .insert({
          name,
          email: email.toLowerCase(), // Store email in lowercase
          hashedPassword,
        })
        .select()
        .single();

      if (userError) {
        // Check for unique constraint violation
        if (userError.code === '23505' || userError.message?.includes('duplicate') || userError.message?.includes('unique')) {
          return NextResponse.json(
            { error: 'An account with this email already exists' },
            { status: 409 }
          );
        }
        throw userError;
      }

      user = newUserData as User;

      // Create profile for the user
      // All users are auto-approved as affiliates so they can refer others immediately
      // Note: Profile doesn't have an 'email' field - email is stored on User
      const { data: newProfileData, error: profileError } = await db
        .from('profiles')
        .insert({
          userId: user.id,
          role: 'client', // Default role for new signups (client = registered user)
          firstName,
          middleName,
          lastName,
          affiliateStatus: 'APPROVED', // Auto-approve all users as affiliates
          affiliateApprovedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (profileError) {
        // If profile creation fails, we should clean up the user
        logger.error('[Signup] Profile creation failed, cleaning up user', {
          error: profileError.message,
          userId: user.id,
        });
        await db.from('users').delete().eq('id', user.id);
        throw profileError;
      }

      profile = newProfileData as Profile;
    } catch (txError) {
      const txErrorMessage = txError instanceof Error ? txError.message : String(txError);
      logger.error('[Signup] Transaction failed', {
        error: txErrorMessage,
        code: (txError as any)?.code,
      });

      // Check for unique constraint errors
      if (txErrorMessage.includes('duplicate') || txErrorMessage.includes('unique') || txErrorMessage.includes('23505')) {
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

    if (!user || !profile) {
      return NextResponse.json(
        { error: 'Failed to create account.' },
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
      const { data: existingCrmContactData } = await db
        .from('crm_contacts')
        .select('*')
        .eq('email', email.toLowerCase())
        .limit(1);

      const existingCrmContact = firstOrNull<CRMContact>(existingCrmContactData);

      if (existingCrmContact) {
        // Link existing CRM contact to this user
        await db
          .from('crm_contacts')
          .update({
            userId: user.id,
            firstName: firstName || existingCrmContact.firstName,
            lastName: lastName || existingCrmContact.lastName,
            contactType: ContactType.CLIENT, // Signed up = Client
            lastContactedAt: new Date().toISOString(),
          })
          .eq('id', existingCrmContact.id);
        logger.info('[Signup] Linked existing CRM contact to new user', {
          userId: user.id,
          crmContactId: existingCrmContact.id,
        });
      } else {
        // Create new CRM contact
        await db
          .from('crm_contacts')
          .insert({
            userId: user.id,
            email: email.toLowerCase(),
            firstName: firstName || 'Unknown',
            lastName: lastName || '',
            contactType: ContactType.CLIENT,
            stage: 'NEW',
            source: 'signup',
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
      const { data: pendingApplicationData } = await db
        .from('preparer_applications')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('status', 'REJECTED')
        .ilike('notes', '%[PENDING_CONVERSION:%')
        .limit(1);

      const pendingApplication = firstOrNull<PreparerApplication>(pendingApplicationData);

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

    // Send email verification email
    try {
      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Delete any existing tokens for this email
      await db
        .from('verification_tokens')
        .delete()
        .eq('identifier', email.toLowerCase());

      // Store verification token
      await db
        .from('verification_tokens')
        .insert({
          identifier: email.toLowerCase(),
          token: verificationToken,
          expires: tokenExpiry.toISOString(),
        });

      // Build verification URL
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
      const verificationUrl = `${appUrl}/api/auth/verify-email?token=${verificationToken}`;

      // Send verification email
      await EmailService.sendEmailVerificationEmail(email.toLowerCase(), verificationUrl, trimmedName);

      logger.info('[Signup] Verification email sent', { userId: user.id, email: email.toLowerCase() });
    } catch (verificationError) {
      // Log but don't block signup - user can request resend from dashboard
      logger.error('[Signup] Failed to send verification email', {
        error: verificationError instanceof Error ? verificationError.message : 'Unknown error',
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
        emailVerificationSent: true,
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
      { error: `Signup failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
