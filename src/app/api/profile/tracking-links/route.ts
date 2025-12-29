/**
 * Tracking Links API
 *
 * GET: Get all tracking-integrated links for current user
 */

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

/** Profile data interface */
interface Profile {
  id: string;
  trackingCode: string | null;
  customTrackingCode: string | null;
  trackingCodeFinalized: boolean;
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
  createdAt: string;
}

/**
 * GET: Get all tracking-integrated links
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get profile
    const { data: profiles, error: fetchError } = await db
      .from('profiles')
      .select('id, trackingCode, customTrackingCode, trackingCodeFinalized')
      .eq('userId', userId);

    if (fetchError) {
      logger.error('Error fetching profile:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const profile = firstOrNull<Profile>(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get all marketing links created by this user
    const { data: marketingLinksData, error: linksError } = await db
      .from('marketing_links')
      .select('id, code, url, shortUrl, title, description, qrCodeImageUrl, targetPage, clicks, uniqueClicks, conversions, createdAt')
      .eq('creatorId', profile.id)
      .order('createdAt', { ascending: true });

    if (linksError) {
      logger.error('Error fetching marketing links:', linksError);
      return NextResponse.json({ error: 'Failed to fetch marketing links' }, { status: 500 });
    }

    const marketingLinks = (marketingLinksData || []) as MarketingLink[];

    const activeCode = profile.customTrackingCode || profile.trackingCode;

    return NextResponse.json({
      success: true,
      trackingCode: activeCode,
      isFinalized: profile.trackingCodeFinalized,
      links: marketingLinks,
    });
  } catch (error) {
    logger.error('Error fetching tracking links:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
