/**
 * Admin API: Provision Professional Email
 *
 * POST: Create a professional email alias (@taxgeniuspro.tax) for a tax preparer
 * - Creates ProfessionalEmailAlias record
 * - Sets isPrimary flag if specified
 * - If isPrimary, removes primary flag from other emails for the same profile
 * - Returns the created email alias
 */

import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local interfaces
interface Profile {
  id: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
}

interface User {
  id: string;
  email: string;
}

/**
 * POST: Provision professional email for tax preparer
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Check admin permissions
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get admin's profile
    const { data: adminProfileData, error: adminProfileError } = await db.from('profiles')
      .select('role')
      .eq('userId', userId)
      .limit(1);

    if (adminProfileError) {
      throw adminProfileError;
    }

    const adminProfile = firstOrNull<{ role: string }>(adminProfileData);

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { preparerId, emailAddress, isPrimary = false } = body;

    // 3. Validate input
    if (!preparerId || !emailAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: preparerId and emailAddress are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate email domain (must be taxgeniuspro.tax)
    if (!emailAddress.endsWith('@taxgeniuspro.tax')) {
      return NextResponse.json(
        { error: 'Professional email must be @taxgeniuspro.tax domain' },
        { status: 400 }
      );
    }

    // 4. Check if preparer exists
    const { data: preparerData, error: preparerError } = await db.from('users')
      .select('id, email')
      .eq('id', preparerId)
      .limit(1);

    if (preparerError) {
      throw preparerError;
    }

    const preparer = firstOrNull<User>(preparerData);

    if (!preparer) {
      return NextResponse.json({ error: 'Tax preparer not found' }, { status: 404 });
    }

    // Get preparer's profile
    const { data: profileData, error: profileError } = await db.from('profiles')
      .select('id, role, firstName, lastName')
      .eq('userId', preparer.id)
      .limit(1);

    if (profileError) {
      throw profileError;
    }

    const profile = firstOrNull<Profile>(profileData);

    if (!profile) {
      return NextResponse.json({ error: 'Tax preparer profile not found' }, { status: 404 });
    }

    if (profile.role !== 'tax_preparer') {
      return NextResponse.json(
        { error: 'User is not a tax preparer' },
        { status: 400 }
      );
    }

    // 5. Check if email already exists
    const { data: existingEmail } = await db.from('professional_email_aliases')
      .select('id')
      .eq('emailAddress', emailAddress.toLowerCase())
      .limit(1);

    if (existingEmail && existingEmail.length > 0) {
      return NextResponse.json(
        { error: 'This email address is already in use' },
        { status: 409 }
      );
    }

    // 6. If isPrimary, remove primary flag from other emails for this profile
    if (isPrimary) {
      await db.from('professional_email_aliases')
        .update({ isPrimary: false })
        .eq('profileId', profile.id)
        .eq('isPrimary', true);

      logger.info('Removed primary flag from existing professional emails', {
        profileId: profile.id,
        preparerId,
      });
    }

    // 7. Create professional email alias
    const { data: professionalEmail, error: createError } = await db.from('professional_email_aliases')
      .insert({
        profileId: profile.id,
        emailAddress: emailAddress.toLowerCase(),
        forwardToEmail: preparer.email, // Forward to their signup email by default
        status: 'ACTIVE',
        isPrimary,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    logger.info('Professional email provisioned', {
      emailId: professionalEmail.id,
      preparerId,
      emailAddress: professionalEmail.emailAddress,
      isPrimary,
      provisionedBy: userId,
    });

    // 8. Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Professional email provisioned successfully',
        data: {
          id: professionalEmail.id,
          emailAddress: professionalEmail.emailAddress,
          isPrimary: professionalEmail.isPrimary,
          status: professionalEmail.status,
          preparer: {
            id: preparer.id,
            name: `${profile.firstName} ${profile.lastName}`,
            signupEmail: preparer.email,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error provisioning professional email', error);
    return NextResponse.json(
      { error: 'Failed to provision professional email' },
      { status: 500 }
    );
  }
}
