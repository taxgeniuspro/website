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
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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
    const adminProfile = await prisma.profile.findUnique({
      where: { userId },
      select: { role: true },
    });

    if (!adminProfile || !['super_admin', 'admin'].includes(adminProfile.role)) {
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
    const preparer = await prisma.user.findUnique({
      where: { id: preparerId },
      select: {
        id: true,
        email: true,
        profile: {
          select: {
            id: true,
            role: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!preparer) {
      return NextResponse.json({ error: 'Tax preparer not found' }, { status: 404 });
    }

    if (!preparer.profile) {
      return NextResponse.json({ error: 'Tax preparer profile not found' }, { status: 404 });
    }

    if (preparer.profile.role !== 'TAX_PREPARER') {
      return NextResponse.json(
        { error: 'User is not a tax preparer' },
        { status: 400 }
      );
    }

    // 5. Check if email already exists
    const existingEmail = await prisma.professionalEmailAlias.findFirst({
      where: {
        emailAddress: emailAddress.toLowerCase(),
      },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: 'This email address is already in use' },
        { status: 409 }
      );
    }

    // 6. If isPrimary, remove primary flag from other emails for this profile
    if (isPrimary) {
      await prisma.professionalEmailAlias.updateMany({
        where: {
          profileId: preparer.profile.id,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });

      logger.info('Removed primary flag from existing professional emails', {
        profileId: preparer.profile.id,
        preparerId,
      });
    }

    // 7. Create professional email alias
    const professionalEmail = await prisma.professionalEmailAlias.create({
      data: {
        profileId: preparer.profile.id,
        emailAddress: emailAddress.toLowerCase(),
        status: 'ACTIVE',
        isPrimary,
        verifiedAt: new Date(), // Auto-verified by admin
      },
    });

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
            name: `${preparer.profile.firstName} ${preparer.profile.lastName}`,
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
