/**
 * Unified Marketing Links Service
 *
 * Consolidates client-links, tax-preparer-links, and affiliate-links services
 * into a single, role-aware service.
 *
 * This service:
 * - Takes profileId as input
 * - Determines role automatically
 * - Returns appropriate links for that role
 * - Auto-generates missing links with QR codes
 */

import { prisma } from '@/lib/prisma';
import { generateQRCode } from './qr-code.service';
import { logger } from '@/lib/logger';
import {
  LINK_TYPE_CONFIGS,
  getLinkTypesForRole,
  getLinkConfig,
  buildShortUrl,
  buildLinkCode,
  extractLinkType,
  type LinkTypeValue,
} from '@/lib/config/marketing-link-types';

const APP_URL = process.env.NEXTAUTH_URL || 'https://taxgeniuspro.tax';

// =============================================================================
// TYPES
// =============================================================================

export interface MarketingLinkData {
  id: string;
  code: string;
  type: LinkTypeValue;
  url: string;
  shortUrl: string;
  qrCodeDataUrl: string;
  title: string;
  description: string;
  targetPage: string;
  clicks: number;
  uniqueClicks: number;
  leads: number;
  conversions: number;
  isActive: boolean;
}

export interface MarketingLinksResult {
  success: boolean;
  links: MarketingLinkData[];
  trackingCode: string;
  role: string;
  message?: string;
}

export interface GetOrCreateOptions {
  forceRegenerate?: boolean;
  linkTypes?: LinkTypeValue[];
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Get or create marketing links for any profile
 * Automatically determines link types based on role
 */
export async function getOrCreateMarketingLinks(
  profileId: string,
  options?: GetOrCreateOptions
): Promise<MarketingLinksResult> {
  try {
    logger.info('Getting/creating marketing links', { profileId });

    // 1. Get profile with tracking code
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        userId: true,
        role: true,
        trackingCode: true,
        customTrackingCode: true,
        trackingCodeFinalized: true,
        qrCodeLogoUrl: true,
      },
    });

    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    // 2. Resolve tracking code (custom takes precedence)
    const trackingCode = profile.customTrackingCode || profile.trackingCode;
    if (!trackingCode) {
      return {
        success: true,
        links: [],
        trackingCode: '',
        role: profile.role,
        message: 'No tracking code assigned yet',
      };
    }

    // 3. Tax preparers require finalized tracking code
    if (profile.role === 'tax_preparer' && !profile.trackingCodeFinalized) {
      return {
        success: true,
        links: [],
        trackingCode,
        role: profile.role,
        message: 'Tracking code must be finalized before links are available',
      };
    }

    // 4. Determine required link types based on role (or use override)
    const requiredLinkTypes = options?.linkTypes || getLinkTypesForRole(profile.role);

    logger.info('Required link types for role', {
      role: profile.role,
      linkTypes: requiredLinkTypes,
    });

    // 5. Build expected link codes
    const expectedCodes = requiredLinkTypes.map((type) => buildLinkCode(trackingCode, type));

    // 6. Get existing links
    const existingLinks = await prisma.marketingLink.findMany({
      where: {
        creatorId: profileId,
        code: { in: expectedCodes },
      },
    });

    // 7. Identify missing links
    const existingLinkCodes = new Set(existingLinks.map((l) => l.code));
    const missingTypes = requiredLinkTypes.filter(
      (type) => !existingLinkCodes.has(buildLinkCode(trackingCode, type))
    );

    logger.info('Link status', {
      existing: existingLinks.length,
      missing: missingTypes.length,
      missingTypes,
    });

    // 8. Create missing links
    const newLinks = [];
    for (const type of missingTypes) {
      const link = await createMarketingLink(profile, trackingCode, type);
      newLinks.push(link);
    }

    // 9. Combine and format all links
    const allLinks = [...existingLinks, ...newLinks];

    const result: MarketingLinkData[] = allLinks.map((link) => {
      const linkType = extractLinkType(link.code) || 'lead';
      return {
        id: link.id,
        code: link.code,
        type: linkType,
        url: link.url,
        shortUrl: link.shortUrl || '',
        qrCodeDataUrl: link.qrCodeImageUrl || '',
        title: link.title || '',
        description: link.description || '',
        targetPage: link.targetPage,
        clicks: link.clicks,
        uniqueClicks: link.uniqueClicks,
        leads: link.intakeStarts || 0,
        conversions: link.conversions,
        isActive: link.isActive,
      };
    });

    // 10. Sort by link type order (lead, intake, appt, advance)
    result.sort((a, b) => requiredLinkTypes.indexOf(a.type) - requiredLinkTypes.indexOf(b.type));

    logger.info('Successfully returned marketing links', {
      profileId,
      trackingCode,
      linkCount: result.length,
    });

    return {
      success: true,
      links: result,
      trackingCode,
      role: profile.role,
    };
  } catch (error) {
    logger.error('Error in getOrCreateMarketingLinks', { error, profileId });
    throw error;
  }
}

/**
 * Get existing links without creating new ones
 */
export async function getMarketingLinks(profileId: string): Promise<MarketingLinksResult | null> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        role: true,
        trackingCode: true,
        customTrackingCode: true,
      },
    });

    if (!profile) {
      return null;
    }

    const trackingCode = profile.customTrackingCode || profile.trackingCode;
    if (!trackingCode) {
      return null;
    }

    const requiredLinkTypes = getLinkTypesForRole(profile.role);
    const expectedCodes = requiredLinkTypes.map((type) => buildLinkCode(trackingCode, type));

    const links = await prisma.marketingLink.findMany({
      where: {
        creatorId: profileId,
        code: { in: expectedCodes },
      },
    });

    const result: MarketingLinkData[] = links.map((link) => {
      const linkType = extractLinkType(link.code) || 'lead';
      return {
        id: link.id,
        code: link.code,
        type: linkType,
        url: link.url,
        shortUrl: link.shortUrl || '',
        qrCodeDataUrl: link.qrCodeImageUrl || '',
        title: link.title || '',
        description: link.description || '',
        targetPage: link.targetPage,
        clicks: link.clicks,
        uniqueClicks: link.uniqueClicks,
        leads: link.intakeStarts || 0,
        conversions: link.conversions,
        isActive: link.isActive,
      };
    });

    result.sort((a, b) => requiredLinkTypes.indexOf(a.type) - requiredLinkTypes.indexOf(b.type));

    return {
      success: true,
      links: result,
      trackingCode,
      role: profile.role,
    };
  } catch (error) {
    logger.error('Error getting marketing links', { error, profileId });
    return null;
  }
}

/**
 * Regenerate QR codes for all existing links
 */
export async function regenerateQRCodes(profileId: string): Promise<boolean> {
  try {
    logger.info('Regenerating QR codes', { profileId });

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        userId: true,
        trackingCode: true,
        customTrackingCode: true,
        role: true,
      },
    });

    if (!profile) {
      throw new Error('Profile not found');
    }

    const trackingCode = profile.customTrackingCode || profile.trackingCode;
    if (!trackingCode) {
      throw new Error('No tracking code found');
    }

    const requiredLinkTypes = getLinkTypesForRole(profile.role);
    const expectedCodes = requiredLinkTypes.map((type) => buildLinkCode(trackingCode, type));

    const links = await prisma.marketingLink.findMany({
      where: {
        creatorId: profileId,
        code: { in: expectedCodes },
      },
    });

    for (const link of links) {
      const qr = await generateQRCode({
        url: link.shortUrl || link.url,
        materialId: link.code,
        format: 'PNG',
        size: 512,
        userId: profile.userId || undefined,
        withLogo: true,
      });

      await prisma.marketingLink.update({
        where: { id: link.id },
        data: {
          qrCodeImageUrl: qr.dataUrl,
          updatedAt: new Date(),
        },
      });

      logger.info('Regenerated QR code', { linkId: link.id, code: link.code });
    }

    logger.info('Successfully regenerated all QR codes', {
      profileId,
      count: links.length,
    });

    return true;
  } catch (error) {
    logger.error('Error regenerating QR codes', { error, profileId });
    return false;
  }
}

/**
 * Delete all marketing links for a profile
 */
export async function deleteMarketingLinks(profileId: string): Promise<boolean> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        trackingCode: true,
        customTrackingCode: true,
        role: true,
      },
    });

    if (!profile) {
      return false;
    }

    const trackingCode = profile.customTrackingCode || profile.trackingCode;
    if (!trackingCode) {
      return false;
    }

    const requiredLinkTypes = getLinkTypesForRole(profile.role);
    const expectedCodes = requiredLinkTypes.map((type) => buildLinkCode(trackingCode, type));

    await prisma.marketingLink.deleteMany({
      where: {
        creatorId: profileId,
        code: { in: expectedCodes },
      },
    });

    logger.info('Deleted marketing links', { profileId });

    return true;
  } catch (error) {
    logger.error('Error deleting marketing links', { error, profileId });
    return false;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a single marketing link with QR code
 */
async function createMarketingLink(
  profile: {
    id: string;
    userId: string | null;
    role: string;
  },
  trackingCode: string,
  linkType: LinkTypeValue
) {
  const config = getLinkConfig(linkType);
  const code = buildLinkCode(trackingCode, linkType);
  const url = config.buildUrl(trackingCode, APP_URL);
  const shortUrl = buildShortUrl(trackingCode, linkType, APP_URL);

  logger.info(`Creating ${linkType} link`, { code, url });

  // Generate QR code
  const qr = await generateQRCode({
    url: shortUrl,
    materialId: code,
    format: 'PNG',
    size: 512,
    userId: profile.userId || undefined,
    withLogo: true,
  });

  // Create link in database
  const link = await prisma.marketingLink.create({
    data: {
      creatorId: profile.id,
      creatorType: profile.role.toUpperCase().replace(/-/g, '_'),
      linkType: 'QR_CODE',
      code,
      url,
      shortUrl,
      targetPage: config.targetPage,
      title: `${config.emoji} ${config.title}`,
      description: config.description,
      qrCodeImageUrl: qr.dataUrl,
      qrCodeFormat: 'PNG',
      dateActivated: new Date(),
      isActive: true,
    },
  });

  logger.info(`Created ${linkType} link`, { id: link.id, code: link.code });

  return link;
}

/**
 * Get link statistics summary
 */
export async function getLinkStatsSummary(profileId: string): Promise<{
  totalClicks: number;
  totalUniqueClicks: number;
  totalLeads: number;
  totalConversions: number;
}> {
  const result = await getMarketingLinks(profileId);

  if (!result || !result.links.length) {
    return {
      totalClicks: 0,
      totalUniqueClicks: 0,
      totalLeads: 0,
      totalConversions: 0,
    };
  }

  return {
    totalClicks: result.links.reduce((sum, l) => sum + l.clicks, 0),
    totalUniqueClicks: result.links.reduce((sum, l) => sum + l.uniqueClicks, 0),
    totalLeads: result.links.reduce((sum, l) => sum + l.leads, 0),
    totalConversions: result.links.reduce((sum, l) => sum + l.conversions, 0),
  };
}
