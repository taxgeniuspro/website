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

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
type FolderType = 'preseason_loans' | 'tax_season_lead' | 'tax_season_intake' | 'client_referral';

interface ProfileRecord {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  trackingCode?: string | null;
  customTrackingCode?: string | null;
}

interface ReferralImageSetRecord {
  id: string;
  name: string;
  category: string;
  folderType: FolderType;
  preparerId?: string | null;
  isActive: boolean;
}

interface ReferralImageRecord {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  altText: string;
  platform?: string | null;
  sortOrder: number;
  downloadCount: number;
}

interface ClientReferralInvitationRecord {
  id: string;
  clientId: string;
  preparerId: string;
  taxYear: number;
  referralCode: string;
  referralLink: string;
  imageSetId?: string | null;
  sentAt?: string | null;
  emailId?: string | null;
  opened: boolean;
  openedAt?: string | null;
  clicked: boolean;
  clickedAt?: string | null;
}

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
 * Links to the landing page with preparer's ref code
 * Includes r=1 to indicate this is a client referral (shows social proof)
 */
export function buildReferralLink(
  preparerCode: string,
  _clientFirstName: string,
  _referralCode: string
): string {
  return `${APP_URL}/en/landing?ref=${preparerCode}&r=1`;
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
  platform: 'instagram' | 'facebook' | 'sms' | 'twitter' = 'instagram',
  referralLink?: string
): string {
  const link = referralLink || 'https://taxgeniuspro.tax/en/landing';

  const templates: Record<string, string> = {
    instagram: `I just got my taxes done by ${preparerName}. Need cash now — or just want your taxes done right?

They're offering $7,000 in tax advances and the process is super fast.

Use my personal link: ${link}

@taxgeniusig
#TaxGenius #TaxSeason2025 #GetYourRefund #MoneyMoves`,

    facebook: `I just got my taxes done by ${preparerName}. Need cash now — or just want your taxes done right?

They're offering $7,000 in tax advances and the process is super fast.

Use my personal link: ${link}`,

    twitter: `I just got my taxes done by ${preparerName}! Need cash now or taxes done right? $7,000 in advances available! ${link} #TaxGenius #TaxSeason2025`,

    sms: `I just got my taxes done by ${preparerName}. Need cash now — or just want your taxes done right? They're offering $7,000 in tax advances. Use my link: ${link}`,
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
      const { data: preparerSetData } = await db
        .from('referral_image_sets')
        .select('*')
        .eq('preparerId', preparerId)
        .eq('folderType', targetFolderType)
        .eq('category', 'preparer')
        .eq('isActive', true)
        .limit(1);

      const preparerSet = firstOrNull(preparerSetData) as ReferralImageSetRecord | null;

      if (preparerSet) {
        // Get images for this set
        const { data: imagesData } = await db
          .from('referral_images')
          .select('*')
          .eq('imageSetId', preparerSet.id)
          .order('sortOrder', { ascending: true })
          .limit(4);

        const images = (imagesData || []) as ReferralImageRecord[];

        // Only use preparer folder if it has images
        if (images.length > 0) {
          return {
            id: preparerSet.id,
            name: preparerSet.name,
            category: preparerSet.category,
            folderType: preparerSet.folderType,
            images: images.map((img) => ({
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
    }

    // Fallback to default Tax Genius folder for the same type
    const { data: defaultSetData } = await db
      .from('referral_image_sets')
      .select('*')
      .eq('category', 'default')
      .is('preparerId', null)
      .eq('folderType', targetFolderType)
      .eq('isActive', true)
      .limit(1);

    const defaultSet = firstOrNull(defaultSetData) as ReferralImageSetRecord | null;

    if (defaultSet) {
      // Get images for default set
      const { data: defaultImagesData } = await db
        .from('referral_images')
        .select('*')
        .eq('imageSetId', defaultSet.id)
        .order('sortOrder', { ascending: true })
        .limit(4);

      const defaultImages = (defaultImagesData || []) as ReferralImageRecord[];

      if (defaultImages.length > 0) {
        return {
          id: defaultSet.id,
          name: defaultSet.name,
          category: defaultSet.category,
          folderType: defaultSet.folderType,
          images: defaultImages.map((img) => ({
            id: img.id,
            url: img.imageUrl,
            thumbnailUrl: img.thumbnailUrl,
            alt: img.altText,
            platform: img.platform,
          })),
          isDefault: true,
        };
      }
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
    // Check if invitation already exists (composite key lookup)
    const { data: existingData } = await db
      .from('client_referral_invitations')
      .select('*')
      .eq('clientId', clientId)
      .eq('taxYear', taxYear)
      .limit(1);

    const existing = firstOrNull(existingData) as ClientReferralInvitationRecord | null;

    if (existing) {
      return {
        id: existing.id,
        referralCode: existing.referralCode,
        referralLink: existing.referralLink,
        shortLink: buildShortReferralLink(existing.referralCode),
        imageSetId: existing.imageSetId || null,
      };
    }

    // Get client and preparer info
    const { data: clientData } = await db
      .from('profiles')
      .select('firstName')
      .eq('id', clientId)
      .limit(1);

    const { data: preparerData } = await db
      .from('profiles')
      .select('customTrackingCode, trackingCode')
      .eq('id', preparerId)
      .limit(1);

    const client = firstOrNull(clientData) as ProfileRecord | null;
    const preparer = firstOrNull(preparerData) as ProfileRecord | null;

    if (!client || !preparer) {
      logger.error('Client or preparer not found', { clientId, preparerId });
      return null;
    }

    // Generate unique referral code
    let referralCode: string = '';
    let isUnique = false;
    let attempts = 0;

    do {
      referralCode = generateReferralCode();
      const { data: existingCodeData } = await db
        .from('client_referral_invitations')
        .select('id')
        .eq('referralCode', referralCode)
        .limit(1);
      isUnique = !firstOrNull(existingCodeData);
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
    const { data: invitationData, error: createError } = await db
      .from('client_referral_invitations')
      .insert({
        clientId,
        preparerId,
        taxYear,
        referralCode,
        referralLink,
        imageSetId: imageSet?.id || null,
      })
      .select()
      .single();

    if (createError) throw createError;
    const invitation = invitationData as ClientReferralInvitationRecord;

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
      imageSetId: invitation.imageSetId || null,
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
    await db
      .from('client_referral_invitations')
      .update({
        sentAt: new Date().toISOString(),
        emailId: emailId || null,
      })
      .eq('id', invitationId);
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
    await db
      .from('client_referral_invitations')
      .update({
        opened: true,
        openedAt: new Date().toISOString(),
      })
      .eq('referralCode', referralCode);
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
    await db
      .from('client_referral_invitations')
      .update({
        clicked: true,
        clickedAt: new Date().toISOString(),
      })
      .eq('referralCode', referralCode);
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
    // Base query builder
    let totalQuery = db.from('client_referral_invitations').select('id', { count: 'exact', head: true }).eq('preparerId', preparerId);
    let sentQuery = db.from('client_referral_invitations').select('id', { count: 'exact', head: true }).eq('preparerId', preparerId).not('sentAt', 'is', null);
    let openedQuery = db.from('client_referral_invitations').select('id', { count: 'exact', head: true }).eq('preparerId', preparerId).eq('opened', true);
    let clickedQuery = db.from('client_referral_invitations').select('id', { count: 'exact', head: true }).eq('preparerId', preparerId).eq('clicked', true);

    if (taxYear) {
      totalQuery = totalQuery.eq('taxYear', taxYear);
      sentQuery = sentQuery.eq('taxYear', taxYear);
      openedQuery = openedQuery.eq('taxYear', taxYear);
      clickedQuery = clickedQuery.eq('taxYear', taxYear);
    }

    const [totalResult, sentResult, openedResult, clickedResult] = await Promise.all([
      totalQuery,
      sentQuery,
      openedQuery,
      clickedQuery,
    ]);

    const total = totalResult.count || 0;
    const sent = sentResult.count || 0;
    const opened = openedResult.count || 0;
    const clicked = clickedResult.count || 0;

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
    // Get current download count
    const { data: imageData } = await db
      .from('referral_images')
      .select('downloadCount')
      .eq('id', imageId)
      .limit(1);

    const image = firstOrNull(imageData) as ReferralImageRecord | null;
    const currentCount = image?.downloadCount || 0;

    // Increment the count
    await db
      .from('referral_images')
      .update({ downloadCount: currentCount + 1 })
      .eq('id', imageId);

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
    const { data: invitationData } = await db
      .from('client_referral_invitations')
      .select('*')
      .eq('referralCode', code)
      .limit(1);

    const invitation = firstOrNull(invitationData) as ClientReferralInvitationRecord | null;

    if (!invitation) {
      return null;
    }

    // Get preparer info
    const { data: preparerData } = await db
      .from('profiles')
      .select('id, firstName, lastName, customTrackingCode')
      .eq('id', invitation.preparerId)
      .limit(1);

    const preparer = firstOrNull(preparerData) as ProfileRecord | null;

    // Get client info
    const { data: clientData } = await db
      .from('profiles')
      .select('firstName')
      .eq('id', invitation.clientId)
      .limit(1);

    const client = firstOrNull(clientData) as ProfileRecord | null;

    return {
      referralCode: invitation.referralCode,
      referralLink: invitation.referralLink,
      preparerCode: preparer?.customTrackingCode || 'tg',
      preparerName: preparer ? `${preparer.firstName} ${preparer.lastName}` : 'Tax Preparer',
      clientName: client?.firstName || 'Friend',
    };
  } catch (error) {
    logger.error('Error resolving referral code', { error, code });
    return null;
  }
}
