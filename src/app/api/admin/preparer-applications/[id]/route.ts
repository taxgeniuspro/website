import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
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

// Local interfaces
interface PreparerApplication {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  phone: string;
  languages: string[];
  smsConsent: boolean;
  status: string;
  notes: string | null;
  stage: string | null;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface Profile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  phone: string | null;
  role: string;
  affiliateStatus: string | null;
  affiliateApprovedAt: string | null;
  customTrackingCode: string | null;
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

    const { data: applicationData, error: findError } = await db.from('preparer_applications')
      .select('*')
      .eq('id', id)
      .limit(1);

    if (findError) {
      throw findError;
    }

    const application = firstOrNull<PreparerApplication>(applicationData);

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

    const { data: applicationData, error: findError } = await db.from('preparer_applications')
      .select('*')
      .eq('id', id)
      .limit(1);

    if (findError) {
      throw findError;
    }

    const application = firstOrNull<PreparerApplication>(applicationData);

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // Validate target role - only 'client' and 'tax_preparer' are valid user roles
      // 'affiliate' is a status, not a role - all approved users get affiliate status
      const validRoles = ['client', 'tax_preparer'];
      const role = targetRole && validRoles.includes(targetRole) ? targetRole : 'tax_preparer';

      // Check if user already exists with this email (look up User, not Profile)
      const { data: existingUserData } = await db.from('users')
        .select('id, email, name')
        .eq('email', application.email.toLowerCase())
        .limit(1);

      const existingUser = firstOrNull<User>(existingUserData);

      let profile: Profile | null = null;
      let newUser: User | null = null;
      const isNewProfile = !existingUser;

      if (existingUser) {
        // Get existing profile
        const { data: profileData } = await db.from('profiles')
          .select('*')
          .eq('userId', existingUser.id)
          .limit(1);

        profile = firstOrNull<Profile>(profileData);

        if (profile) {
          // User exists, update their role
          const { data: updatedProfile, error: updateError } = await db.from('profiles')
            .update({
              role: role,
              // Update name/phone if not already set
              firstName: profile.firstName || application.firstName,
              lastName: profile.lastName || application.lastName,
              phone: profile.phone || application.phone,
              // Ensure affiliate status is approved
              affiliateStatus: 'APPROVED',
              affiliateApprovedAt: profile.affiliateApprovedAt || new Date().toISOString(),
            })
            .eq('id', profile.id)
            .select()
            .single();

          if (updateError) {
            throw updateError;
          }

          profile = updatedProfile;

          logger.info(`Existing user upgraded to ${role}`, {
            profileId: profile.id,
            email: application.email,
            applicationId: application.id,
            role: role,
          });
        }
      } else {
        // Create new user account with selected role
        // Profile requires a User, so we must create both
        const tempPassword = nanoid();
        const hashedPassword = await hash(tempPassword, 10);
        const fullName = [application.firstName, application.lastName].filter(Boolean).join(' ');

        // First create the User (required for Profile)
        const { data: createdUser, error: userCreateError } = await db.from('users')
          .insert({
            name: fullName,
            email: application.email.toLowerCase(),
            hashedPassword,
            emailVerified: new Date().toISOString(), // Auto-verify since admin approved
          })
          .select()
          .single();

        if (userCreateError) {
          throw userCreateError;
        }

        newUser = createdUser;

        // Then create the Profile linked to the User
        const { data: createdProfile, error: profileCreateError } = await db.from('profiles')
          .insert({
            userId: createdUser.id,
            firstName: application.firstName,
            lastName: application.lastName,
            middleName: application.middleName,
            phone: application.phone,
            role: role,
            affiliateStatus: 'APPROVED', // Auto-approve as affiliate
            affiliateApprovedAt: new Date().toISOString(),
          })
          .select()
          .single();

        if (profileCreateError) {
          throw profileCreateError;
        }

        profile = createdProfile;

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

          await db.from('magic_links')
            .insert({
              token: magicLinkToken,
              userId: newUser.id,
              expiresAt: expiresAt.toISOString(),
            });

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
          const magicLinkUrl = `${appUrl}/auth/verify?token=${magicLinkToken}`;

          // Get tracking code if assigned
          const { data: profileWithCode } = await db.from('profiles')
            .select('customTrackingCode')
            .eq('id', profile.id)
            .limit(1);

          const trackingCode = firstOrNull<{ customTrackingCode: string | null }>(profileWithCode);

          await EmailService.sendTaxPreparerWelcomeEmail(
            application.email,
            fullName,
            application.email,
            trackingCode?.customTrackingCode || 'pending',
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
      if (role === 'tax_preparer' && profile) {
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
          const { data: existingFolder } = await db.from('referral_image_sets')
            .select('id')
            .eq('preparerId', profile.id)
            .eq('category', 'preparer')
            .limit(1);

          if (!existingFolder || existingFolder.length === 0) {
            const fullName = [application.firstName, application.lastName].filter(Boolean).join(' ');
            await db.from('referral_image_sets')
              .insert({
                category: 'preparer',
                preparerId: profile.id,
                name: fullName,
                description: `Custom referral images for ${fullName}`,
                isActive: true,
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
      const { data: updatedApplication, error: updateAppError } = await db.from('preparer_applications')
        .update({
          status: 'APPROVED',
          notes: notes || application.notes,
          stage: 'DECISION',
          convertedToRole: role,
          convertedProfileId: profile?.id,
          convertedAt: new Date().toISOString(),
          // Audit fields
          reviewedBy: session.user.id,
          reviewedAt: new Date().toISOString(),
          lastModifiedBy: session.user.id,
          lastModifiedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateAppError) {
        throw updateAppError;
      }

      // Get email from the user relation for response
      let userEmail = application.email;
      if (profile) {
        const { data: userWithEmail } = await db.from('users')
          .select('email')
          .eq('id', profile.userId)
          .limit(1);

        const foundUser = firstOrNull<{ email: string }>(userWithEmail);
        if (foundUser) {
          userEmail = foundUser.email;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Application approved - ${isNewProfile ? 'Created new' : 'Updated existing'} ${role} account`,
        application: updatedApplication,
        profile: {
          id: profile?.id,
          email: userEmail,
          role: profile?.role,
        },
      });
    } else if (action === 'reject') {
      // Update application status to REJECTED with audit fields
      const { data: updatedApplication, error: updateError } = await db.from('preparer_applications')
        .update({
          status: 'REJECTED',
          notes: notes || application.notes,
          // Audit fields
          reviewedBy: session.user.id,
          reviewedAt: new Date().toISOString(),
          lastModifiedBy: session.user.id,
          lastModifiedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

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

    const { error: deleteError } = await db.from('preparer_applications')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

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
