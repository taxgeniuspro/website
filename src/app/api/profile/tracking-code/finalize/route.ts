/**
 * Tracking Code Finalization API
 *
 * POST: Finalize tracking code (permanently lock it)
 */

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { finalizeTrackingCode } from '@/lib/services/tracking-code.service';
import { generateAffiliateStandardLinks } from '@/lib/services/affiliate-links.service';
import { generateTaxPreparerStandardLinks } from '@/lib/services/tax-preparer-links.service';

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
}

/** Profile affiliate data interface */
interface ProfileAffiliateData {
  affiliateStatus: string | null;
}

/** Marketing link interface */
interface MarketingLink {
  id: string;
  code: string;
  url: string;
  shortUrl: string | null;
  title: string | null;
  description: string | null;
  qrCodeImageUrl: string | null;
  targetPage: string | null;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
}

/**
 * POST: Finalize user's tracking code (permanently lock it)
 */
export async function POST() {
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

    // Finalize tracking code
    const result = await finalizeTrackingCode(profile.id, baseUrl);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Auto-generate affiliate links for approved affiliates (any role can be affiliate)
    // Note: affiliateStatus is checked, not role - affiliate is a feature, not a role
    const { data: fullProfileData, error: fullProfileError } = await db
      .from('profiles')
      .select('affiliateStatus')
      .eq('id', profile.id)
      .single();

    if (fullProfileError) {
      logger.error('Error fetching full profile:', fullProfileError);
    }

    const fullProfile = fullProfileData as ProfileAffiliateData | null;

    if (fullProfile?.affiliateStatus === 'APPROVED') {
      try {
        logger.info('Generating affiliate standard links after finalization', {
          profileId: profile.id,
        });
        await generateAffiliateStandardLinks(profile.id);
        logger.info('Affiliate links generated successfully');
      } catch (error) {
        // Don't fail the finalization if link generation fails
        logger.error('Failed to generate affiliate links, but finalization succeeded', {
          error,
          profileId: profile.id,
        });
      }
    }

    // Auto-generate tax preparer links if user is a tax preparer
    if (profile.role === 'tax_preparer') {
      try {
        logger.info('Generating tax preparer standard links after finalization', {
          profileId: profile.id,
        });
        await generateTaxPreparerStandardLinks(profile.id);
        logger.info('Tax preparer links generated successfully');
      } catch (error) {
        // Don't fail the finalization if link generation fails
        logger.error('Failed to generate tax preparer links, but finalization succeeded', {
          error,
          profileId: profile.id,
        });
      }
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

    const profileData = profileDataResult as ProfileTrackingData | null;

    // Fetch all integrated links
    const { data: marketingLinksData, error: linksError } = await db
      .from('marketing_links')
      .select('id, code, url, shortUrl, title, description, qrCodeImageUrl, targetPage, clicks, uniqueClicks, conversions')
      .eq('creatorId', profile.id)
      .order('createdAt', { ascending: true });

    if (linksError) {
      logger.error('Error fetching marketing links:', linksError);
    }

    const marketingLinks = (marketingLinksData || []) as MarketingLink[];

    return NextResponse.json({
      success: true,
      data: {
        trackingCode: profileData?.trackingCode,
        customTrackingCode: profileData?.customTrackingCode,
        trackingCodeChanged: profileData?.trackingCodeChanged || false,
        trackingCodeFinalized: profileData?.trackingCodeFinalized || false,
        trackingCodeQRUrl: profileData?.trackingCodeQRUrl,
        canCustomize: false,
        activeCode: result.data?.code,
        trackingUrl: result.data?.trackingUrl,
      },
      integratedLinks: marketingLinks,
      message: 'Tracking code finalized successfully! Your code is now permanently locked.',
    });
  } catch (error) {
    logger.error('Error finalizing tracking code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
