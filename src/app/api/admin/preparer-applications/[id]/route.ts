import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { hash } from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import { assignTrackingCodeToUser } from '@/lib/services/tracking-code.service';
import { convertRejectedPreparerToClient } from '@/lib/services/lead-conversion.service';
import { EmailService } from '@/lib/services/email.service';

// Generate random password
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 16);

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET: Get single preparer application (admin only)
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

    const application = await prisma.preparerApplication.findUnique({
      where: { id },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ application });
  } catch (error) {
    logger.error('Error fetching preparer application:', error);
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 });
  }
}

// PUT: Update preparer application (approve/reject)
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
    const { action, notes, targetRole, convertTo } = body;
    // targetRole: 'client' | 'tax_preparer' (default: 'tax_preparer')
    // Note: 'affiliate' is not a role - it's a status (affiliateStatus) on Profile
    // convertTo: 'client' | 'affiliate' - for reject action, optionally convert to client/affiliate

    const application = await prisma.preparerApplication.findUnique({
      where: { id },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // Validate target role - only 'client' and 'tax_preparer' are valid user roles
      // 'affiliate' is a status, not a role - all approved users get affiliate status
      const validRoles = ['client', 'tax_preparer'];
      const role = targetRole && validRoles.includes(targetRole) ? targetRole : 'tax_preparer';

      // Check if user already exists with this email (look up User, not Profile)
      const existingUser = await prisma.user.findUnique({
        where: { email: application.email.toLowerCase() },
        include: { profile: true },
      });

      let profile = existingUser?.profile || null;
      const isNewProfile = !profile;

      if (profile) {
        // User exists, update their role
        profile = await prisma.profile.update({
          where: { id: profile.id },
          data: {
            role: role,
            // Update name/phone if not already set
            firstName: profile.firstName || application.firstName,
            lastName: profile.lastName || application.lastName,
            phone: profile.phone || application.phone,
            // Ensure affiliate status is approved
            affiliateStatus: 'APPROVED',
            affiliateApprovedAt: profile.affiliateApprovedAt || new Date(),
          },
        });

        logger.info(`Existing user upgraded to ${role}`, {
          profileId: profile.id,
          email: application.email,
          applicationId: application.id,
          role: role,
        });
      } else {
        // Create new user account with selected role
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
          const createdProfile = await tx.profile.create({
            data: {
              userId: createdUser.id,
              firstName: application.firstName,
              lastName: application.lastName,
              middleName: application.middleName,
              phone: application.phone,
              role: role,
              affiliateStatus: 'APPROVED', // Auto-approve as affiliate
              affiliateApprovedAt: new Date(),
            },
          });

          return { user: createdUser, profile: createdProfile };
        });

        profile = newProfile;

        logger.info(`New ${role} user and profile created`, {
          userId: newUser.id,
          profileId: profile.id,
          email: application.email,
          applicationId: application.id,
          role: role,
        });

        // Send welcome email with magic link for password setup
        try {
          // Create magic link token (valid for 24 hours)
          const magicLinkToken = nanoid();
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

          await prisma.magicLink.create({
            data: {
              token: magicLinkToken,
              userId: newUser.id,
              expiresAt,
            },
          });

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
          const magicLinkUrl = `${appUrl}/auth/verify?token=${magicLinkToken}`;

          // Get tracking code if assigned
          const profileWithCode = await prisma.profile.findUnique({
            where: { id: profile.id },
            select: { customTrackingCode: true },
          });

          await EmailService.sendTaxPreparerWelcomeEmail(
            application.email,
            fullName,
            application.email,
            profileWithCode?.customTrackingCode || 'pending',
            magicLinkUrl,
            '24 hours'
          );

          logger.info('Welcome email sent to new preparer', {
            email: application.email,
            profileId: profile.id,
          });
        } catch (emailError) {
          // Log but don't fail the approval
          logger.error('Failed to send welcome email', {
            error: emailError,
            email: application.email,
            profileId: profile.id,
          });
        }
      }

      // For tax_preparer role, set up tracking code + referral links
      // (all users get affiliate status, but only tax_preparers need tracking codes for marketing)
      if (role === 'tax_preparer') {
        try {
          await assignTrackingCodeToUser(profile.id);
          logger.info(`Assigned tracking code to ${role}`, {
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

        // Create referral image folder for new preparer
        try {
          const existingFolder = await prisma.referralImageSet.findFirst({
            where: { preparerId: profile.id, category: 'preparer' },
          });

          if (!existingFolder) {
            const fullName = [application.firstName, application.lastName].filter(Boolean).join(' ');
            await prisma.referralImageSet.create({
              data: {
                category: 'preparer',
                preparerId: profile.id,
                name: fullName,
                description: `Custom referral images for ${fullName}`,
                isActive: true,
              },
            });
            logger.info('Created referral image folder for new preparer', {
              profileId: profile.id,
              name: fullName,
            });
          }
        } catch (folderError) {
          // Log but don't fail the approval
          logger.error('Failed to create referral image folder', {
            error: folderError,
            profileId: profile.id,
          });
        }
      }

      // Update application status to APPROVED with conversion tracking and audit fields
      const updatedApplication = await prisma.preparerApplication.update({
        where: { id },
        data: {
          status: 'APPROVED',
          notes: notes || application.notes,
          stage: 'DECISION',
          convertedToRole: role,
          convertedProfileId: profile.id,
          convertedAt: new Date(),
          // Audit fields
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          lastModifiedBy: session.user.id,
          lastModifiedAt: new Date(),
        },
      });

      // Get email from the user relation for response
      const userWithEmail = await prisma.user.findUnique({
        where: { id: profile.userId },
        select: { email: true },
      });

      return NextResponse.json({
        success: true,
        message: `Application approved - ${isNewProfile ? 'Created new' : 'Updated existing'} ${role} account`,
        application: updatedApplication,
        profile: {
          id: profile.id,
          email: userWithEmail?.email || application.email,
          role: profile.role,
        },
      });
    } else if (action === 'reject') {
      // Update application status to REJECTED with audit fields
      const updatedApplication = await prisma.preparerApplication.update({
        where: { id },
        data: {
          status: 'REJECTED',
          notes: notes || application.notes,
          // Audit fields
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          lastModifiedBy: session.user.id,
          lastModifiedAt: new Date(),
        },
      });

      logger.info('Preparer application rejected', {
        applicationId: id,
        email: application.email,
        convertTo: convertTo || 'none',
      });

      // Handle conversion to client/affiliate if requested
      if (convertTo === 'client' || convertTo === 'affiliate') {
        const conversionResult = await convertRejectedPreparerToClient(id, convertTo);

        if (conversionResult.success) {
          const conversionMessage = conversionResult.requiresSignup
            ? `Application rejected. Marked for ${convertTo} conversion - they will be converted when they sign up.`
            : `Application rejected and converted to ${convertTo === 'affiliate' ? 'Affiliate Client' : 'Client'}.`;

          logger.info('Rejected application converted', {
            applicationId: id,
            convertTo,
            profileId: conversionResult.profileId,
            requiresSignup: conversionResult.requiresSignup,
          });

          // Send rejection email with conversion info
          try {
            await EmailService.sendPreparerRejectionEmail(
              application.email,
              application.firstName,
              notes || undefined,
              convertTo,
              'en'
            );
            logger.info('Rejection email sent with conversion info', {
              email: application.email,
              convertTo,
            });
          } catch (emailError) {
            logger.error('Failed to send rejection email', {
              error: emailError,
              email: application.email,
            });
          }

          return NextResponse.json({
            success: true,
            message: conversionMessage,
            application: updatedApplication,
            conversion: {
              type: convertTo,
              profileId: conversionResult.profileId,
              requiresSignup: conversionResult.requiresSignup,
            },
          });
        } else {
          // Conversion failed but rejection succeeded
          logger.error('Failed to convert rejected application', {
            applicationId: id,
            convertTo,
            error: conversionResult.error,
          });

          return NextResponse.json({
            success: true,
            message: `Application rejected, but conversion to ${convertTo} failed: ${conversionResult.error}`,
            application: updatedApplication,
            conversionError: conversionResult.error,
          });
        }
      }

      // Send rejection email to applicant
      try {
        await EmailService.sendPreparerRejectionEmail(
          application.email,
          application.firstName,
          notes || undefined,
          null,
          'en'
        );
        logger.info('Rejection email sent', {
          email: application.email,
        });
      } catch (emailError) {
        logger.error('Failed to send rejection email', {
          error: emailError,
          email: application.email,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Application rejected',
        application: updatedApplication,
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Error updating preparer application:', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}

// DELETE: Delete preparer application (admin only)
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

    await prisma.preparerApplication.delete({
      where: { id },
    });

    logger.info('Preparer application deleted', { applicationId: id });

    return NextResponse.json({
      success: true,
      message: 'Application deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting preparer application:', error);
    return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 });
  }
}
