/**
 * Marketing Link Types Configuration
 *
 * Single source of truth for all referral/marketing link types.
 * Defines link suffixes, destinations, and role-based access.
 */

// =============================================================================
// LINK TYPE DEFINITIONS
// =============================================================================

export const LINK_TYPES = {
  LEAD: 'lead',
  INTAKE: 'intake',
  APPOINTMENT: 'appt',
  CASH_ADVANCE: 'advance',
} as const;

export type LinkTypeKey = keyof typeof LINK_TYPES;
export type LinkTypeValue = (typeof LINK_TYPES)[LinkTypeKey];

// =============================================================================
// LINK TYPE CONFIGURATION
// =============================================================================

export interface LinkTypeConfig {
  key: LinkTypeKey;
  suffix: LinkTypeValue;
  targetPage: string;
  buildUrl: (trackingCode: string, baseUrl: string) => string;
  title: string;
  description: string;
  emoji: string;
}

/**
 * Configuration for each link type
 * All links use consistent ?ref={trackingCode} format
 */
export const LINK_TYPE_CONFIGS: Record<LinkTypeValue, LinkTypeConfig> = {
  lead: {
    key: 'LEAD',
    suffix: 'lead',
    targetPage: '/contact',
    buildUrl: (code, base) => `${base}/contact?ref=${code}`,
    title: 'Lead Capture Form',
    description: 'Quick contact form for potential clients',
    emoji: '📝',
  },
  intake: {
    key: 'INTAKE',
    suffix: 'intake',
    targetPage: '/start-filing/form',
    buildUrl: (code, base) => `${base}/start-filing/form?ref=${code}`,
    title: 'Tax Intake Form',
    description: 'Complete tax intake form for clients ready to start',
    emoji: '📋',
  },
  appt: {
    key: 'APPOINTMENT',
    suffix: 'appt',
    targetPage: '/book',
    // FIXED: Now uses ?ref={code} instead of ?preparer={id}
    buildUrl: (code, base) => `${base}/book?ref=${code}`,
    title: 'Book Appointment',
    description: 'Schedule a consultation with a tax professional',
    emoji: '📅',
  },
  advance: {
    key: 'CASH_ADVANCE',
    suffix: 'advance',
    targetPage: '/cash-advance',
    buildUrl: (code, base) => `${base}/cash-advance?ref=${code}`,
    title: 'Preseason Cash Advance',
    description: 'Get up to $7,000 preseason tax advance',
    emoji: '💰',
  },
};

// =============================================================================
// ROLE-BASED LINK SETS
// =============================================================================

/**
 * Which link types each role gets access to
 */
export const ROLE_LINK_SETS: Record<string, LinkTypeValue[]> = {
  TAX_PREPARER: ['lead', 'intake', 'appt', 'advance'], // All 4 links
  CLIENT: ['lead', 'intake'], // 2 links (all clients get these)
  ADMIN: ['lead', 'intake', 'appt', 'advance'], // All 4 links
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the link types available for a given role
 */
export function getLinkTypesForRole(role: string): LinkTypeValue[] {
  const normalizedRole = role.toUpperCase().replace(/-/g, '_');
  return ROLE_LINK_SETS[normalizedRole] || ROLE_LINK_SETS.CLIENT;
}

/**
 * Get configuration for a specific link type
 */
export function getLinkConfig(type: LinkTypeValue): LinkTypeConfig {
  return LINK_TYPE_CONFIGS[type];
}

/**
 * Build a short URL for a link
 */
export function buildShortUrl(trackingCode: string, linkType: LinkTypeValue, baseUrl: string): string {
  return `${baseUrl}/go/${trackingCode}-${linkType}`;
}

/**
 * Build a full destination URL for a link
 */
export function buildDestinationUrl(trackingCode: string, linkType: LinkTypeValue, baseUrl: string): string {
  const config = getLinkConfig(linkType);
  return config.buildUrl(trackingCode, baseUrl);
}

/**
 * Extract link type from a link code (e.g., "gw-lead" -> "lead")
 */
export function extractLinkType(code: string): LinkTypeValue | null {
  const suffix = code.split('-').pop();
  if (suffix && Object.values(LINK_TYPES).includes(suffix as LinkTypeValue)) {
    return suffix as LinkTypeValue;
  }
  return null;
}

/**
 * Extract tracking code from a link code (e.g., "gw-lead" -> "gw")
 */
export function extractTrackingCode(code: string): string {
  const parts = code.split('-');
  // Remove the last part (link type suffix)
  parts.pop();
  return parts.join('-');
}

/**
 * Build a link code from tracking code and link type
 */
export function buildLinkCode(trackingCode: string, linkType: LinkTypeValue): string {
  return `${trackingCode}-${linkType}`;
}

/**
 * Check if a link type is valid
 */
export function isValidLinkType(type: string): type is LinkTypeValue {
  return Object.values(LINK_TYPES).includes(type as LinkTypeValue);
}

/**
 * Get all link types as an array
 */
export function getAllLinkTypes(): LinkTypeValue[] {
  return Object.values(LINK_TYPES);
}
