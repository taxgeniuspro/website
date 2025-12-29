/**
 * Tracking Code API
 *
 * GET: Get current user's tracking code data
 * PATCH: Customize tracking code (one-time only)
 */

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  getUserTrackingCode,
  customizeTrackingCode,
  assignTrackingCodeToUser,
} from '@/lib/services/tracking-code.service';

/** Profile data interface */
interface Profile {
  id: string;
  role: string;
}

/** User data interface */
interface User {
  id: string;
  email: string;
}

/** Profile tracking data interface */
interface ProfileTrackingData {
  trackingCode: string | null;
  customTrackingCode: string | null;
  trackingCodeChanged: boolean;
  trackingCodeFinalized: boolean;
  trackingCodeQRUrl: string | null;
  qrCodeLogoUrl: string | null;
}

/**
 * GET: Get user's current tracking code
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get or create profile - use OR conditions for Supabase Auth compatibility
    const { data: profiles, error: profileError } = await db
      .from('profiles')
      .select('id, role')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`);

    if (profileError) {
      logger.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    let profile = firstOrNull<Profile>(profiles);

    // If profile doesn't exist, create one (auth.ts should have done this, but just in case)
    if (!profile) {
      const { data: users, error: userError } = await db
        .from('users')
        .select('id, email')
        .eq('email', session?.user?.email?.toLowerCase() || '');

      if (userError) {
        logger.error('Error fetching user:', userError);
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
      }

      const dbUser = firstOrNull<User>(users);
      if (dbUser) {
        const { data: newProfile, error: createError } = await db
          .from('profiles')
          .insert({
            userId: dbUser.id,
            supabaseUserId: userId,
            email: session?.user?.email?.toLowerCase() || '',
            role: 'client',
          })
          .select('id, role')
          .single();

        if (createError) {
          logger.error('Error creating profile:', createError);
          return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
        }

        profile = newProfile as Profile;
      }
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    logger.info(`Profile resolved: ${profile.id}`);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

    // Get tracking code data
    let trackingData = await getUserTrackingCode(profile.id, baseUrl);

    // If user doesn't have a tracking code, auto-generate one
    if (!trackingData) {
      logger.info(`Auto-generating tracking code for user ${profile.id}`);
      trackingData = await assignTrackingCodeToUser(profile.id, baseUrl);
    }

    // Get profile data for response
    const { data: profileDataResult, error: profileDataError } = await db
      .from('profiles')
      .select('trackingCode, customTrackingCode, trackingCodeChanged, trackingCodeFinalized, trackingCodeQRUrl, qrCodeLogoUrl')
      .eq('id', profile.id)
      .single();

    if (profileDataError) {
      logger.error('Error fetching profile data:', profileDataError);
      return NextResponse.json({ error: 'Failed to fetch profile data' }, { status: 500 });
    }

    const profileData = profileDataResult as ProfileTrackingData | null;

    return NextResponse.json({
      success: true,
      data: {
        trackingCode: profileData?.trackingCode,
        customTrackingCode: profileData?.customTrackingCode,
        trackingCodeChanged: profileData?.trackingCodeChanged || false,
        trackingCodeFinalized: profileData?.trackingCodeFinalized || false,
        trackingCodeQRUrl: profileData?.trackingCodeQRUrl,
        qrCodeLogoUrl: profileData?.qrCodeLogoUrl,
        canCustomize: !profileData?.trackingCodeFinalized,
        activeCode: trackingData.code,
        trackingUrl: trackingData.trackingUrl,
      },
    });
  } catch (error) {
    logger.error('Error getting tracking code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH: Customize tracking code (one-time only)
 */
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get request body
    const body = await req.json();
    const { customCode } = body;

    if (!customCode || typeof customCode !== 'string') {
      return NextResponse.json(
        { error: 'Custom code is required and must be a string' },
        { status: 400 }
      );
    }

    // Get or create profile - use OR conditions for Supabase Auth compatibility
    const { data: profiles, error: profileError } = await db
      .from('profiles')
      .select('id, role')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`);

    if (profileError) {
      logger.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    let profile = firstOrNull<Profile>(profiles);

    // If profile doesn't exist, create one (auth.ts should have done this, but just in case)
    if (!profile) {
      const { data: users, error: userError } = await db
        .from('users')
        .select('id, email')
        .eq('email', session?.user?.email?.toLowerCase() || '');

      if (userError) {
        logger.error('Error fetching user:', userError);
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
      }

      const dbUser = firstOrNull<User>(users);
      if (dbUser) {
        const { data: newProfile, error: createError } = await db
          .from('profiles')
          .insert({
            userId: dbUser.id,
            supabaseUserId: userId,
            email: session?.user?.email?.toLowerCase() || '',
            role: 'client',
          })
          .select('id, role')
          .single();

        if (createError) {
          logger.error('Error creating profile:', createError);
          return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
        }

        profile = newProfile as Profile;
      }
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    logger.info(`Profile resolved: ${profile.id}`);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

    // Customize tracking code
    const result = await customizeTrackingCode(profile.id, customCode.trim(), baseUrl);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Get updated profile data for response
    const { data: profileDataResult, error: profileDataError } = await db
      .from('profiles')
      .select('trackingCode, customTrackingCode, trackingCodeChanged, trackingCodeFinalized, trackingCodeQRUrl')
      .eq('id', profile.id)
      .single();

    if (profileDataError) {
      logger.error('Error fetching profile data:', profileDataError);
      return NextResponse.json({ error: 'Failed to fetch profile data' }, { status: 500 });
    }

    const profileData = profileDataResult as Omit<ProfileTrackingData, 'qrCodeLogoUrl'> | null;

    return NextResponse.json({
      success: true,
      data: {
        trackingCode: profileData?.trackingCode,
        customTrackingCode: profileData?.customTrackingCode,
        trackingCodeChanged: profileData?.trackingCodeChanged || false,
        trackingCodeFinalized: profileData?.trackingCodeFinalized || false,
        trackingCodeQRUrl: profileData?.trackingCodeQRUrl,
        canCustomize: !profileData?.trackingCodeFinalized,
        activeCode: result.data?.code,
        trackingUrl: result.data?.trackingUrl,
      },
      message: 'Tracking code customized successfully',
    });
  } catch (error) {
    logger.error('Error customizing tracking code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
