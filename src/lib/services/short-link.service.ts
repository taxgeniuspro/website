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

import { prisma } from '@/lib/prisma';
import { getUserTrackingCode } from './tracking-code.service';
import { generateTrackingQRCode } from './tracking-code.service';
import { buildTrackingUrl } from '@/lib/utils/tracking-integration';

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
  const existing = await prisma.marketingLink.findUnique({
    where: { code: code.toLowerCase() },
  });

  return !existing;
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
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { role: true },
  });

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
    trackingCode: trackingData.activeCode,
    source: 'short-link',
    medium: 'referral',
    campaign: campaign || 'short-link-campaign',
    content: normalizedCode,
  });

  // Add link code parameter
  const urlWithLink = `${fullUrl}&link=${normalizedCode}`;

  // Generate QR code
  const qrCodeDataUrl = await generateTrackingQRCode(urlWithLink);

  // Determine link type based on destination
  const linkTypeMap: Record<string, any> = {
    INTAKE_FORM: 'LANDING_PAGE',
    CONTACT_FORM: 'REFERRAL',
    BOOK_APPOINTMENT: 'LANDING_PAGE',
    CUSTOM: 'CUSTOM',
  };

  // Create MarketingLink
  const link = await prisma.marketingLink.create({
    data: {
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
      qrCodeImageUrl: qrCodeDataUrl,
      isActive: true,
    },
  });

  return {
    id: link.id,
    shortCode: normalizedCode,
    shortUrl: `${baseUrl}/go/${normalizedCode}`,
    fullUrl: urlWithLink,
    destination: targetPage,
    title: link.title,
    description: link.description,
    qrCodeUrl: link.qrCodeImageUrl,
    clicks: link.clicks,
    leads: link.conversions,
    conversions: link.returnsFiled,
    isActive: link.isActive,
    createdAt: link.createdAt,
  };
}

/**
 * Get all short links for a user
 */
export async function getUserShortLinks(profileId: string): Promise<ShortLinkData[]> {
  const links = await prisma.marketingLink.findMany({
    where: {
      creatorId: profileId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

  return links.map((link) => ({
    id: link.id,
    shortCode: link.code,
    shortUrl: link.shortUrl || `${baseUrl}/go/${link.code}`,
    fullUrl: link.url,
    destination: link.targetPage,
    title: link.title,
    description: link.description,
    qrCodeUrl: link.qrCodeImageUrl,
    clicks: link.clicks,
    leads: link.conversions,
    conversions: link.returnsFiled,
    isActive: link.isActive,
    createdAt: link.createdAt,
  }));
}

/**
 * Get short link by code
 */
export async function getShortLinkByCode(code: string): Promise<ShortLinkData | null> {
  const link = await prisma.marketingLink.findUnique({
    where: { code: code.toLowerCase() },
  });

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
    title: link.title,
    description: link.description,
    qrCodeUrl: link.qrCodeImageUrl,
    clicks: link.clicks,
    leads: link.conversions,
    conversions: link.returnsFiled,
    isActive: link.isActive,
    createdAt: link.createdAt,
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
  const link = await prisma.marketingLink.findUnique({
    where: { code: code.toLowerCase() },
  });

  if (!link) {
    throw new Error('Short link not found');
  }

  if (link.creatorId !== profileId) {
    throw new Error('You do not have permission to update this link');
  }

  // Update link
  const updated = await prisma.marketingLink.update({
    where: { code: code.toLowerCase() },
    data: {
      title: updates.title,
      description: updates.description,
      isActive: updates.isActive,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

  return {
    id: updated.id,
    shortCode: updated.code,
    shortUrl: updated.shortUrl || `${baseUrl}/go/${updated.code}`,
    fullUrl: updated.url,
    destination: updated.targetPage,
    title: updated.title,
    description: updated.description,
    qrCodeUrl: updated.qrCodeImageUrl,
    clicks: updated.clicks,
    leads: updated.conversions,
    conversions: updated.returnsFiled,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
  };
}

/**
 * Delete short link
 */
export async function deleteShortLink(code: string, profileId: string): Promise<void> {
  // Verify ownership
  const link = await prisma.marketingLink.findUnique({
    where: { code: code.toLowerCase() },
  });

  if (!link) {
    throw new Error('Short link not found');
  }

  if (link.creatorId !== profileId) {
    throw new Error('You do not have permission to delete this link');
  }

  // Delete link
  await prisma.marketingLink.delete({
    where: { code: code.toLowerCase() },
  });
}

/**
 * Increment click count for a short link
 * Called by the redirect handler
 */
export async function incrementShortLinkClick(code: string): Promise<void> {
  await prisma.marketingLink.update({
    where: { code: code.toLowerCase() },
    data: {
      clicks: { increment: 1 },
      uniqueClicks: { increment: 1 }, // Simplified - in production, track unique IPs
    },
  });
}

/**
 * Get analytics for a short link
 */
export async function getShortLinkAnalytics(code: string, profileId: string) {
  // Verify ownership
  const link = await prisma.marketingLink.findUnique({
    where: { code: code.toLowerCase() },
    include: {
      linkClicks: {
        orderBy: { clickedAt: 'desc' },
        take: 100,
      },
    },
  });

  if (!link) {
    throw new Error('Short link not found');
  }

  if (link.creatorId !== profileId) {
    throw new Error('You do not have permission to view this link');
  }

  // Calculate conversion rates
  const conversionRate = link.clicks > 0 ? (link.conversions / link.clicks) * 100 : 0;

  const leadConversionRate = link.clicks > 0 ? ((link.intakeStarts || 0) / link.clicks) * 100 : 0;

  return {
    code: link.code,
    shortUrl: link.shortUrl,
    fullUrl: link.url,
    title: link.title,
    clicks: link.clicks,
    uniqueClicks: link.uniqueClicks,
    leads: link.conversions,
    conversions: link.returnsFiled,
    conversionRate,
    leadConversionRate,
    isActive: link.isActive,
    createdAt: link.createdAt,
    recentClicks: link.linkClicks.map((click) => ({
      id: click.id,
      clickedAt: click.clickedAt,
      ipAddress: click.ipAddress,
      city: click.city,
      state: click.state,
      converted: click.converted,
    })),
  };
}
