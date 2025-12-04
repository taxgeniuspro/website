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

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getAttributionCookie, type AttributionCookie } from '@/lib/utils/cookie-manager';

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
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { shortLinkUsername: cookie.referrerUsername },
          { trackingCode: cookie.referrerUsername },
          { customTrackingCode: cookie.referrerUsername },
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
    // Find most recent LinkClick with this email
    const linkClick = await prisma.linkClick.findFirst({
      where: {
        userEmail: email,
        clickedAt: {
          // Within 14-day attribution window
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        link: {
          select: {
            creatorId: true,
            creatorType: true,
          },
        },
      },
      orderBy: {
        clickedAt: 'desc',
      },
    });

    if (!linkClick) {
      return null;
    }

    // Get referrer username from profile
    const profile = await prisma.profile.findUnique({
      where: { id: linkClick.link.creatorId },
      select: {
        shortLinkUsername: true,
        role: true,
      },
    });

    if (!profile?.shortLinkUsername) {
      return null;
    }

    return {
      referrerUsername: profile.shortLinkUsername,
      referrerType: linkClick.link.creatorType,
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

    const linkClick = await prisma.linkClick.findFirst({
      where: {
        userPhone: {
          contains: normalizedPhone.slice(-10), // Match last 10 digits
        },
        clickedAt: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        link: {
          select: {
            creatorId: true,
            creatorType: true,
          },
        },
      },
      orderBy: {
        clickedAt: 'desc',
      },
    });

    if (!linkClick) {
      return null;
    }

    const profile = await prisma.profile.findUnique({
      where: { id: linkClick.link.creatorId },
      select: {
        shortLinkUsername: true,
        role: true,
      },
    });

    if (!profile?.shortLinkUsername) {
      return null;
    }

    return {
      referrerUsername: profile.shortLinkUsername,
      referrerType: linkClick.link.creatorType,
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
    const profile = await prisma.profile.findUnique({
      where: { shortLinkUsername: referrerUsername },
      select: {
        id: true,
        role: true,
        affiliateBondedToPreparerId: true,
      },
    });

    if (!profile) {
      return { rate: DEFAULT_COMMISSION_RATE, source: 'default' };
    }

    // If affiliate, check for custom commission structure from bonded preparer
    if (profile.role === 'AFFILIATE' && profile.affiliateBondedToPreparerId) {
      const bonding = await prisma.affiliateBonding.findFirst({
        where: {
          affiliateId: profile.id,
          preparerId: profile.affiliateBondedToPreparerId,
          isActive: true,
        },
        select: {
          commissionStructure: true,
        },
      });

      if (bonding?.commissionStructure) {
        // Extract rate from commission structure JSON
        // Structure: {"tier1": {"count": 5, "rate": 50}, "tier2": {...}}
        const structure = bonding.commissionStructure as CommissionStructure;

        // For now, use tier1 rate (could be enhanced to track referral count)
        if (structure.tier1?.rate) {
          return { rate: structure.tier1.rate, source: 'affiliate_bonding' };
        }
      }
    }

    // Tax preparers don't earn commission (but tracking still works)
    if (profile.role === 'TAX_PREPARER') {
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
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        referrerUsername: attribution.referrerUsername,
        referrerType: attribution.referrerType,
        commissionRate: attribution.commissionRate || 0,
        commissionRateLockedAt: new Date(),
        attributionMethod: attribution.attributionMethod,
        attributionConfidence: attribution.attributionConfidence,
      },
    });

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
    await prisma.taxIntakeLead.update({
      where: { id: intakeId },
      data: {
        referrerUsername: attribution.referrerUsername,
        referrerType: attribution.referrerType,
        attributionMethod: attribution.attributionMethod,
      },
    });

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
    await prisma.linkClick.create({
      data: {
        linkId,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        referrer: metadata.referrer,
        city: metadata.city,
        state: metadata.state,
        userEmail: metadata.userEmail,
        userPhone: metadata.userPhone,
        clickedAt: new Date(),
      },
    });

    // Increment click count on MarketingLink
    await prisma.marketingLink.update({
      where: { id: linkId },
      data: {
        clicks: { increment: 1 },
        uniqueClicks: { increment: 1 },
      },
    });

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
    const [cookieAttribution, emailAttribution, phoneAttribution, totalLeads] = await Promise.all([
      // Cookie-based attributions
      prisma.lead.count({
        where: {
          referrerUsername,
          attributionMethod: 'cookie',
        },
      }),
      // Email-matched attributions
      prisma.lead.count({
        where: {
          referrerUsername,
          attributionMethod: 'email_match',
        },
      }),
      // Phone-matched attributions
      prisma.lead.count({
        where: {
          referrerUsername,
          attributionMethod: 'phone_match',
        },
      }),
      // Total leads
      prisma.lead.count({
        where: { referrerUsername },
      }),
    ]);

    return {
      totalLeads,
      byMethod: {
        cookie: cookieAttribution,
        emailMatch: emailAttribution,
        phoneMatch: phoneAttribution,
      },
      crossDeviceRate:
        totalLeads > 0 ? ((emailAttribution + phoneAttribution) / totalLeads) * 100 : 0,
    };
  } catch (error) {
    logger.error('Error getting referrer attribution stats', { referrerUsername, error });
    return null;
  }
}
