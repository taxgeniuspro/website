import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { hash } from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import { assignTrackingCodeToUser } from '@/lib/services/tracking-code.service';

// Generate random password
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 16);

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET: Get single affiliate application (admin only)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const application = await prisma.lead.findFirst({
      where: { id, type: 'affiliate' },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ application });
  } catch (error) {
    logger.error('Error fetching affiliate application:', error);
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 });
  }
}

// PUT: Update affiliate application (approve/reject)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, notes } = body;

    const application = await prisma.lead.findFirst({
      where: { id, type: 'affiliate' },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // Check if user already exists with this email (look up User, not Profile)
      const existingUser = await prisma.user.findUnique({
        where: { email: application.email.toLowerCase() },
        include: { profile: true },
      });

      let profile = existingUser?.profile || null;
      const isNewProfile = !profile;

      if (profile) {
        // User exists, ensure affiliate status is approved
        // Note: 'affiliate' is not a role - it's a status (affiliateStatus)
        profile = await prisma.profile.update({
          where: { id: profile.id },
          data: {
            affiliateStatus: 'APPROVED',
            affiliateApprovedAt: profile.affiliateApprovedAt || new Date(),
            // Update name/phone if not already set
            firstName: profile.firstName || application.firstName,
            lastName: profile.lastName || application.lastName,
            phone: profile.phone || application.phone,
          },
        });

        logger.info('Existing user approved as affiliate', {
          profileId: profile.id,
          email: application.email,
          leadId: application.id,
        });
      } else {
        // Create new user account with affiliate status
        // Profile requires a User, so we must create both in a transaction
        const tempPassword = nanoid();
        const hashedPassword = await hash(tempPassword, 10);
        const fullName = [application.firstName, application.lastName].filter(Boolean).join(' ');

        const { user: newUser, profile: newProfile } = await prisma.$transaction(async (tx) => {
          // First create the User (required for Profile)
          const createdUser = await tx.user.create({
            data: {
              name: fullName,
              email: application.email.toLowerCase(),
              hashedPassword,
              emailVerified: new Date(), // Auto-verify since admin approved
            },
          });

          // Then create the Profile linked to the User
          // Note: Profile doesn't have an 'email' field - email is on User
          // Note: 'affiliate' is not a role - use affiliateStatus instead
          const createdProfile = await tx.profile.create({
            data: {
              userId: createdUser.id,
              firstName: application.firstName,
              lastName: application.lastName,
              phone: application.phone,
              role: 'client', // Default role (affiliate is a status, not a role)
              affiliateStatus: 'APPROVED',
              affiliateApprovedAt: new Date(),
            },
          });

          return { user: createdUser, profile: createdProfile };
        });

        profile = newProfile;

        logger.info('New user created with affiliate status', {
          userId: newUser.id,
          profileId: profile.id,
          email: application.email,
          leadId: application.id,
        });

        // TODO: Send welcome email with temporary password or magic link
      }

      // Assign tracking code for affiliate referrals
      try {
        await assignTrackingCodeToUser(profile.id);
        logger.info('Assigned tracking code to affiliate', {
          profileId: profile.id,
          email: application.email,
        });
      } catch (trackingError) {
        // Log but don't fail the approval
        logger.error('Failed to assign tracking code', {
          error: trackingError,
          profileId: profile.id,
        });
      }

      // Update lead status to CONTACTED (or create custom status for affiliates)
      const updatedApplication = await prisma.lead.update({
        where: { id },
        data: {
          status: 'CONTACTED', // Update to appropriate status
          message: notes ? `${application.message || ''}\n\nApproval Notes: ${notes}` : application.message,
        },
      });

      // Get email from the user relation for response
      const userWithEmail = await prisma.user.findUnique({
        where: { id: profile.userId },
        select: { email: true },
      });

      return NextResponse.json({
        success: true,
        message: `Application approved - ${isNewProfile ? 'Created new' : 'Updated existing'} user with affiliate status`,
        application: updatedApplication,
        profile: {
          id: profile.id,
          email: userWithEmail?.email || application.email,
          role: profile.role,
          affiliateStatus: profile.affiliateStatus,
        },
      });
    } else if (action === 'reject') {
      // Update lead status to LOST
      const updatedApplication = await prisma.lead.update({
        where: { id },
        data: {
          status: 'LOST',
          message: notes ? `${application.message || ''}\n\nRejection Notes: ${notes}` : application.message,
        },
      });

      logger.info('Affiliate application rejected', {
        leadId: id,
        email: application.email,
      });

      // TODO: Send rejection email to applicant

      return NextResponse.json({
        success: true,
        message: 'Application rejected',
        application: updatedApplication,
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Error updating affiliate application:', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}

// DELETE: Delete affiliate application (admin only)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { id } = await params;

    await prisma.lead.delete({
      where: { id, type: 'affiliate' },
    });

    logger.info('Affiliate application deleted', { leadId: id });

    return NextResponse.json({
      success: true,
      message: 'Application deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting affiliate application:', error);
    return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 });
  }
}
