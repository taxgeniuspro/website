import { logger } from '@/lib/logger';
/**
 * UTM Tracking Service
 *
 * Handles extraction and persistence of UTM parameters for marketing attribution.
 * Part of Epic 6: Lead Tracking Dashboard Enhancement
 */

export interface UTMParameters {
  source?: string; // utm_source (user_id or campaign)
  medium?: string; // utm_medium (material type: qr_code, poster, flyer, etc)
  campaign?: string; // utm_campaign (campaign name)
  content?: string; // utm_content (material ID)
  term?: string; // utm_term (location/placement)
}

export interface UTMAttribution extends UTMParameters {
  firstTouch: number; // Timestamp of first click
  lastTouch: number; // Timestamp of last interaction
  trackingCode: string; // Unique code for this journey
}

/**
 * Extract UTM parameters from URL search params
 */
export function extractUTMFromURL(searchParams: URLSearchParams): UTMParameters {
  return {
    source: searchParams.get('utm_source') || undefined,
    medium: searchParams.get('utm_medium') || undefined,
    campaign: searchParams.get('utm_campaign') || undefined,
    content: searchParams.get('utm_content') || undefined,
    term: searchParams.get('utm_term') || undefined,
  };
}

/**
 * Check if URL has any UTM parameters
 */
export function hasUTMParameters(searchParams: URLSearchParams): boolean {
  return !!(
    searchParams.get('utm_source') ||
    searchParams.get('utm_medium') ||
    searchParams.get('utm_campaign') ||
    searchParams.get('utm_content') ||
    searchParams.get('utm_term')
  );
}

/**
 * Generate a unique tracking code
 */
export function generateTrackingCode(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `tgp_${timestamp}_${random}`;
}

/**
 * Create UTM attribution object
 */
export function createUTMAttribution(
  utm: UTMParameters,
  existingAttribution?: UTMAttribution
): UTMAttribution {
  const now = Date.now();

  return {
    ...utm,
    firstTouch: existingAttribution?.firstTouch || now,
    lastTouch: now,
    trackingCode: existingAttribution?.trackingCode || generateTrackingCode(),
  };
}

/**
 * Check if UTM attribution is expired (30-day window)
 */
export function isAttributionExpired(attribution: UTMAttribution): boolean {
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  return now - attribution.firstTouch > thirtyDaysInMs;
}

/**
 * Serialize UTM attribution for cookie storage
 */
export function serializeUTMAttribution(attribution: UTMAttribution): string {
  return JSON.stringify(attribution);
}

/**
 * Deserialize UTM attribution from cookie
 */
export function deserializeUTMAttribution(data: string): UTMAttribution | null {
  try {
    const parsed = JSON.parse(data);

    // Validate required fields
    if (!parsed.trackingCode || !parsed.firstTouch || !parsed.lastTouch) {
      return null;
    }

    return parsed as UTMAttribution;
  } catch (error) {
    logger.error('Failed to deserialize UTM attribution:', error);
    return null;
  }
}

/**
 * Build tracking URL with UTM parameters
 */
export function buildTrackingURL(baseUrl: string, utm: UTMParameters): string {
  const url = new URL(baseUrl);

  if (utm.source) url.searchParams.set('utm_source', utm.source);
  if (utm.medium) url.searchParams.set('utm_medium', utm.medium);
  if (utm.campaign) url.searchParams.set('utm_campaign', utm.campaign);
  if (utm.content) url.searchParams.set('utm_content', utm.content);
  if (utm.term) url.searchParams.set('utm_term', utm.term);

  return url.toString();
}

/**
 * Extract ref code from URL (legacy tracking)
 */
export function extractRefCode(searchParams: URLSearchParams): string | undefined {
  return searchParams.get('ref') || undefined;
}
