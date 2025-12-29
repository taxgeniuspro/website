/**
 * Attribution Service
 *
 * Handles lead attribution with 14-day cookie tracking and cross-device matching
 * Implements first-touch attribution with fallback strategies
 *
 * Attribution Priority:
 * 1. Cookie (100% confidence) - 14-day window
 * 2. Email match in LinkClick (90% confidence)
 * 3. Phone match in LinkClick (85% confidence)
 * 4. Direct (no referrer) (100% confidence)
 *
 * Best Practices Implemented:
 * - First-touch attribution (first referrer wins)
 * - Commission rate locking at lead creation
 * - Cross-device matching via email/phone
 * - Confidence scoring for attribution quality
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getAttributionCookie } from '@/lib/utils/cookie-manager';

// Local type definitions (replacing @prisma/client)
interface ProfileRecord {
  id: string;
  userId?: string | null;
  role?: string | null;
  shortLinkUsername?: string | null;
  trackingCode?: string | null;
  customTrackingCode?: string | null;
  affiliateBondedToPreparerId?: string | null;
}

interface LinkClickRecord {
  id: string;
  linkId: string;
  userEmail?: string | null;
  userPhone?: string | null;
  clickedAt: string;
}

interface MarketingLinkRecord {
  id: string;
  creatorId: string;
  creatorType: string;
  clicks: number;
  uniqueClicks?: number | null;
}

interface AffiliateBondingRecord {
  id: string;
  affiliateId: string;
  preparerId: string;
  isActive: boolean;
  commissionStructure?: CommissionStructure | null;
}

// ============ Types ============

interface CommissionTier {
  count: number;
  rate: number;
}

interface CommissionStructure {
  tier1?: CommissionTier;
  tier2?: CommissionTier;
  tier3?: CommissionTier;
  [key: string]: CommissionTier | undefined;
}

export interface AttributionData {
  referrerUsername: string | null;
  referrerType: string | null;
  attributionMethod: 'cookie' | 'email_match' | 'phone_match' | 'direct';
  attributionConfidence: number;
  attributionCookieId?: string;
  commissionRate?: number;
}

export interface AttributionResult {
  success: boolean;
  attribution: AttributionData;
  error?: string;
}

export interface CommissionRateInfo {
  rate: number;
  source: 'affiliate_bonding' | 'default' | 'preparer_bonus';
}

// ============ Constants ============

const DEFAULT_COMMISSION_RATE = 50.0; // Default $50 per completed return
const ATTRIBUTION_CONFIDENCE = {
  COOKIE: 100,
  EMAIL_MATCH: 90,
  PHONE_MATCH: 85,
  DIRECT: 100,
};

// ============ Attribution Detection ============

/**
 * Get attribution from cookie
 * Primary attribution method - highest confidence
 */
async function getAttributionFromCookie(): Promise<Partial<AttributionData> | null> {
  try {
    const cookie = await getAttributionCookie();

    if (!cookie) {
      return null;
    }

    // Validate referrer exists - check tracking codes and short link username
    // Supabase doesn't support complex OR in same query easily, so we do separate queries
    const { data: profileData } = await db
      .from('profiles')
      .select('id, role, shortLinkUsername, trackingCode, customTrackingCode')
      .or(`shortLinkUsername.eq.${cookie.referrerUsername},trackingCode.eq.${cookie.referrerUsername},customTrackingCode.eq.${cookie.referrerUsername}`)
      .limit(1);

    const profile = firstOrNull(profileData) as ProfileRecord | null;

    if (!profile) {
      logger.warn('Attribution cookie has invalid referrer username', {
        username: cookie.referrerUsername,
      });
      return null;
    }

    return {
      referrerUsername: cookie.referrerUsername,
      referrerType: profile.role,
      attributionMethod: 'cookie',
      attributionConfidence: ATTRIBUTION_CONFIDENCE.COOKIE,
    };
  } catch (error) {
    logger.error('Error getting attribution from cookie', { error });
    return null;
  }
}

/**
 * Get attribution by matching email in LinkClick history
 * Fallback method for cross-device tracking
 */
async function getAttributionByEmail(email: string): Promise<Partial<AttributionData> | null> {
  try {
    // Find most recent LinkClick with this email within 14-day window
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: clickData } = await db
      .from('link_clicks')
      .select('id, linkId')
      .eq('userEmail', email)
      .gte('clickedAt', fourteenDaysAgo)
      .order('clickedAt', { ascending: false })
      .limit(1);

    const linkClick = firstOrNull(clickData) as LinkClickRecord | null;

    if (!linkClick) {
      return null;
    }

    // Get the link
    const { data: linkData } = await db
      .from('marketing_links')
      .select('creatorId, creatorType')
      .eq('id', linkClick.linkId)
      .limit(1);

    const link = firstOrNull(linkData) as MarketingLinkRecord | null;

    if (!link) {
      return null;
    }

    // Get referrer username from profile
    const { data: profileData } = await db
      .from('profiles')
      .select('shortLinkUsername, role')
      .eq('id', link.creatorId)
      .limit(1);

    const profile = firstOrNull(profileData) as ProfileRecord | null;

    if (!profile?.shortLinkUsername) {
      return null;
    }

    return {
      referrerUsername: profile.shortLinkUsername,
      referrerType: link.creatorType,
      attributionMethod: 'email_match',
      attributionConfidence: ATTRIBUTION_CONFIDENCE.EMAIL_MATCH,
    };
  } catch (error) {
    logger.error('Error getting attribution by email', { email, error });
    return null;
  }
}

/**
 * Get attribution by matching phone in LinkClick history
 * Second fallback for cross-device tracking
 */
async function getAttributionByPhone(phone: string): Promise<Partial<AttributionData> | null> {
  try {
    // Normalize phone (remove non-digits)
    const normalizedPhone = phone.replace(/\D/g, '');
    const last10Digits = normalizedPhone.slice(-10);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: clickData } = await db
      .from('link_clicks')
      .select('id, linkId')
      .ilike('userPhone', `%${last10Digits}`)
      .gte('clickedAt', fourteenDaysAgo)
      .order('clickedAt', { ascending: false })
      .limit(1);

    const linkClick = firstOrNull(clickData) as LinkClickRecord | null;

    if (!linkClick) {
      return null;
    }

    // Get the link
    const { data: linkData } = await db
      .from('marketing_links')
      .select('creatorId, creatorType')
      .eq('id', linkClick.linkId)
      .limit(1);

    const link = firstOrNull(linkData) as MarketingLinkRecord | null;

    if (!link) {
      return null;
    }

    const { data: profileData } = await db
      .from('profiles')
      .select('shortLinkUsername, role')
      .eq('id', link.creatorId)
      .limit(1);

    const profile = firstOrNull(profileData) as ProfileRecord | null;

    if (!profile?.shortLinkUsername) {
      return null;
    }

    return {
      referrerUsername: profile.shortLinkUsername,
      referrerType: link.creatorType,
      attributionMethod: 'phone_match',
      attributionConfidence: ATTRIBUTION_CONFIDENCE.PHONE_MATCH,
    };
  } catch (error) {
    logger.error('Error getting attribution by phone', { phone, error });
    return null;
  }
}

// ============ Main Attribution Function ============

/**
 * Determine attribution for a lead
 * Tries multiple methods in order of confidence
 */
export async function getAttribution(email?: string, phone?: string): Promise<AttributionResult> {
  try {
    // Strategy 1: Try cookie (highest confidence)
    const cookieAttr = await getAttributionFromCookie();
    if (cookieAttr) {
      const commissionRate = await getCommissionRate(
        cookieAttr.referrerUsername!,
        cookieAttr.referrerType!
      );

      return {
        success: true,
        attribution: {
          ...cookieAttr,
          commissionRate: commissionRate.rate,
        } as AttributionData,
      };
    }

    // Strategy 2: Try email match
    if (email) {
      const emailAttr = await getAttributionByEmail(email);
      if (emailAttr) {
        const commissionRate = await getCommissionRate(
          emailAttr.referrerUsername!,
          emailAttr.referrerType!
        );

        return {
          success: true,
          attribution: {
            ...emailAttr,
            commissionRate: commissionRate.rate,
          } as AttributionData,
        };
      }
    }

    // Strategy 3: Try phone match
    if (phone) {
      const phoneAttr = await getAttributionByPhone(phone);
      if (phoneAttr) {
        const commissionRate = await getCommissionRate(
          phoneAttr.referrerUsername!,
          phoneAttr.referrerType!
        );

        return {
          success: true,
          attribution: {
            ...phoneAttr,
            commissionRate: commissionRate.rate,
          } as AttributionData,
        };
      }
    }

    // Strategy 4: Direct traffic (no referrer)
    return {
      success: true,
      attribution: {
        referrerUsername: null,
        referrerType: null,
        attributionMethod: 'direct',
        attributionConfidence: ATTRIBUTION_CONFIDENCE.DIRECT,
        commissionRate: 0,
      },
    };
  } catch (error) {
    logger.error('Error determining attribution', { email, phone, error });

    return {
      success: false,
      attribution: {
        referrerUsername: null,
        referrerType: null,
        attributionMethod: 'direct',
        attributionConfidence: 0,
      },
      error: 'Failed to determine attribution',
    };
  }
}

// ============ Commission Rate Management ============

/**
 * Get commission rate for a referrer
 * Checks affiliate bonding for custom rates, falls back to defaults
 */
async function getCommissionRate(
  referrerUsername: string,
  referrerType: string
): Promise<CommissionRateInfo> {
  try {
    // Get referrer profile
    const { data: profileData } = await db
      .from('profiles')
      .select('id, role, affiliateBondedToPreparerId')
      .eq('shortLinkUsername', referrerUsername)
      .limit(1);

    const profile = firstOrNull(profileData) as ProfileRecord | null;

    if (!profile) {
      return { rate: DEFAULT_COMMISSION_RATE, source: 'default' };
    }

    // If client with affiliate access, check for custom commission structure from bonded preparer
    if (profile.role === 'client' && profile.affiliateBondedToPreparerId) {
      const { data: bondingData } = await db
        .from('affiliate_bondings')
        .select('commissionStructure')
        .eq('affiliateId', profile.id)
        .eq('preparerId', profile.affiliateBondedToPreparerId)
        .eq('isActive', true)
        .limit(1);

      const bonding = firstOrNull(bondingData) as AffiliateBondingRecord | null;

      if (bonding?.commissionStructure) {
        // Extract rate from commission structure JSON
        const structure = bonding.commissionStructure as CommissionStructure;

        // For now, use tier1 rate (could be enhanced to track referral count)
        if (structure.tier1?.rate) {
          return { rate: structure.tier1.rate, source: 'affiliate_bonding' };
        }
      }
    }

    // Tax preparers don't earn commission (but tracking still works)
    if (profile.role === 'tax_preparer') {
      return { rate: 0, source: 'preparer_bonus' };
    }

    // Default rate for clients and others
    return { rate: DEFAULT_COMMISSION_RATE, source: 'default' };
  } catch (error) {
    logger.error('Error getting commission rate', { referrerUsername, error });
    return { rate: DEFAULT_COMMISSION_RATE, source: 'default' };
  }
}

// ============ Attribution Persistence ============

/**
 * Save attribution to Lead record
 * Locks commission rate at lead creation (immutable)
 */
export async function saveLeadAttribution(
  leadId: string,
  attribution: AttributionData
): Promise<boolean> {
  try {
    const { error } = await db
      .from('leads')
      .update({
        referrerUsername: attribution.referrerUsername,
        referrerType: attribution.referrerType,
        commissionRate: attribution.commissionRate || 0,
        commissionRateLockedAt: new Date().toISOString(),
        attributionMethod: attribution.attributionMethod,
        attributionConfidence: attribution.attributionConfidence,
      })
      .eq('id', leadId);

    if (error) throw error;

    logger.info('Lead attribution saved', {
      leadId,
      referrerUsername: attribution.referrerUsername,
      commissionRate: attribution.commissionRate,
      method: attribution.attributionMethod,
    });

    return true;
  } catch (error) {
    logger.error('Error saving lead attribution', { leadId, error });
    return false;
  }
}

/**
 * Save attribution to TaxIntakeLead record
 */
export async function saveTaxIntakeAttribution(
  intakeId: string,
  attribution: AttributionData
): Promise<boolean> {
  try {
    const { error } = await db
      .from('tax_intake_leads')
      .update({
        referrerUsername: attribution.referrerUsername,
        referrerType: attribution.referrerType,
        attributionMethod: attribution.attributionMethod,
      })
      .eq('id', intakeId);

    if (error) throw error;

    logger.info('Tax intake attribution saved', {
      intakeId,
      referrerUsername: attribution.referrerUsername,
      method: attribution.attributionMethod,
    });

    return true;
  } catch (error) {
    logger.error('Error saving tax intake attribution', { intakeId, error });
    return false;
  }
}

// ============ Link Click Tracking ============

/**
 * Record link click with email/phone for cross-device matching
 */
export async function recordLinkClick(
  linkId: string,
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    city?: string;
    state?: string;
    userEmail?: string;
    userPhone?: string;
  }
): Promise<void> {
  try {
    await db.from('link_clicks').insert({
      linkId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      referrer: metadata.referrer,
      city: metadata.city,
      state: metadata.state,
      userEmail: metadata.userEmail,
      userPhone: metadata.userPhone,
      clickedAt: new Date().toISOString(),
    });

    // Get current counts and increment
    const { data: linkData } = await db
      .from('marketing_links')
      .select('clicks, uniqueClicks')
      .eq('id', linkId)
      .limit(1);

    const link = firstOrNull(linkData) as MarketingLinkRecord | null;

    if (link) {
      await db
        .from('marketing_links')
        .update({
          clicks: (link.clicks || 0) + 1,
          uniqueClicks: (link.uniqueClicks || 0) + 1,
        })
        .eq('id', linkId);
    }

    logger.info('Link click recorded', { linkId });
  } catch (error) {
    logger.error('Error recording link click', { linkId, error });
  }
}

// ============ Attribution Analytics ============

/**
 * Get attribution statistics for a referrer
 */
export async function getReferrerAttributionStats(referrerUsername: string) {
  try {
    const [{ count: cookieAttribution }, { count: emailAttribution }, { count: phoneAttribution }, { count: totalLeads }] = await Promise.all([
      // Cookie-based attributions
      db
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('referrerUsername', referrerUsername)
        .eq('attributionMethod', 'cookie'),
      // Email-matched attributions
      db
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('referrerUsername', referrerUsername)
        .eq('attributionMethod', 'email_match'),
      // Phone-matched attributions
      db
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('referrerUsername', referrerUsername)
        .eq('attributionMethod', 'phone_match'),
      // Total leads
      db
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('referrerUsername', referrerUsername),
    ]);

    return {
      totalLeads: totalLeads || 0,
      byMethod: {
        cookie: cookieAttribution || 0,
        emailMatch: emailAttribution || 0,
        phoneMatch: phoneAttribution || 0,
      },
      crossDeviceRate:
        totalLeads && totalLeads > 0
          ? (((emailAttribution || 0) + (phoneAttribution || 0)) / totalLeads) * 100
          : 0,
    };
  } catch (error) {
    logger.error('Error getting referrer attribution stats', { referrerUsername, error });
    return null;
  }
}
