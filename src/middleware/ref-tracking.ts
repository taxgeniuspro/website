/**
 * Ref Parameter Tracking Middleware
 *
 * Captures ?ref={tracking_code} parameters and sets attribution cookies
 * Works for both tracking codes (e.g., 'rh') and short link usernames
 *
 * Used on pages like:
 * - /start-filing/form?ref=rh
 * - /book-appointment?ref=rh
 * - /?ref=rh
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ATTRIBUTION_COOKIE_NAME, ATTRIBUTION_COOKIE_MAX_AGE } from '@/lib/utils/cookie-manager';

/**
 * Ref tracking middleware
 * Runs on every request to check for ref parameter
 */
export async function refTrackingMiddleware(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  const url = new URL(request.url);
  const refParam = url.searchParams.get('ref');

  // If no ref parameter, return response as-is
  if (!refParam) {
    return response;
  }

  try {
    // Check if we already have an attribution cookie
    const existingCookie = request.cookies.get(ATTRIBUTION_COOKIE_NAME);

    // First-touch attribution: don't override existing attribution
    if (existingCookie?.value) {
      logger.info('Attribution cookie already exists, keeping first-touch attribution', {
        ref: refParam,
      });
      return response;
    }

    // Validate ref parameter exists in database (check tracking codes and usernames)
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { shortLinkUsername: refParam },
          { trackingCode: refParam },
          { customTrackingCode: refParam },
        ],
      },
      select: {
        id: true,
        role: true,
        shortLinkUsername: true,
        trackingCode: true,
        customTrackingCode: true,
      },
    });

    if (!profile) {
      logger.warn('Ref parameter has invalid tracking code', { ref: refParam });
      return response;
    }

    // Create attribution cookie data
    const attributionData = {
      referrerUsername: refParam, // Store the exact ref parameter used
      referrerType: profile.role,
      timestamp: Date.now(),
      source: 'ref_param', // Indicate this came from a ref parameter
    };

    // Set attribution cookie (14-day expiry)
    response.cookies.set(ATTRIBUTION_COOKIE_NAME, JSON.stringify(attributionData), {
      httpOnly: false, // Allow client-side access for analytics
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ATTRIBUTION_COOKIE_MAX_AGE,
      path: '/',
    });

    logger.info('Ref attribution cookie set', {
      ref: refParam,
      referrerType: profile.role,
      profileId: profile.id,
    });

    return response;
  } catch (error) {
    logger.error('Error in ref tracking middleware', { error, ref: refParam });
    return response; // Return response even if tracking fails
  }
}
