/**
 * Affiliate Links Service
 *
 * Automatically generates two standard tracking links with QR codes for affiliates:
 * 1. Lead Form Link - Quick contact form
 * 2. Intake Form Link - Full tax intake form
 */

import { prisma } from '@/lib/prisma';
import { generateQRCode } from './qr-code.service';
import { logger } from '@/lib/logger';

const APP_URL = process.env.NEXTAUTH_URL || 'https://taxgeniuspro.tax';

export interface AffiliateLinks {
  leadLink: {
    id: string;
    code: string;
    url: string;
    shortUrl: string;
    qrCodeDataUrl: string;
    title: string;
  };
  intakeLink: {
    id: string;
    code: string;
    url: string;
    shortUrl: string;
    qrCodeDataUrl: string;
    title: string;
  };
}

/**
 * Generate the two standard affiliate links with QR codes
 */
export async function generateAffiliateStandardLinks(profileId: string): Promise<AffiliateLinks> {
  try {
    logger.info('🔗 Generating affiliate standard links', { profileId });

    // Get profile with tracking code
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        userId: true,
        trackingCode: true,
        customTrackingCode: true,
        trackingCodeFinalized: true,
        qrCodeLogoUrl: true,
        role: true,
      },
    });

    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    if (!profile.trackingCodeFinalized) {
      throw new Error('Tracking code must be finalized before generating affiliate links');
    }

    // Use custom tracking code if available, otherwise use auto-generated
    const trackingCode = profile.customTrackingCode || profile.trackingCode;

    if (!trackingCode) {
      throw new Error('Profile has no tracking code');
    }

    logger.info('📝 Using tracking code', { trackingCode, profileId });

    // Check if links already exist
    const existing = await prisma.marketingLink.findMany({
      where: {
        creatorId: profileId,
        code: {
          in: [`${trackingCode}-lead`, `${trackingCode}-intake`],
        },
      },
    });

    if (existing.length === 2) {
      logger.info('✅ Links already exist, returning existing links', { profileId });

      const leadLink = existing.find((l) => l.code.endsWith('-lead'))!;
      const intakeLink = existing.find((l) => l.code.endsWith('-intake'))!;

      return {
        leadLink: {
          id: leadLink.id,
          code: leadLink.code,
          url: leadLink.url,
          shortUrl: leadLink.shortUrl || '',
          qrCodeDataUrl: leadLink.qrCodeImageUrl || '',
          title: leadLink.title || '',
        },
        intakeLink: {
          id: intakeLink.id,
          code: intakeLink.code,
          url: intakeLink.url,
          shortUrl: intakeLink.shortUrl || '',
          qrCodeDataUrl: intakeLink.qrCodeImageUrl || '',
          title: intakeLink.title || '',
        },
      };
    }

    // Create the two links
    const links = [];

    // 1. Lead Form Link
    const leadCode = `${trackingCode}-lead`;
    const leadUrl = `${APP_URL}/contact?ref=${trackingCode}`;
    const leadShortUrl = `${APP_URL}/go/${leadCode}`;

    logger.info('🎯 Creating lead form link', { leadCode, leadUrl });

    const leadQR = await generateQRCode({
      url: leadShortUrl,
      materialId: leadCode,
      format: 'PNG',
      size: 512,
      userId: profile.userId || undefined,
      withLogo: true,
    });

    const leadLink = await prisma.marketingLink.create({
      data: {
        creatorId: profileId,
        creatorType: 'AFFILIATE',
        linkType: 'QR_CODE',
        code: leadCode,
        url: leadUrl,
        shortUrl: leadShortUrl,
        targetPage: '/contact',
        title: '📝 Lead Capture Form',
        description: 'Quick contact form for potential clients to submit their information',
        qrCodeImageUrl: leadQR.dataUrl,
        qrCodeFormat: 'PNG',
        dateActivated: new Date(),
        isActive: true,
      },
    });

    links.push(leadLink);
    logger.info('✅ Created lead form link', { id: leadLink.id, code: leadLink.code });

    // 2. Intake Form Link
    const intakeCode = `${trackingCode}-intake`;
    const intakeUrl = `${APP_URL}/start-filing/form?ref=${trackingCode}`;
    const intakeShortUrl = `${APP_URL}/go/${intakeCode}`;

    logger.info('🎯 Creating intake form link', { intakeCode, intakeUrl });

    const intakeQR = await generateQRCode({
      url: intakeShortUrl,
      materialId: intakeCode,
      format: 'PNG',
      size: 512,
      userId: profile.userId || undefined,
      withLogo: true,
    });

    const intakeLink = await prisma.marketingLink.create({
      data: {
        creatorId: profileId,
        creatorType: 'AFFILIATE',
        linkType: 'QR_CODE',
        code: intakeCode,
        url: intakeUrl,
        shortUrl: intakeShortUrl,
        targetPage: '/start-filing/form',
        title: '📋 Tax Intake Form',
        description: 'Complete tax intake form for clients ready to start their tax preparation',
        qrCodeImageUrl: intakeQR.dataUrl,
        qrCodeFormat: 'PNG',
        dateActivated: new Date(),
        isActive: true,
      },
    });

    links.push(intakeLink);
    logger.info('✅ Created intake form link', { id: intakeLink.id, code: intakeLink.code });

    logger.info('🎉 Successfully generated affiliate standard links', {
      profileId,
      trackingCode,
      linkCount: links.length,
    });

    return {
      leadLink: {
        id: leadLink.id,
        code: leadLink.code,
        url: leadLink.url,
        shortUrl: leadLink.shortUrl || '',
        qrCodeDataUrl: leadLink.qrCodeImageUrl || '',
        title: leadLink.title || '',
      },
      intakeLink: {
        id: intakeLink.id,
        code: intakeLink.code,
        url: intakeLink.url,
        shortUrl: intakeLink.shortUrl || '',
        qrCodeDataUrl: intakeLink.qrCodeImageUrl || '',
        title: intakeLink.title || '',
      },
    };
  } catch (error) {
    logger.error('❌ Error generating affiliate standard links', { error, profileId });
    throw error;
  }
}

/**
 * Get existing affiliate links for a profile
 */
export async function getAffiliateLinks(profileId: string): Promise<AffiliateLinks | null> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
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

    const links = await prisma.marketingLink.findMany({
      where: {
        creatorId: profileId,
        code: {
          in: [`${trackingCode}-lead`, `${trackingCode}-intake`],
        },
      },
    });

    if (links.length !== 2) {
      return null;
    }

    const leadLink = links.find((l) => l.code.endsWith('-lead'));
    const intakeLink = links.find((l) => l.code.endsWith('-intake'));

    if (!leadLink || !intakeLink) {
      return null;
    }

    return {
      leadLink: {
        id: leadLink.id,
        code: leadLink.code,
        url: leadLink.url,
        shortUrl: leadLink.shortUrl || '',
        qrCodeDataUrl: leadLink.qrCodeImageUrl || '',
        title: leadLink.title || '',
      },
      intakeLink: {
        id: intakeLink.id,
        code: intakeLink.code,
        url: intakeLink.url,
        shortUrl: intakeLink.shortUrl || '',
        qrCodeDataUrl: intakeLink.qrCodeImageUrl || '',
        title: intakeLink.title || '',
      },
    };
  } catch (error) {
    logger.error('Error getting affiliate links', { error, profileId });
    return null;
  }
}

/**
 * Regenerate QR codes for existing affiliate links
 * Useful when logo changes or need to refresh QR codes
 */
export async function regenerateQRCodes(profileId: string): Promise<boolean> {
  try {
    logger.info('🔄 Regenerating QR codes', { profileId });

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        userId: true,
        trackingCode: true,
        customTrackingCode: true,
      },
    });

    if (!profile) {
      throw new Error('Profile not found');
    }

    const trackingCode = profile.customTrackingCode || profile.trackingCode;

    if (!trackingCode) {
      throw new Error('No tracking code found');
    }

    const links = await prisma.marketingLink.findMany({
      where: {
        creatorId: profileId,
        code: {
          in: [`${trackingCode}-lead`, `${trackingCode}-intake`],
        },
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

      logger.info('✅ Regenerated QR code', { linkId: link.id, code: link.code });
    }

    logger.info('🎉 Successfully regenerated all QR codes', { profileId, count: links.length });

    return true;
  } catch (error) {
    logger.error('Error regenerating QR codes', { error, profileId });
    return false;
  }
}

/**
 * Delete affiliate links (for cleanup or regeneration)
 */
export async function deleteAffiliateLinks(profileId: string): Promise<boolean> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        trackingCode: true,
        customTrackingCode: true,
      },
    });

    if (!profile) {
      return false;
    }

    const trackingCode = profile.customTrackingCode || profile.trackingCode;

    if (!trackingCode) {
      return false;
    }

    await prisma.marketingLink.deleteMany({
      where: {
        creatorId: profileId,
        code: {
          in: [`${trackingCode}-lead`, `${trackingCode}-intake`],
        },
      },
    });

    logger.info('🗑️ Deleted affiliate links', { profileId });

    return true;
  } catch (error) {
    logger.error('Error deleting affiliate links', { error, profileId });
    return false;
  }
}
