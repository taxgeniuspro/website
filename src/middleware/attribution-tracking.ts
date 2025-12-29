/**
 * Attribution Tracking Middleware
 *
 * Handles /lead/{username} and /intake/{username} short link requests
 * Sets 14-day attribution cookies for referral tracking
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ATTRIBUTION_COOKIE_NAME, ATTRIBUTION_COOKIE_MAX_AGE } from '@/lib/utils/cookie-manager';

// Local type definitions
interface ProfileRecord {
  id: string;
  role: string;
  shortLinkUsername?: string | null;
}

interface MarketingLinkRecord {
  id: string;
  creatorId: string;
  slug?: string | null;
  clicks: number;
  uniqueClicks: number;
}

// Route redirects
const ROUTE_REDIRECTS = {
  lead: '/start-filing', // General Lead Form
  intake: '/personal-tax-filing', // Tax Intake Form
};

/**
 * Check if request is a short link (should be handled by this middleware)
 */
export function isShortLinkRequest(pathname: string): boolean {
  return pathname.startsWith('/lead/') || pathname.startsWith('/intake/');
}

/**
 * Attribution tracking middleware
 * Handles /lead/{username} and /intake/{username} routes
 */
export async function attributionTrackingMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  // Only handle short link requests
  if (!isShortLinkRequest(pathname)) {
    return null; // Let main middleware continue
  }

  // Extract type (lead or intake) and username
  const segments = pathname.split('/').filter(Boolean);
  const [type, username] = segments;

  if (!username) {
    logger.warn('Attribution link missing username', { pathname });
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    // Validate username exists in database
    const { data: profileData } = await db
      .from('profiles')
      .select('id, role, shortLinkUsername')
      .eq('shortLinkUsername', username)
      .limit(1);

    const profile = firstOrNull(profileData) as ProfileRecord | null;

    if (!profile) {
      logger.warn('Attribution link has invalid username', { username, type });
      // Redirect to home page for invalid username
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Record link click for analytics (non-blocking)
    recordLinkClick(profile.id, type as 'lead' | 'intake', request).catch((error) => {
      logger.error('Error recording link click (non-blocking)', { error });
    });

    // Create attribution cookie data
    const attributionData = {
      referrerUsername: username,
      referrerType: profile.role,
      timestamp: Date.now(),
      source: type, // 'lead' or 'intake'
    };

    // Set up redirect response
    const redirectUrl = ROUTE_REDIRECTS[type as keyof typeof ROUTE_REDIRECTS] || '/';
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));

    // Set attribution cookie (14-day expiry)
    response.cookies.set(ATTRIBUTION_COOKIE_NAME, JSON.stringify(attributionData), {
      httpOnly: false, // Allow client-side access for analytics
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ATTRIBUTION_COOKIE_MAX_AGE,
      path: '/',
    });

    logger.info('Attribution cookie set', {
      username,
      type,
      redirectUrl,
      referrerType: profile.role,
    });

    return response;
  } catch (error) {
    logger.error('Error handling attribution link', { pathname, error });
    // Fallback: redirect to home page
    return NextResponse.redirect(new URL('/', request.url));
  }
}

/**
 * Record link click for analytics
 */
async function recordLinkClick(
  profileId: string,
  linkType: 'lead' | 'intake',
  request: NextRequest
): Promise<void> {
  try {
    // Check if MarketingLink already exists for this profile and slug
    const { data: existingLinkData } = await db
      .from('marketing_links')
      .select('id, clicks, uniqueClicks')
      .eq('creatorId', profileId)
      .eq('slug', linkType)
      .limit(1);

    const existingLink = firstOrNull(existingLinkData) as MarketingLinkRecord | null;

    let marketingLink: MarketingLinkRecord;

    if (existingLink) {
      // Update existing link
      const { data: updatedLink, error: updateError } = await db
        .from('marketing_links')
        .update({
          clicks: existingLink.clicks + 1,
          uniqueClicks: existingLink.uniqueClicks + 1,
        })
        .eq('id', existingLink.id)
        .select('id, creatorId, slug, clicks, uniqueClicks')
        .single();

      if (updateError) throw updateError;
      marketingLink = updatedLink as MarketingLinkRecord;
    } else {
      // Create new link
      const creatorType = await getCreatorType(profileId);
      const username = await getUsername(profileId);

      const { data: newLink, error: createError } = await db
        .from('marketing_links')
        .insert({
          creatorId: profileId,
          creatorType,
          slug: linkType,
          originalUrl: linkType === 'lead' ? '/start-filing' : '/personal-tax-filing',
          shortUrl: `/${linkType}/${username}`,
          isActive: true,
          clicks: 1,
          uniqueClicks: 1,
          conversions: 0,
          conversionRate: 0,
        })
        .select('id, creatorId, slug, clicks, uniqueClicks')
        .single();

      if (createError) throw createError;
      marketingLink = newLink as MarketingLinkRecord;
    }

    // Record detailed click metadata
    const { error: clickError } = await db
      .from('link_clicks')
      .insert({
        linkId: marketingLink.id,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || null,
        referrer: request.headers.get('referer') || null,
        clickedAt: new Date().toISOString(),
      });

    if (clickError) throw clickError;

    logger.info('Link click recorded', {
      profileId,
      linkType,
      linkId: marketingLink.id,
    });
  } catch (error) {
    logger.error('Error recording link click', { profileId, linkType, error });
    throw error;
  }
}

/**
 * Get client IP address from request headers
 */
function getClientIP(request: NextRequest): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return undefined;
}

/**
 * Get creator type from profile ID
 */
async function getCreatorType(profileId: string): Promise<string> {
  const { data: profileData } = await db
    .from('profiles')
    .select('role')
    .eq('id', profileId)
    .limit(1);

  const profile = firstOrNull(profileData) as { role: string } | null;
  return profile?.role || 'UNKNOWN';
}

/**
 * Get username from profile ID
 */
async function getUsername(profileId: string): Promise<string> {
  const { data: profileData } = await db
    .from('profiles')
    .select('shortLinkUsername')
    .eq('id', profileId)
    .limit(1);

  const profile = firstOrNull(profileData) as { shortLinkUsername?: string | null } | null;
  return profile?.shortLinkUsername || 'unknown';
}
