/**
 * Profile API
 *
 * GET: Fetch user's profile data
 * PATCH: Update user's profile data
 */

import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

/** Profile data interface */
interface Profile {
  id: string;
  userId: string | null;
  role: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  bio: string | null;
  companyName: string | null;
  licenseNo: string | null;
  qrCodeLogoUrl: string | null;
  trackingCode: string | null;
  customTrackingCode: string | null;
  trackingCodeQRUrl: string | null;
  professionalTitle: string | null;
  website: string | null;
  publicAddress: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET: Fetch user's profile
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get profile with all fields needed for marketing - use OR conditions for Supabase Auth compatibility
    const { data: profiles, error } = await db
      .from('profiles')
      .select(
        'id, userId, role, firstName, lastName, middleName, phone, avatarUrl, bio, companyName, licenseNo, qrCodeLogoUrl, trackingCode, customTrackingCode, trackingCodeQRUrl, professionalTitle, website, publicAddress, facebookUrl, instagramUrl, linkedinUrl, twitterUrl, youtubeUrl, tiktokUrl, createdAt, updatedAt'
      )
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`);

    if (error) {
      logger.error('Error fetching profile:', error);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const profile = firstOrNull<Profile>(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    logger.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

/**
 * PATCH: Update user's profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get profile - use OR conditions for Supabase Auth compatibility
    const { data: profiles, error: fetchError } = await db
      .from('profiles')
      .select('id')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`);

    if (fetchError) {
      logger.error('Error fetching profile:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const profile = firstOrNull<{ id: string }>(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields = [
      'firstName',
      'lastName',
      'middleName',
      'phone',
      'bio',
      'companyName',
      'licenseNo',
      'professionalTitle',
      'website',
      'publicAddress',
      // Social media links
      'facebookUrl',
      'instagramUrl',
      'linkedinUrl',
      'twitterUrl',
      'youtubeUrl',
      'tiktokUrl',
    ];

    // Filter out any fields that aren't allowed
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await db
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating profile:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    logger.info(`Profile updated for user ${userId}`, { fields: Object.keys(updateData) });

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    logger.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
