/**
 * Attribution Tracking Middleware
 *
 * Handles /lead/{username} and /intake/{username} short link requests
 * Sets 14-day attribution cookies for referral tracking
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ATTRIBUTION_COOKIE_NAME, ATTRIBUTION_COOKIE_MAX_AGE } from '@/lib/utils/cookie-manager';

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
    const profile = await prisma.profile.findUnique({
      where: { shortLinkUsername: username },
      select: {
        id: true,
        role: true,
        shortLinkUsername: true,
      },
    });

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
    // Get or create MarketingLink for this profile
    const marketingLink = await prisma.marketingLink.upsert({
      where: {
        creatorId_slug: {
          creatorId: profileId,
          slug: linkType,
        },
      },
      create: {
        creatorId: profileId,
        creatorType: await getCreatorType(profileId),
        slug: linkType,
        originalUrl: linkType === 'lead' ? '/start-filing' : '/personal-tax-filing',
        shortUrl: `/${linkType}/${await getUsername(profileId)}`,
        isActive: true,
        clicks: 1,
        uniqueClicks: 1,
      },
      update: {
        clicks: { increment: 1 },
        uniqueClicks: { increment: 1 },
      },
    });

    // Record detailed click metadata
    await prisma.linkClick.create({
      data: {
        linkId: marketingLink.id,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined,
        referrer: request.headers.get('referer') || undefined,
        clickedAt: new Date(),
      },
    });

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
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { role: true },
  });
  return profile?.role || 'UNKNOWN';
}

/**
 * Get username from profile ID
 */
async function getUsername(profileId: string): Promise<string> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { shortLinkUsername: true },
  });
  return profile?.shortLinkUsername || 'unknown';
}
