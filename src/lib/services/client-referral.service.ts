/**
 * Client Referral Service
 *
 * Manages client referral program features:
 * - Generates unique referral codes for clients
 * - Builds personalized referral links
 * - Gets appropriate promotional images based on season/preparer/folderType
 * - Generates social media copy
 * - Sends referral invitation emails
 *
 * Folder Types:
 * - preseason_loans: Dec 1 - Jan 14 (promote pre-season loan products)
 * - tax_season_lead: Jan 15 - Apr 15 (get new leads during tax season)
 * - tax_season_intake: Jan 15 - Apr 15 (get intake form completions)
 * - client_referral: Year-round (clients share to earn referral bonuses)
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { FolderType } from '@prisma/client';

const APP_URL = process.env.NEXTAUTH_URL || 'https://taxgeniuspro.tax';

/**
 * Determine the currently active folder type based on the date
 * - Dec 1 - Jan 14: preseason_loans
 * - Jan 15 - Apr 15: tax_season_lead (default for marketing to new leads)
 * - Rest of year: client_referral (default)
 */
export function getActiveFolderType(context: 'lead' | 'intake' | 'client' = 'lead'): FolderType {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();

  // Dec 1 - Jan 14 = preseason_loans
  if (month === 12 || (month === 1 && day <= 14)) {
    return 'preseason_loans';
  }

  // Jan 15 - Apr 15 = tax_season (lead or intake based on context)
  if ((month === 1 && day >= 15) || month === 2 || month === 3 || (month === 4 && day <= 15)) {
    return context === 'intake' ? 'tax_season_intake' : 'tax_season_lead';
  }

  // Rest of year = client_referral (year-round)
  return 'client_referral';
}

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
 * Build a short referral link
 */
export function buildShortReferralLink(referralCode: string): string {
  return `${APP_URL}/go/${referralCode}`;
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
  folderType: FolderType;
  images: ReferralImage[];
  isDefault: boolean; // true if using fallback default images
}

/**
 * Get the appropriate image set for a preparer and folder type
 *
 * Logic:
 * 1. If preparer has custom images in their folder for the specified type → use those
 * 2. Otherwise → use Tax Genius Default images for that type
 *
 * @param preparerId - The preparer's profile ID (optional)
 * @param folderType - The type of folder to get images from (defaults to auto-detect based on date)
 */
export async function getCurrentImageSet(
  preparerId?: string,
  folderType?: FolderType
): Promise<ReferralImageSetWithImages | null> {
  try {
    // Auto-detect folder type if not specified
    const targetFolderType = folderType || getActiveFolderType();

    // First, try to get preparer-specific images (if preparerId provided)
    if (preparerId) {
      const preparerSet = await prisma.referralImageSet.findFirst({
        where: {
          preparerId,
          folderType: targetFolderType,
          category: 'preparer',
          isActive: true,
        },
        include: {
          images: {
            orderBy: { sortOrder: 'asc' },
            take: 4,
          },
        },
      });

      // Only use preparer folder if it has images
      if (preparerSet && preparerSet.images.length > 0) {
        return {
          id: preparerSet.id,
          name: preparerSet.name,
          category: preparerSet.category,
          folderType: preparerSet.folderType,
          images: preparerSet.images.map((img) => ({
            id: img.id,
            url: img.imageUrl,
            thumbnailUrl: img.thumbnailUrl,
            alt: img.altText,
            platform: img.platform,
          })),
          isDefault: false,
        };
      }
    }

    // Fallback to default Tax Genius folder for the same type
    const defaultSet = await prisma.referralImageSet.findFirst({
      where: {
        category: 'default',
        preparerId: null,
        folderType: targetFolderType,
        isActive: true,
      },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 4,
        },
      },
    });

    if (defaultSet && defaultSet.images.length > 0) {
      return {
        id: defaultSet.id,
        name: defaultSet.name,
        category: defaultSet.category,
        folderType: defaultSet.folderType,
        images: defaultSet.images.map((img) => ({
          id: img.id,
          url: img.imageUrl,
          thumbnailUrl: img.thumbnailUrl,
          alt: img.altText,
          platform: img.platform,
        })),
        isDefault: true,
      };
    }

    return null;
  } catch (error) {
    logger.error('Error getting current image set', { error, preparerId, folderType });
    return null;
  }
}

/**
 * Get client referral images specifically (always uses client_referral folder type)
 */
export async function getClientReferralImages(
  preparerId?: string
): Promise<ReferralImageSetWithImages | null> {
  return getCurrentImageSet(preparerId, 'client_referral');
}

interface ClientReferralInvitationResult {
  id: string;
  referralCode: string;
  referralLink: string;
  shortLink: string;
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
        shortLink: buildShortReferralLink(existing.referralCode),
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

    // Get current image set (specifically client_referral type)
    const imageSet = await getClientReferralImages(preparerId);

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
      shortLink: buildShortReferralLink(invitation.referralCode),
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

/**
 * Resolve a client referral code to full invitation data
 * Used by /go/[code] route to redirect with proper tracking
 */
export async function resolveReferralCode(code: string) {
  try {
    const invitation = await prisma.clientReferralInvitation.findUnique({
      where: { referralCode: code },
      include: {
        preparer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customTrackingCode: true,
          },
        },
        client: {
          select: {
            firstName: true,
          },
        },
      },
    });

    if (!invitation) {
      return null;
    }

    return {
      referralCode: invitation.referralCode,
      referralLink: invitation.referralLink,
      preparerCode: invitation.preparer.customTrackingCode || 'tg',
      preparerName: `${invitation.preparer.firstName} ${invitation.preparer.lastName}`,
      clientName: invitation.client.firstName || 'Friend',
    };
  } catch (error) {
    logger.error('Error resolving referral code', { error, code });
    return null;
  }
}
