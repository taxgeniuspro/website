import { logger } from '@/lib/logger';
/**
 * Tracking Code Integration Utilities
 *
 * Helper functions for integrating universal tracking codes
 * with marketing materials, links, and campaigns.
 */

export interface TrackingParams {
  trackingCode: string;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

/**
 * Build a URL with tracking parameters
 *
 * @param baseUrl - The base URL to add tracking to
 * @param params - Tracking parameters to include
 * @returns URL with tracking parameters
 *
 * @example
 * ```ts
 * const url = buildTrackingUrl('https://taxgeniuspro.tax/start-filing', {
 *   trackingCode: 'TGP-123456',
 *   source: 'flyer',
 *   medium: 'qr-code',
 *   campaign: 'tax-season-2025'
 * })
 * // Result: https://taxgeniuspro.tax/start-filing?ref=TGP-123456&utm_source=flyer&utm_medium=qr-code&utm_campaign=tax-season-2025
 * ```
 */
export function buildTrackingUrl(baseUrl: string, params: TrackingParams): string {
  try {
    const url = new URL(baseUrl);

    // Add tracking code as 'ref' parameter
    url.searchParams.set('ref', params.trackingCode);

    // Add UTM parameters if provided
    if (params.source) url.searchParams.set('utm_source', params.source);
    if (params.medium) url.searchParams.set('utm_medium', params.medium);
    if (params.campaign) url.searchParams.set('utm_campaign', params.campaign);
    if (params.content) url.searchParams.set('utm_content', params.content);
    if (params.term) url.searchParams.set('utm_term', params.term);

    return url.toString();
  } catch (error) {
    logger.error('Error building tracking URL:', error);
    return baseUrl;
  }
}

/**
 * Extract tracking code from URL
 *
 * @param url - URL to extract tracking code from
 * @returns Tracking code if found, null otherwise
 *
 * @example
 * ```ts
 * const code = extractTrackingCode('https://taxgeniuspro.tax/start-filing?ref=TGP-123456')
 * // Result: 'TGP-123456'
 * ```
 */
export function extractTrackingCode(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('ref');
  } catch (error) {
    logger.error('Error extracting tracking code:', error);
    return null;
  }
}

/**
 * Extract all UTM parameters from URL
 *
 * @param url - URL to extract UTM parameters from
 * @returns Object with UTM parameters
 */
export function extractUTMParams(url: string): {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
} {
  try {
    const urlObj = new URL(url);
    return {
      source: urlObj.searchParams.get('utm_source') || undefined,
      medium: urlObj.searchParams.get('utm_medium') || undefined,
      campaign: urlObj.searchParams.get('utm_campaign') || undefined,
      content: urlObj.searchParams.get('utm_content') || undefined,
      term: urlObj.searchParams.get('utm_term') || undefined,
    };
  } catch (error) {
    logger.error('Error extracting UTM params:', error);
    return {};
  }
}

/**
 * Build marketing link URL with tracking
 * Combines MarketingLink.code with universal tracking code
 *
 * @param baseUrl - Base URL for the marketing link
 * @param trackingCode - User's universal tracking code
 * @param linkCode - Marketing link specific code (optional)
 * @param materialType - Type of marketing material
 * @returns Complete tracking URL
 *
 * @example
 * ```ts
 * const url = buildMarketingLinkUrl(
 *   'https://taxgeniuspro.tax/start-filing',
 *   'TGP-123456',
 *   'atlanta-flyer-2025',
 *   'FLYER'
 * )
 * // Result: https://taxgeniuspro.tax/start-filing?ref=TGP-123456&link=atlanta-flyer-2025&utm_medium=flyer
 * ```
 */
export function buildMarketingLinkUrl(
  baseUrl: string,
  trackingCode: string,
  linkCode?: string,
  materialType?: string
): string {
  try {
    const url = new URL(baseUrl);

    // Add universal tracking code
    url.searchParams.set('ref', trackingCode);

    // Add marketing link specific code if provided
    if (linkCode) {
      url.searchParams.set('link', linkCode);
    }

    // Add material type as UTM medium
    if (materialType) {
      const medium = materialType.toLowerCase().replace('_', '-');
      url.searchParams.set('utm_medium', medium);
    }

    return url.toString();
  } catch (error) {
    logger.error('Error building marketing link URL:', error);
    return baseUrl;
  }
}

/**
 * Common marketing material types and their recommended UTM parameters
 */
export const MATERIAL_TYPE_UTM: Record<string, { medium: string; recommendedSource?: string }> = {
  QR_POSTER: { medium: 'qr-code', recommendedSource: 'poster' },
  QR_FLYER: { medium: 'qr-code', recommendedSource: 'flyer' },
  QR_BUSINESS_CARD: { medium: 'qr-code', recommendedSource: 'business-card' },
  QR_TABLE_TENT: { medium: 'qr-code', recommendedSource: 'table-tent' },
  QR_BANNER: { medium: 'qr-code', recommendedSource: 'banner' },
  DIGITAL_AD: { medium: 'digital-ad', recommendedSource: 'online' },
  SOCIAL_MEDIA: { medium: 'social', recommendedSource: 'social-media' },
  EMAIL_CAMPAIGN: { medium: 'email', recommendedSource: 'email-campaign' },
  SMS_LINK: { medium: 'sms', recommendedSource: 'text-message' },
  WEBSITE_REFERRAL: { medium: 'referral', recommendedSource: 'website' },
  LANDING_PAGE: { medium: 'landing-page', recommendedSource: 'organic' },
  BUSINESS_CARD: { medium: 'business-card', recommendedSource: 'networking' },
  FLYER: { medium: 'print', recommendedSource: 'flyer' },
  REFERRAL: { medium: 'referral', recommendedSource: 'word-of-mouth' },
};

/**
 * Get recommended UTM parameters for a material type
 */
export function getRecommendedUTM(materialType: string) {
  return MATERIAL_TYPE_UTM[materialType] || { medium: 'unknown', recommendedSource: 'other' };
}

/**
 * Validate tracking code format
 * Should match the format from tracking-code.service.ts
 */
export function isValidTrackingCodeFormat(code: string): boolean {
  // Auto-generated format: TGP-XXXXXX (6 digits)
  const autoFormat = /^TGP-\d{6}$/;

  // Custom format: 3-20 chars, alphanumeric + hyphens/underscores
  const customFormat = /^[a-zA-Z0-9_-]{3,20}$/;

  return autoFormat.test(code) || customFormat.test(code);
}

/**
 * Track marketing material view (to be called from client-side)
 * Triggers Google Analytics event if window.trackReferralClick is available
 */
export function trackMaterialView(trackingCode: string, materialType: string) {
  if (typeof window !== 'undefined' && window.trackReferralClick) {
    window.trackReferralClick(trackingCode, materialType);
  }
}

/**
 * Track QR code scan (to be called from client-side)
 * Triggers Google Analytics event if window.trackQRScan is available
 */
export function trackQRCodeScan(trackingCode: string, location?: string) {
  if (typeof window !== 'undefined' && window.trackQRScan) {
    window.trackQRScan(trackingCode, location);
  }
}
