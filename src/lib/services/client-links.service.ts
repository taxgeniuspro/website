/**
 * Client Links Service
 *
 * Automatically generates two standard tracking links with QR codes for clients:
 * 1. Lead Form Link - Quick contact form for referrals
 * 2. Intake Form Link - Full tax intake form for referrals
 *
 * Unlike affiliates, clients don't need to "finalize" their tracking code -
 * links are auto-generated on first access.
 */

import { prisma } from '@/lib/prisma';
import { generateQRCode } from './qr-code.service';
import { logger } from '@/lib/logger';

const APP_URL = process.env.NEXTAUTH_URL || 'https://taxgeniuspro.tax';

export interface ClientLinks {
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
 * Generate the two standard client referral links with QR codes
 * Auto-generates if they don't exist (no finalization required)
 */
export async function generateClientStandardLinks(profileId: string): Promise<ClientLinks> {
  try {
    logger.info('🔗 Generating client standard links', { profileId });

    // Get profile with tracking code
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        userId: true,
        trackingCode: true,
        customTrackingCode: true,
        qrCodeLogoUrl: true,
        role: true,
      },
    });

    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
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
        creatorType: 'CLIENT',
        linkType: 'QR_CODE',
        code: leadCode,
        url: leadUrl,
        shortUrl: leadShortUrl,
        targetPage: '/contact',
        title: '📝 Referral Contact Form',
        description: 'Share this link with friends to earn referral bonuses',
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
        creatorType: 'CLIENT',
        linkType: 'QR_CODE',
        code: intakeCode,
        url: intakeUrl,
        shortUrl: intakeShortUrl,
        targetPage: '/start-filing/form',
        title: '📋 Referral Tax Form',
        description: 'Share this link with friends who are ready to start their taxes',
        qrCodeImageUrl: intakeQR.dataUrl,
        qrCodeFormat: 'PNG',
        dateActivated: new Date(),
        isActive: true,
      },
    });

    links.push(intakeLink);
    logger.info('✅ Created intake form link', { id: intakeLink.id, code: intakeLink.code });

    logger.info('🎉 Successfully generated client standard links', {
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
    logger.error('❌ Error generating client standard links', { error, profileId });
    throw error;
  }
}

/**
 * Get existing client links for a profile
 * Returns null if links don't exist yet
 */
export async function getClientLinks(profileId: string): Promise<ClientLinks | null> {
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
    logger.error('Error getting client links', { error, profileId });
    return null;
  }
}

/**
 * Get or create client links
 * This is the main function to use - it auto-generates if needed
 */
export async function getOrCreateClientLinks(profileId: string): Promise<ClientLinks> {
  // First try to get existing links
  const existing = await getClientLinks(profileId);
  if (existing) {
    return existing;
  }

  // Generate new links if they don't exist
  return generateClientStandardLinks(profileId);
}
