/**
 * Client Referral Service
 *
 * Manages client referral program features:
 * - Generates unique referral codes for clients
 * - Builds personalized referral links
 * - Gets appropriate promotional images based on season/preparer
 * - Generates social media copy
 * - Sends referral invitation emails
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const APP_URL = process.env.NEXTAUTH_URL || 'https://taxgeniuspro.tax';

/**
 * Generate a unique 7-character referral code
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Build a personalized referral link for a client
 */
export function buildReferralLink(
  preparerCode: string,
  clientFirstName: string,
  referralCode: string
): string {
  const encodedName = encodeURIComponent(clientFirstName);
  return `${APP_URL}/new/?tp=${preparerCode}&cl=${encodedName}&co=${referralCode}`;
}

/**
 * Generate social media copy for a client to share
 */
export function generateSocialMediaCopy(
  preparerName: string,
  platform: 'instagram' | 'facebook' | 'sms' | 'twitter' = 'instagram'
): string {
  const templates: Record<string, string> = {
    instagram: `Just got my taxes done by ${preparerName} at Tax Genius, and the process was smooth as ever! 💼✨ Fast refunds and even faster service. Let ${preparerName} hook you up with a great refund quote in minutes. 💰 Don't wait—get yours done today!
@taxgeniusig
#taxgenius #taxpreparer #refundready #fasttaxes #filetoday`,

    facebook: `Just got my taxes done by ${preparerName} at Tax Genius! The process was smooth and easy. Fast refunds and professional service. Let ${preparerName} help you get a great refund quote in minutes. Don't wait—get yours done today! 💰`,

    twitter: `Just got my taxes done by ${preparerName} @TaxGeniusPro! Fast refunds, smooth process. Get your refund quote today 💰 #taxgenius #refundready`,

    sms: `Hey! I just used Tax Genius for my taxes - super easy and fast refunds. ${preparerName} took care of everything. Use my link to get started:`,
  };

  return templates[platform] || templates.instagram;
}

interface ReferralImage {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  alt: string;
  platform: string | null;
}

interface ReferralImageSetWithImages {
  id: string;
  name: string;
  category: string;
  images: ReferralImage[];
}

/**
 * Get the appropriate image set for a client based on current date and preparer
 * Priority: preparer-custom > tax-season > preseason-loans
 */
export async function getCurrentImageSet(
  preparerId?: string
): Promise<ReferralImageSetWithImages | null> {
  const now = new Date();

  try {
    // First, try to get preparer-specific images
    if (preparerId) {
      const preparerSet = await prisma.referralImageSet.findFirst({
        where: {
          preparerId,
          isActive: true,
          OR: [
            { validFrom: null, validUntil: null },
            {
              validFrom: { lte: now },
              validUntil: { gte: now },
            },
            {
              validFrom: { lte: now },
              validUntil: null,
            },
            {
              validFrom: null,
              validUntil: { gte: now },
            },
          ],
        },
        include: {
          images: {
            orderBy: { sortOrder: 'asc' },
            take: 4,
          },
        },
      });

      if (preparerSet && preparerSet.images.length > 0) {
        return {
          id: preparerSet.id,
          name: preparerSet.name,
          category: preparerSet.category,
          images: preparerSet.images.map((img) => ({
            id: img.id,
            url: img.imageUrl,
            thumbnailUrl: img.thumbnailUrl,
            alt: img.altText,
            platform: img.platform,
          })),
        };
      }
    }

    // Determine if we're in preseason (before Jan 15) or tax season
    const jan15 = new Date(now.getFullYear(), 0, 15); // January 15
    const isPreseason = now < jan15;
    const category = isPreseason ? 'preseason-loans' : 'tax-season';

    // Get the appropriate seasonal set
    const seasonalSet = await prisma.referralImageSet.findFirst({
      where: {
        category,
        preparerId: null, // Company-wide
        isActive: true,
        OR: [
          { validFrom: null, validUntil: null },
          {
            validFrom: { lte: now },
            validUntil: { gte: now },
          },
          {
            validFrom: { lte: now },
            validUntil: null,
          },
          {
            validFrom: null,
            validUntil: { gte: now },
          },
        ],
      },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 4,
        },
      },
    });

    if (seasonalSet && seasonalSet.images.length > 0) {
      return {
        id: seasonalSet.id,
        name: seasonalSet.name,
        category: seasonalSet.category,
        images: seasonalSet.images.map((img) => ({
          id: img.id,
          url: img.imageUrl,
          thumbnailUrl: img.thumbnailUrl,
          alt: img.altText,
          platform: img.platform,
        })),
      };
    }

    // Fallback to any active set
    const fallbackSet = await prisma.referralImageSet.findFirst({
      where: {
        isActive: true,
      },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 4,
        },
      },
    });

    if (fallbackSet && fallbackSet.images.length > 0) {
      return {
        id: fallbackSet.id,
        name: fallbackSet.name,
        category: fallbackSet.category,
        images: fallbackSet.images.map((img) => ({
          id: img.id,
          url: img.imageUrl,
          thumbnailUrl: img.thumbnailUrl,
          alt: img.altText,
          platform: img.platform,
        })),
      };
    }

    return null;
  } catch (error) {
    logger.error('Error getting current image set', { error, preparerId });
    return null;
  }
}

interface ClientReferralInvitationResult {
  id: string;
  referralCode: string;
  referralLink: string;
  imageSetId: string | null;
}

/**
 * Create or get a client referral invitation for a specific tax year
 */
export async function getOrCreateClientReferralInvitation(
  clientId: string,
  preparerId: string,
  taxYear: number
): Promise<ClientReferralInvitationResult | null> {
  try {
    // Check if invitation already exists
    const existing = await prisma.clientReferralInvitation.findUnique({
      where: {
        clientId_taxYear: {
          clientId,
          taxYear,
        },
      },
    });

    if (existing) {
      return {
        id: existing.id,
        referralCode: existing.referralCode,
        referralLink: existing.referralLink,
        imageSetId: existing.imageSetId,
      };
    }

    // Get client and preparer info
    const [client, preparer] = await Promise.all([
      prisma.profile.findUnique({
        where: { id: clientId },
        select: { firstName: true },
      }),
      prisma.profile.findUnique({
        where: { id: preparerId },
        select: { customTrackingCode: true, trackingCode: true },
      }),
    ]);

    if (!client || !preparer) {
      logger.error('Client or preparer not found', { clientId, preparerId });
      return null;
    }

    // Generate unique referral code
    let referralCode: string;
    let isUnique = false;
    let attempts = 0;

    do {
      referralCode = generateReferralCode();
      const existingCode = await prisma.clientReferralInvitation.findUnique({
        where: { referralCode },
      });
      isUnique = !existingCode;
      attempts++;
    } while (!isUnique && attempts < 10);

    if (!isUnique) {
      logger.error('Failed to generate unique referral code after 10 attempts');
      return null;
    }

    // Build referral link
    const preparerCode = preparer.customTrackingCode || preparer.trackingCode || 'tg';
    const clientName = client.firstName || 'Friend';
    const referralLink = buildReferralLink(preparerCode, clientName, referralCode);

    // Get current image set
    const imageSet = await getCurrentImageSet(preparerId);

    // Create the invitation
    const invitation = await prisma.clientReferralInvitation.create({
      data: {
        clientId,
        preparerId,
        taxYear,
        referralCode,
        referralLink,
        imageSetId: imageSet?.id || null,
      },
    });

    logger.info('Created client referral invitation', {
      invitationId: invitation.id,
      clientId,
      preparerId,
      taxYear,
      referralCode,
    });

    return {
      id: invitation.id,
      referralCode: invitation.referralCode,
      referralLink: invitation.referralLink,
      imageSetId: invitation.imageSetId,
    };
  } catch (error) {
    logger.error('Error creating client referral invitation', { error, clientId, preparerId, taxYear });
    return null;
  }
}

/**
 * Mark an invitation as sent
 */
export async function markInvitationSent(
  invitationId: string,
  emailId?: string
): Promise<boolean> {
  try {
    await prisma.clientReferralInvitation.update({
      where: { id: invitationId },
      data: {
        sentAt: new Date(),
        emailId: emailId || null,
      },
    });
    return true;
  } catch (error) {
    logger.error('Error marking invitation as sent', { error, invitationId });
    return false;
  }
}

/**
 * Track email open
 */
export async function trackEmailOpen(referralCode: string): Promise<boolean> {
  try {
    await prisma.clientReferralInvitation.update({
      where: { referralCode },
      data: {
        opened: true,
        openedAt: new Date(),
      },
    });
    return true;
  } catch (error) {
    logger.error('Error tracking email open', { error, referralCode });
    return false;
  }
}

/**
 * Track link click
 */
export async function trackLinkClick(referralCode: string): Promise<boolean> {
  try {
    await prisma.clientReferralInvitation.update({
      where: { referralCode },
      data: {
        clicked: true,
        clickedAt: new Date(),
      },
    });
    return true;
  } catch (error) {
    logger.error('Error tracking link click', { error, referralCode });
    return false;
  }
}

/**
 * Get referral invitation stats for a preparer
 */
export async function getPreparerInvitationStats(preparerId: string, taxYear?: number) {
  try {
    const where: { preparerId: string; taxYear?: number } = { preparerId };
    if (taxYear) {
      where.taxYear = taxYear;
    }

    const [total, sent, opened, clicked] = await Promise.all([
      prisma.clientReferralInvitation.count({ where }),
      prisma.clientReferralInvitation.count({ where: { ...where, sentAt: { not: null } } }),
      prisma.clientReferralInvitation.count({ where: { ...where, opened: true } }),
      prisma.clientReferralInvitation.count({ where: { ...where, clicked: true } }),
    ]);

    return {
      total,
      sent,
      opened,
      clicked,
      openRate: sent > 0 ? (opened / sent) * 100 : 0,
      clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
    };
  } catch (error) {
    logger.error('Error getting preparer invitation stats', { error, preparerId });
    return null;
  }
}

/**
 * Increment download count for an image
 */
export async function incrementImageDownload(imageId: string): Promise<boolean> {
  try {
    await prisma.referralImage.update({
      where: { id: imageId },
      data: {
        downloadCount: { increment: 1 },
      },
    });
    return true;
  } catch (error) {
    logger.error('Error incrementing image download', { error, imageId });
    return false;
  }
}
