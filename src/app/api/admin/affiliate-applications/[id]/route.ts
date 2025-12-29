import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { customAlphabet } from 'nanoid';
import { assignTrackingCodeToUser } from '@/lib/services/tracking-code.service';

// Generate random password
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 16);

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// Local interfaces to replace @prisma/client types
interface Lead {
  id: string;
  type: string;
  status: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  message: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Profile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
  affiliateStatus: string | null;
  affiliateApprovedAt: string | null;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  hashedPassword: string | null;
  emailVerified: string | null;
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

    const { data, error } = await db.from('leads')
      .select('*')
      .eq('id', id)
      .eq('type', 'AFFILIATE')
      .limit(1);

    if (error) {
      throw error;
    }

    const application = firstOrNull<Lead>(data);

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

    const { data: appData, error: appError } = await db.from('leads')
      .select('*')
      .eq('id', id)
      .eq('type', 'AFFILIATE')
      .limit(1);

    if (appError) {
      throw appError;
    }

    const application = firstOrNull<Lead>(appData);

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // Check if user already exists with this email (look up User, not Profile)
      const { data: userData } = await db.from('users')
        .select('*')
        .eq('email', application.email.toLowerCase())
        .limit(1);

      const existingUser = firstOrNull<User>(userData);

      let profile: Profile | null = null;
      let isNewProfile = true;

      if (existingUser) {
        // Get profile for this user
        const { data: profileData } = await db.from('profiles')
          .select('*')
          .eq('userId', existingUser.id)
          .limit(1);

        profile = firstOrNull<Profile>(profileData);
        isNewProfile = !profile;
      }

      if (profile) {
        // User exists, ensure affiliate status is approved
        // Note: 'affiliate' is not a role - it's a status (affiliateStatus)
        const { data: updatedProfileData, error: updateError } = await db.from('profiles')
          .update({
            affiliateStatus: 'APPROVED',
            affiliateApprovedAt: profile.affiliateApprovedAt || new Date().toISOString(),
            // Update name/phone if not already set
            firstName: profile.firstName || application.firstName,
            lastName: profile.lastName || application.lastName,
            phone: profile.phone || application.phone,
          })
          .eq('id', profile.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        profile = updatedProfileData;

        logger.info('Existing user approved as affiliate', {
          profileId: profile.id,
          email: application.email,
          leadId: application.id,
        });
      } else {
        // Create new user account with affiliate status
        // Note: Supabase Auth handles password hashing - we create auth user first
        const tempPassword = nanoid();
        const fullName = [application.firstName, application.lastName].filter(Boolean).join(' ');

        // Create user via Supabase Auth
        const { data: authData, error: authError } = await db.auth.admin.createUser({
          email: application.email.toLowerCase(),
          password: tempPassword,
          email_confirm: true, // Auto-verify since admin approved
          user_metadata: { name: fullName },
        });

        if (authError) {
          throw authError;
        }

        const newUserId = authData.user.id;

        // Create the Profile linked to the User
        const { data: newProfile, error: profileError } = await db.from('profiles')
          .insert({
            userId: newUserId,
            supabaseUserId: newUserId,
            firstName: application.firstName,
            lastName: application.lastName,
            phone: application.phone,
            role: 'client', // Default role (affiliate is a status, not a role)
            affiliateStatus: 'APPROVED',
            affiliateApprovedAt: new Date().toISOString(),
          })
          .select()
          .single();

        if (profileError) {
          throw profileError;
        }

        profile = newProfile;

        logger.info('New user created with affiliate status', {
          userId: newUserId,
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
      const { data: updatedApplication, error: updateLeadError } = await db.from('leads')
        .update({
          status: 'CONTACTED', // Update to appropriate status
          message: notes ? `${application.message || ''}\n\nApproval Notes: ${notes}` : application.message,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateLeadError) {
        throw updateLeadError;
      }

      // Get email from the user relation for response
      const { data: userEmailData } = await db.from('users')
        .select('email')
        .eq('id', profile.userId)
        .limit(1);

      const userWithEmail = firstOrNull<{ email: string }>(userEmailData);

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
      const { data: updatedApplication, error: updateError } = await db.from('leads')
        .update({
          status: 'LOST',
          message: notes ? `${application.message || ''}\n\nRejection Notes: ${notes}` : application.message,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

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

    const { error } = await db.from('leads').delete().eq('id', id);

    if (error) {
      throw error;
    }

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
