/**
 * Cookie Manager Utility
 *
 * Handles secure cookie operations for UTM attribution tracking
 * and referrer attribution (14-day cookie for lead tracking)
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement
 */

import { cookies } from 'next/headers';
import type { UTMAttribution } from '../services/utm-tracking.service';
import { logger } from '@/lib/logger';

// ============ UTM Cookie Configuration ============
export const UTM_COOKIE_NAME = '__tgp_utm';
export const UTM_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

// ============ Referrer Attribution Cookie Configuration ============
export const ATTRIBUTION_COOKIE_NAME = 'tg_referrer';
export const ATTRIBUTION_COOKIE_MAX_AGE = 14 * 24 * 60 * 60; // 14 days in seconds

export interface AttributionCookie {
  referrerUsername: string;
  referrerType?: string;
  timestamp: number;
  source?: string; // 'lead' or 'intake'
}

/**
 * Set UTM attribution cookie (server-side)
 */
export async function setUTMCookie(attribution: UTMAttribution): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(UTM_COOKIE_NAME, JSON.stringify(attribution), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: UTM_COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Get UTM attribution from cookie (server-side)
 */
export async function getUTMCookie(): Promise<UTMAttribution | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(UTM_COOKIE_NAME);

  if (!cookie?.value) {
    return null;
  }

  try {
    const attribution = JSON.parse(cookie.value) as UTMAttribution;

    // Validate required fields
    if (!attribution.trackingCode || !attribution.firstTouch || !attribution.lastTouch) {
      return null;
    }

    // Check if expired (30-day window)
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    if (now - attribution.firstTouch > thirtyDaysInMs) {
      return null;
    }

    return attribution;
  } catch (error) {
    logger.error('Failed to parse UTM cookie:', error);
    return null;
  }
}

/**
 * Delete UTM attribution cookie (server-side)
 */
export async function deleteUTMCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(UTM_COOKIE_NAME);
}

/**
 * Client-side: Get UTM attribution from document.cookie
 */
export function getUTMCookieClient(): UTMAttribution | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');
  const utmCookie = cookies.find((c) => c.trim().startsWith(`${UTM_COOKIE_NAME}=`));

  if (!utmCookie) {
    return null;
  }

  try {
    const value = utmCookie.split('=')[1];
    const attribution = JSON.parse(decodeURIComponent(value)) as UTMAttribution;

    // Validate required fields
    if (!attribution.trackingCode || !attribution.firstTouch || !attribution.lastTouch) {
      return null;
    }

    // Check if expired (30-day window)
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    if (now - attribution.firstTouch > thirtyDaysInMs) {
      return null;
    }

    return attribution;
  } catch (error) {
    logger.error('Failed to parse UTM cookie (client):', error);
    return null;
  }
}

/**
 * Client-side: Set UTM attribution via API
 * (Note: Cannot set httpOnly cookies from client, must use API route)
 */
export async function setUTMCookieClient(attribution: UTMAttribution): Promise<boolean> {
  try {
    const response = await fetch('/api/tracking/set-utm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(attribution),
    });

    return response.ok;
  } catch (error) {
    logger.error('Failed to set UTM cookie via API:', error);
    return false;
  }
}

// ============ Referrer Attribution Cookie Functions ============

/**
 * Set referrer attribution cookie (server-side)
 * Used in middleware when user clicks /lead/{username} or /intake/{username}
 */
export async function setAttributionCookie(attribution: AttributionCookie): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ATTRIBUTION_COOKIE_NAME, JSON.stringify(attribution), {
    httpOnly: false, // Allow client-side access for analytics
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ATTRIBUTION_COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Get referrer attribution from cookie (server-side)
 */
export async function getAttributionCookie(): Promise<AttributionCookie | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(ATTRIBUTION_COOKIE_NAME);

  if (!cookie?.value) {
    return null;
  }

  try {
    const attribution = JSON.parse(cookie.value) as AttributionCookie;

    // Validate required fields
    if (!attribution.referrerUsername || !attribution.timestamp) {
      return null;
    }

    // Check if expired (14-day window)
    const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    if (now - attribution.timestamp > fourteenDaysInMs) {
      return null;
    }

    return attribution;
  } catch (error) {
    logger.error('Failed to parse attribution cookie:', error);
    return null;
  }
}

/**
 * Delete referrer attribution cookie (server-side)
 */
export async function deleteAttributionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ATTRIBUTION_COOKIE_NAME);
}

/**
 * Client-side: Get referrer attribution from document.cookie
 */
export function getAttributionCookieClient(): AttributionCookie | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');
  const attrCookie = cookies.find((c) => c.trim().startsWith(`${ATTRIBUTION_COOKIE_NAME}=`));

  if (!attrCookie) {
    return null;
  }

  try {
    const value = attrCookie.split('=')[1];
    const attribution = JSON.parse(decodeURIComponent(value)) as AttributionCookie;

    // Validate required fields
    if (!attribution.referrerUsername || !attribution.timestamp) {
      return null;
    }

    // Check if expired (14-day window)
    const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    if (now - attribution.timestamp > fourteenDaysInMs) {
      return null;
    }

    return attribution;
  } catch (error) {
    logger.error('Failed to parse attribution cookie (client):', error);
    return null;
  }
}

/**
 * Check if attribution cookie is valid
 */
export function isAttributionCookieValid(cookie: AttributionCookie | null): boolean {
  if (!cookie) {
    return false;
  }

  if (!cookie.referrerUsername) {
    return false;
  }

  // Check if expired
  const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  if (now - cookie.timestamp > fourteenDaysInMs) {
    return false;
  }

  return true;
}

/**
 * Get cookie age in days
 */
export function getAttributionCookieAge(cookie: AttributionCookie): number {
  const now = Date.now();
  const ageMs = now - cookie.timestamp;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.floor(ageDays);
}

/**
 * Get days remaining until cookie expires
 */
export function getAttributionCookieDaysRemaining(cookie: AttributionCookie): number {
  const maxAgeDays = 14;
  const currentAge = getAttributionCookieAge(cookie);
  return Math.max(0, maxAgeDays - currentAge);
}
