/**
 * Tax Preparer Links Service
 *
 * Automatically generates three standard tracking links with QR codes for tax preparers:
 * 1. Lead Form Link - Unified landing page (toggle: advance or filing)
 * 2. Intake Form Link - Full tax intake form
 * 3. Advance Form Link - Cash advance page
 *
 * KEY DIFFERENCE FROM AFFILIATES:
 * - Tax preparer leads are ASSIGNED to the preparer (not corporate)
 * - Tax preparers get FULL ACCESS to client details
 * - Leads become their clients directly
 */

import { db, firstOrNull } from '@/lib/db';
import { generateQRCode } from './qr-code.service';
import { logger } from '@/lib/logger';

const APP_URL = process.env.NEXTAUTH_URL || 'https://taxgeniuspro.tax';

// Local type definitions (replacing @prisma/client)
interface ProfileRecord {
  id: string;
  userId?: string | null;
  trackingCode?: string | null;
  customTrackingCode?: string | null;
  trackingCodeFinalized?: boolean;
  qrCodeLogoUrl?: string | null;
  role?: string | null;
}

interface MarketingLinkRecord {
  id: string;
  code: string;
  url: string;
  shortUrl?: string | null;
  qrCodeImageUrl?: string | null;
  title?: string | null;
  targetPage?: string | null;
}

interface LinkInfo {
  id: string;
  code: string;
  url: string;
  shortUrl: string;
  qrCodeDataUrl: string;
  title: string;
}

export interface TaxPreparerLinks {
  leadLink: LinkInfo;
  intakeLink: LinkInfo;
  advanceLink: LinkInfo;
}

/**
 * Generate the three standard tax preparer links with QR codes
 */
export async function generateTaxPreparerStandardLinks(
  profileId: string
): Promise<TaxPreparerLinks> {
  try {
    logger.info('🔗 Generating tax preparer standard links', { profileId });

    // Get profile with tracking code
    const { data: profileData } = await db
      .from('profiles')
      .select('id, userId, trackingCode, customTrackingCode, trackingCodeFinalized, qrCodeLogoUrl, role')
      .eq('id', profileId)
      .limit(1);

    const profile = firstOrNull(profileData) as ProfileRecord | null;

    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    if (!profile.trackingCodeFinalized) {
      throw new Error('Tracking code must be finalized before generating tax preparer links');
    }

    // Use custom tracking code if available, otherwise use auto-generated
    const trackingCode = profile.customTrackingCode || profile.trackingCode;

    if (!trackingCode) {
      throw new Error('Profile has no tracking code');
    }

    logger.info('📝 Using tracking code', { trackingCode, profileId });

    // Check if all 3 links already exist
    const { data: existingData } = await db
      .from('marketing_links')
      .select('*')
      .eq('creatorId', profileId)
      .in('code', [`${trackingCode}-lead`, `${trackingCode}-intake`, `${trackingCode}-advance`]);

    const existing = (existingData || []) as MarketingLinkRecord[];

    if (existing.length === 3) {
      logger.info('✅ All 3 links already exist, returning existing links', { profileId });

      const leadLink = existing.find((l) => l.code.endsWith('-lead'))!;
      const intakeLink = existing.find((l) => l.code.endsWith('-intake'))!;
      const advanceLink = existing.find((l) => l.code.endsWith('-advance'))!;

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
        advanceLink: {
          id: advanceLink.id,
          code: advanceLink.code,
          url: advanceLink.url,
          shortUrl: advanceLink.shortUrl || '',
          qrCodeDataUrl: advanceLink.qrCodeImageUrl || '',
          title: advanceLink.title || '',
        },
      };
    }

    // Create the three links
    const links = [];

    // 1. Lead Form Link (points to unified landing page)
    const leadCode = `${trackingCode}-lead`;
    const leadUrl = `${APP_URL}/landing?ref=${trackingCode}`;
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

    const { data: leadLinkData, error: leadError } = await db
      .from('marketing_links')
      .insert({
        creatorId: profileId,
        creatorType: 'TAX_PREPARER',
        linkType: 'QR_CODE',
        code: leadCode,
        url: leadUrl,
        shortUrl: leadShortUrl,
        targetPage: '/landing',
        title: '🏠 Landing Page',
        description: 'Unified landing page with cash advance or tax filing options',
        qrCodeImageUrl: leadQR.dataUrl,
        qrCodeFormat: 'PNG',
        dateActivated: new Date().toISOString(),
        isActive: true,
      })
      .select()
      .single();

    if (leadError || !leadLinkData) {
      throw new Error(`Failed to create lead link: ${leadError?.message}`);
    }
    const leadLink = leadLinkData as MarketingLinkRecord;

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

    const { data: intakeLinkData, error: intakeError } = await db
      .from('marketing_links')
      .insert({
        creatorId: profileId,
        creatorType: 'TAX_PREPARER',
        linkType: 'QR_CODE',
        code: intakeCode,
        url: intakeUrl,
        shortUrl: intakeShortUrl,
        targetPage: '/start-filing/form',
        title: '📋 Tax Intake Form',
        description: 'Complete tax intake form for clients ready to start their tax preparation',
        qrCodeImageUrl: intakeQR.dataUrl,
        qrCodeFormat: 'PNG',
        dateActivated: new Date().toISOString(),
        isActive: true,
      })
      .select()
      .single();

    if (intakeError || !intakeLinkData) {
      throw new Error(`Failed to create intake link: ${intakeError?.message}`);
    }
    const intakeLink = intakeLinkData as MarketingLinkRecord;

    links.push(intakeLink);
    logger.info('✅ Created intake form link', { id: intakeLink.id, code: intakeLink.code });

    // 3. Cash Advance Link
    const advanceCode = `${trackingCode}-advance`;
    const advanceUrl = `${APP_URL}/cash-advance?ref=${trackingCode}`;
    const advanceShortUrl = `${APP_URL}/go/${advanceCode}`;

    logger.info('🎯 Creating cash advance link', { advanceCode, advanceUrl });

    const advanceQR = await generateQRCode({
      url: advanceShortUrl,
      materialId: advanceCode,
      format: 'PNG',
      size: 512,
      userId: profile.userId || undefined,
      withLogo: true,
    });

    const { data: advanceLinkData, error: advanceError } = await db
      .from('marketing_links')
      .insert({
        creatorId: profileId,
        creatorType: 'TAX_PREPARER',
        linkType: 'QR_CODE',
        code: advanceCode,
        url: advanceUrl,
        shortUrl: advanceShortUrl,
        targetPage: '/cash-advance',
        title: '💰 Cash Advance',
        description: 'Get up to $7,000 preseason tax advance',
        qrCodeImageUrl: advanceQR.dataUrl,
        qrCodeFormat: 'PNG',
        dateActivated: new Date().toISOString(),
        isActive: true,
      })
      .select()
      .single();

    if (advanceError || !advanceLinkData) {
      throw new Error(`Failed to create advance link: ${advanceError?.message}`);
    }
    const advanceLink = advanceLinkData as MarketingLinkRecord;

    links.push(advanceLink);
    logger.info('✅ Created cash advance link', { id: advanceLink.id, code: advanceLink.code });

    logger.info('🎉 Successfully generated tax preparer standard links', {
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
      advanceLink: {
        id: advanceLink.id,
        code: advanceLink.code,
        url: advanceLink.url,
        shortUrl: advanceLink.shortUrl || '',
        qrCodeDataUrl: advanceLink.qrCodeImageUrl || '',
        title: advanceLink.title || '',
      },
    };
  } catch (error) {
    logger.error('❌ Error generating tax preparer standard links', { error, profileId });
    throw error;
  }
}

/**
 * Get existing tax preparer links for a profile
 */
export async function getTaxPreparerLinks(
  profileId: string
): Promise<TaxPreparerLinks | null> {
  try {
    const { data: profileData } = await db
      .from('profiles')
      .select('trackingCode, customTrackingCode')
      .eq('id', profileId)
      .limit(1);

    const profile = firstOrNull(profileData) as ProfileRecord | null;

    if (!profile) {
      return null;
    }

    const trackingCode = profile.customTrackingCode || profile.trackingCode;

    if (!trackingCode) {
      return null;
    }

    const { data: linksData } = await db
      .from('marketing_links')
      .select('*')
      .eq('creatorId', profileId)
      .in('code', [`${trackingCode}-lead`, `${trackingCode}-intake`, `${trackingCode}-advance`]);

    const links = (linksData || []) as MarketingLinkRecord[];

    if (links.length !== 3) {
      return null;
    }

    const leadLink = links.find((l) => l.code.endsWith('-lead'));
    const intakeLink = links.find((l) => l.code.endsWith('-intake'));
    const advanceLink = links.find((l) => l.code.endsWith('-advance'));

    if (!leadLink || !intakeLink || !advanceLink) {
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
      advanceLink: {
        id: advanceLink.id,
        code: advanceLink.code,
        url: advanceLink.url,
        shortUrl: advanceLink.shortUrl || '',
        qrCodeDataUrl: advanceLink.qrCodeImageUrl || '',
        title: advanceLink.title || '',
      },
    };
  } catch (error) {
    logger.error('Error getting tax preparer links', { error, profileId });
    return null;
  }
}

/**
 * Regenerate QR codes for existing tax preparer links
 * Useful when logo changes or need to refresh QR codes
 */
export async function regenerateTaxPreparerQRCodes(profileId: string): Promise<boolean> {
  try {
    logger.info('🔄 Regenerating QR codes for tax preparer', { profileId });

    const { data: profileData } = await db
      .from('profiles')
      .select('userId, trackingCode, customTrackingCode')
      .eq('id', profileId)
      .limit(1);

    const profile = firstOrNull(profileData) as ProfileRecord | null;

    if (!profile) {
      throw new Error('Profile not found');
    }

    const trackingCode = profile.customTrackingCode || profile.trackingCode;

    if (!trackingCode) {
      throw new Error('No tracking code found');
    }

    const { data: linksData } = await db
      .from('marketing_links')
      .select('*')
      .eq('creatorId', profileId)
      .in('code', [`${trackingCode}-lead`, `${trackingCode}-intake`, `${trackingCode}-advance`]);

    const links = (linksData || []) as MarketingLinkRecord[];

    for (const link of links) {
      const qr = await generateQRCode({
        url: link.shortUrl || link.url,
        materialId: link.code,
        format: 'PNG',
        size: 512,
        userId: profile.userId || undefined,
        withLogo: true,
      });

      await db
        .from('marketing_links')
        .update({
          qrCodeImageUrl: qr.dataUrl,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', link.id);

      logger.info('✅ Regenerated QR code', { linkId: link.id, code: link.code });
    }

    logger.info('🎉 Successfully regenerated all QR codes for tax preparer', {
      profileId,
      count: links.length,
    });

    return true;
  } catch (error) {
    logger.error('Error regenerating QR codes for tax preparer', { error, profileId });
    return false;
  }
}

/**
 * Delete tax preparer links (for cleanup or regeneration)
 */
export async function deleteTaxPreparerLinks(profileId: string): Promise<boolean> {
  try {
    const { data: profileData } = await db
      .from('profiles')
      .select('trackingCode, customTrackingCode')
      .eq('id', profileId)
      .limit(1);

    const profile = firstOrNull(profileData) as ProfileRecord | null;

    if (!profile) {
      return false;
    }

    const trackingCode = profile.customTrackingCode || profile.trackingCode;

    if (!trackingCode) {
      return false;
    }

    await db
      .from('marketing_links')
      .delete()
      .eq('creatorId', profileId)
      .in('code', [`${trackingCode}-lead`, `${trackingCode}-intake`, `${trackingCode}-advance`]);

    logger.info('🗑️ Deleted tax preparer links', { profileId });

    return true;
  } catch (error) {
    logger.error('Error deleting tax preparer links', { error, profileId });
    return false;
  }
}
