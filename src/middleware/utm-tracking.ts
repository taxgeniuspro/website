/**
 * UTM Tracking Middleware
 *
 * Extracts UTM parameters from incoming requests and stores them in cookies
 * for attribution tracking throughout the customer journey.
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  extractUTMFromURL,
  hasUTMParameters,
  createUTMAttribution,
  type UTMAttribution,
} from '@/lib/services/utm-tracking.service';
import { UTM_COOKIE_NAME, UTM_COOKIE_MAX_AGE } from '@/lib/utils/cookie-manager';
import { logger } from '@/lib/logger';

/**
 * UTM tracking middleware
 * Runs on every request to check for and store UTM parameters
 */
export function utmTrackingMiddleware(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  const url = new URL(request.url);

  // Check if URL has UTM parameters
  if (hasUTMParameters(url.searchParams)) {
    // Extract UTM parameters
    const utm = extractUTMFromURL(url.searchParams);

    // Check if we already have a UTM cookie
    const existingCookie = request.cookies.get(UTM_COOKIE_NAME);
    let existingAttribution: UTMAttribution | undefined;

    if (existingCookie?.value) {
      try {
        existingAttribution = JSON.parse(existingCookie.value);
      } catch (error) {
        logger.error('Failed to parse existing UTM cookie:', error);
      }
    }

    // Create or update UTM attribution
    const attribution = createUTMAttribution(utm, existingAttribution);

    // Set the cookie with 30-day expiration
    response.cookies.set(UTM_COOKIE_NAME, JSON.stringify(attribution), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: UTM_COOKIE_MAX_AGE,
      path: '/',
    });
  }

  return response;
}
