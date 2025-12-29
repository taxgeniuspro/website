/**
 * Short Link Service
 *
 * Creates memorable, trackable short links (like Bitly) for marketing.
 * Integrates with Universal Tracking Code system and Google Analytics.
 *
 * User Flow:
 * 1. User creates short link: "johnatlanta"
 * 2. System generates: taxgeniuspro.tax/go/johnatlanta
 * 3. Link redirects to form with tracking: ?ref=TGP-123456&link=johnatlanta
 * 4. Google Analytics tracks clicks, leads, conversions
 */

import { db, firstOrNull } from '@/lib/db';
import { getUserTrackingCode } from './tracking-code.service';
import { generateTrackingQRCode } from './tracking-code.service';
import { buildTrackingUrl } from '@/lib/utils/tracking-integration';

// Local types (replacing @prisma/client)
interface Profile {
  id: string;
  role: string;
}

interface MarketingLink {
  id: string;
  creatorId: string;
  creatorType: string;
  linkType: string;
  code: string;
  url: string;
  shortUrl?: string | null;
  targetPage: string;
  title?: string | null;
  description?: string | null;
  campaign?: string | null;
  qrCodeImageUrl?: string | null;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  intakeStarts?: number | null;
  returnsFiled: number;
  isActive: boolean;
  createdAt: string;
}

interface LinkClick {
  id: string;
  clickedAt: string;
  ipAddress?: string | null;
  city?: string | null;
  state?: string | null;
  converted: boolean;
}

export interface ShortLinkDestination {
  type: 'INTAKE_FORM' | 'CONTACT_FORM' | 'BOOK_APPOINTMENT' | 'CUSTOM';
  customUrl?: string;
}

export interface CreateShortLinkParams {
  profileId: string;
  shortCode: string;
  destination: ShortLinkDestination;
  title?: string;
  description?: string;
  campaign?: string;
}

export interface ShortLinkData {
  id: string;
  shortCode: string;
  shortUrl: string;
  fullUrl: string;
  destination: string;
  title: string | null;
  description: string | null;
  qrCodeUrl: string | null;
  clicks: number;
  leads: number;
  conversions: number;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Destination URLs for short links
 */
const DESTINATION_URLS: Record<string, string> = {
  INTAKE_FORM: '/start-filing/form',
  CONTACT_FORM: '/contact',
  BOOK_APPOINTMENT: '/book-appointment',
};

/**
 * Validate short code format
 *
 * Rules:
 * - 3-30 characters
 * - Letters, numbers, hyphens only
 * - Must start with letter
 * - Cannot be reserved words
 */
export function validateShortCode(code: string): { valid: boolean; error?: string } {
  // Must be 3-30 characters
  if (code.length < 3) {
    return { valid: false, error: 'Short code must be at least 3 characters' };
  }

  if (code.length > 30) {
    return { valid: false, error: 'Short code must be 30 characters or less' };
  }

  // Must start with a letter
  if (!/^[a-zA-Z]/.test(code)) {
    return { valid: false, error: 'Short code must start with a letter' };
  }

  // Only letters, numbers, and hyphens
  if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(code)) {
    return { valid: false, error: 'Short code can only contain letters, numbers, and hyphens' };
  }

  // Cannot end with hyphen
  if (code.endsWith('-')) {
    return { valid: false, error: 'Short code cannot end with a hyphen' };
  }

  // Reserved words
  const reserved = [
    'admin',
    'api',
    'app',
    'auth',
    'dashboard',
    'go',
    'login',
    'signup',
    'settings',
    'help',
    'support',
    'about',
    'contact',
    'terms',
    'privacy',
    'blog',
    'store',
    'services',
    'start-filing',
    'account',
  ];

  if (reserved.includes(code.toLowerCase())) {
    return { valid: false, error: 'This short code is reserved' };
  }

  return { valid: true };
}

/**
 * Check if short code is available
 */
export async function isShortCodeAvailable(code: string): Promise<boolean> {
  const { data: existing } = await db
    .from('marketing_links')
    .select('id')
    .eq('code', code.toLowerCase())
    .limit(1);

  return !existing || existing.length === 0;
}

/**
 * Create a short link for marketing
 *
 * This creates a MarketingLink entry with a memorable short code
 * that redirects to the destination with tracking parameters.
 */
export async function createShortLink(params: CreateShortLinkParams): Promise<ShortLinkData> {
  const { profileId, shortCode, destination, title, description, campaign } = params;

  // Normalize short code
  const normalizedCode = shortCode.toLowerCase().trim();

  // Validate format
  const validation = validateShortCode(normalizedCode);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Check availability
  const available = await isShortCodeAvailable(normalizedCode);
  if (!available) {
    throw new Error('This short code is already taken');
  }

  // Get user's tracking code
  const trackingData = await getUserTrackingCode(profileId);
  if (!trackingData) {
    throw new Error('User tracking code not found');
  }

  // Get creator profile info
  const { data: profiles } = await db
    .from('profiles')
    .select('role')
    .eq('id', profileId)
    .limit(1);

  const profile = firstOrNull(profiles) as Profile | null;

  if (!profile) {
    throw new Error('Profile not found');
  }

  // Determine destination URL
  const targetPage =
    destination.type === 'CUSTOM'
      ? destination.customUrl || '/'
      : DESTINATION_URLS[destination.type];

  // Build full URL with tracking
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
  const fullUrl = buildTrackingUrl(`${baseUrl}${targetPage}`, {
    trackingCode: trackingData.code,
    source: 'short-link',
    medium: 'referral',
    campaign: campaign || 'short-link-campaign',
    content: normalizedCode,
  });

  // Add link code parameter
  const urlWithLink = `${fullUrl}&link=${normalizedCode}`;

  // Generate QR code
  const qrCodeResult = await generateTrackingQRCode(normalizedCode, profileId, baseUrl);

  // Determine link type based on destination
  const linkTypeMap: Record<string, string> = {
    INTAKE_FORM: 'LANDING_PAGE',
    CONTACT_FORM: 'REFERRAL',
    BOOK_APPOINTMENT: 'LANDING_PAGE',
    CUSTOM: 'CUSTOM',
  };

  // Create MarketingLink
  const { data: link } = await db
    .from('marketing_links')
    .insert({
      creatorId: profileId,
      creatorType: profile.role,
      linkType: linkTypeMap[destination.type] || 'CUSTOM',
      code: normalizedCode,
      url: urlWithLink,
      shortUrl: `${baseUrl}/go/${normalizedCode}`,
      title: title || `Short Link: ${normalizedCode}`,
      description: description || null,
      campaign: campaign || 'short-link-campaign',
      targetPage,
      qrCodeImageUrl: qrCodeResult.dataUrl,
      isActive: true,
    })
    .select()
    .single();

  const createdLink = link as MarketingLink;

  return {
    id: createdLink.id,
    shortCode: normalizedCode,
    shortUrl: `${baseUrl}/go/${normalizedCode}`,
    fullUrl: urlWithLink,
    destination: targetPage,
    title: createdLink.title || null,
    description: createdLink.description || null,
    qrCodeUrl: createdLink.qrCodeImageUrl || null,
    clicks: createdLink.clicks || 0,
    leads: createdLink.conversions || 0,
    conversions: createdLink.returnsFiled || 0,
    isActive: createdLink.isActive,
    createdAt: new Date(createdLink.createdAt),
  };
}

/**
 * Get all short links for a user
 */
export async function getUserShortLinks(profileId: string): Promise<ShortLinkData[]> {
  const { data: links } = await db
    .from('marketing_links')
    .select('*')
    .eq('creatorId', profileId)
    .order('createdAt', { ascending: false });

  if (!links) {
    return [];
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

  return links.map((link: MarketingLink) => ({
    id: link.id,
    shortCode: link.code,
    shortUrl: link.shortUrl || `${baseUrl}/go/${link.code}`,
    fullUrl: link.url,
    destination: link.targetPage,
    title: link.title || null,
    description: link.description || null,
    qrCodeUrl: link.qrCodeImageUrl || null,
    clicks: link.clicks || 0,
    leads: link.conversions || 0,
    conversions: link.returnsFiled || 0,
    isActive: link.isActive,
    createdAt: new Date(link.createdAt),
  }));
}

/**
 * Get short link by code
 */
export async function getShortLinkByCode(code: string): Promise<ShortLinkData | null> {
  const { data: links } = await db
    .from('marketing_links')
    .select('*')
    .eq('code', code.toLowerCase())
    .limit(1);

  const link = firstOrNull(links) as MarketingLink | null;

  if (!link) {
    return null;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

  return {
    id: link.id,
    shortCode: link.code,
    shortUrl: link.shortUrl || `${baseUrl}/go/${link.code}`,
    fullUrl: link.url,
    destination: link.targetPage,
    title: link.title || null,
    description: link.description || null,
    qrCodeUrl: link.qrCodeImageUrl || null,
    clicks: link.clicks || 0,
    leads: link.conversions || 0,
    conversions: link.returnsFiled || 0,
    isActive: link.isActive,
    createdAt: new Date(link.createdAt),
  };
}

/**
 * Update short link
 */
export async function updateShortLink(
  code: string,
  profileId: string,
  updates: {
    title?: string;
    description?: string;
    isActive?: boolean;
  }
): Promise<ShortLinkData> {
  // Verify ownership
  const { data: links } = await db
    .from('marketing_links')
    .select('*')
    .eq('code', code.toLowerCase())
    .limit(1);

  const link = firstOrNull(links) as MarketingLink | null;

  if (!link) {
    throw new Error('Short link not found');
  }

  if (link.creatorId !== profileId) {
    throw new Error('You do not have permission to update this link');
  }

  // Update link
  const { data: updatedLinks } = await db
    .from('marketing_links')
    .update({
      title: updates.title,
      description: updates.description,
      isActive: updates.isActive,
    })
    .eq('code', code.toLowerCase())
    .select()
    .single();

  const updated = updatedLinks as MarketingLink;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

  return {
    id: updated.id,
    shortCode: updated.code,
    shortUrl: updated.shortUrl || `${baseUrl}/go/${updated.code}`,
    fullUrl: updated.url,
    destination: updated.targetPage,
    title: updated.title || null,
    description: updated.description || null,
    qrCodeUrl: updated.qrCodeImageUrl || null,
    clicks: updated.clicks || 0,
    leads: updated.conversions || 0,
    conversions: updated.returnsFiled || 0,
    isActive: updated.isActive,
    createdAt: new Date(updated.createdAt),
  };
}

/**
 * Delete short link
 */
export async function deleteShortLink(code: string, profileId: string): Promise<void> {
  // Verify ownership
  const { data: links } = await db
    .from('marketing_links')
    .select('*')
    .eq('code', code.toLowerCase())
    .limit(1);

  const link = firstOrNull(links) as MarketingLink | null;

  if (!link) {
    throw new Error('Short link not found');
  }

  if (link.creatorId !== profileId) {
    throw new Error('You do not have permission to delete this link');
  }

  // Delete link
  await db
    .from('marketing_links')
    .delete()
    .eq('code', code.toLowerCase());
}

/**
 * Increment click count for a short link
 * Called by the redirect handler
 */
export async function incrementShortLinkClick(code: string): Promise<void> {
  const { data: links } = await db
    .from('marketing_links')
    .select('clicks, uniqueClicks')
    .eq('code', code.toLowerCase())
    .single();

  if (links) {
    await db
      .from('marketing_links')
      .update({
        clicks: (links.clicks || 0) + 1,
        uniqueClicks: (links.uniqueClicks || 0) + 1, // Simplified - in production, track unique IPs
      })
      .eq('code', code.toLowerCase());
  }
}

/**
 * Get analytics for a short link
 */
export async function getShortLinkAnalytics(code: string, profileId: string) {
  // Verify ownership
  const { data: links } = await db
    .from('marketing_links')
    .select('*')
    .eq('code', code.toLowerCase())
    .limit(1);

  const link = firstOrNull(links) as MarketingLink | null;

  if (!link) {
    throw new Error('Short link not found');
  }

  if (link.creatorId !== profileId) {
    throw new Error('You do not have permission to view this link');
  }

  // Get recent clicks
  const { data: linkClicks } = await db
    .from('link_clicks')
    .select('id, clickedAt, ipAddress, city, state, converted')
    .eq('linkId', link.id)
    .order('clickedAt', { ascending: false })
    .limit(100);

  // Calculate conversion rates
  const clicks = link.clicks || 0;
  const conversions = link.conversions || 0;
  const intakeStarts = link.intakeStarts || 0;

  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
  const leadConversionRate = clicks > 0 ? (intakeStarts / clicks) * 100 : 0;

  return {
    code: link.code,
    shortUrl: link.shortUrl,
    fullUrl: link.url,
    title: link.title,
    clicks: link.clicks || 0,
    uniqueClicks: link.uniqueClicks || 0,
    leads: link.conversions || 0,
    conversions: link.returnsFiled || 0,
    conversionRate,
    leadConversionRate,
    isActive: link.isActive,
    createdAt: link.createdAt,
    recentClicks: (linkClicks || []).map((click: LinkClick) => ({
      id: click.id,
      clickedAt: click.clickedAt,
      ipAddress: click.ipAddress,
      city: click.city,
      state: click.state,
      converted: click.converted,
    })),
  };
}
