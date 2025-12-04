/**
 * Universal Tracking Code Service
 *
 * Generates and manages unique tracking codes for all users.
 * Each user gets a unique code on signup that can be customized once.
 */

import { prisma } from '@/lib/prisma';
import { generateQRCode, type QRCodeResult } from './qr-code.service';
import { logger } from '@/lib/logger';
import { buildTrackingUrl } from '@/lib/utils/tracking-integration';

export interface TrackingCodeData {
  code: string;
  isCustom: boolean;
  qrCodeUrl: string | null;
  canCustomize: boolean;
  isFinalized: boolean;
  trackingUrl: string;
}

/**
 * Generate initials from user name
 * For tax preparers: first + middle + last initials (e.g., "Ira D Watkins" -> "idw")
 * Handles special characters and accents
 */
function generateInitialsFromName(
  firstName: string | null,
  middleName: string | null,
  lastName: string | null
): string {
  // Helper function to clean and get first letter
  const getFirstLetter = (name: string | null): string => {
    if (!name || name.trim().length === 0) return '';

    // Remove special characters and accents, keep only letters
    const cleaned = name
      .normalize('NFD') // Decompose accented characters
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-zA-Z]/g, '') // Keep only letters
      .toLowerCase();

    return cleaned.charAt(0);
  };

  const firstInitial = getFirstLetter(firstName);
  const middleInitial = getFirstLetter(middleName);
  const lastInitial = getFirstLetter(lastName);

  // Combine initials (at least first and last should exist)
  let initials = firstInitial + middleInitial + lastInitial;

  // If no initials could be extracted, use fallback
  if (initials.length === 0) {
    return 'user';
  }

  return initials;
}

/**
 * Generate a unique tracking code
 * Format depends on role:
 * - Tax Preparers: Initials-based (e.g., "idw", "idw2")
 * - Affiliates/Customers: Numeric (e.g., "TGP-123456")
 */
export async function generateUniqueTrackingCode(options?: {
  role?: string;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
}): Promise<string> {
  let code: string;
  let exists = true;
  let attempts = 0;
  const maxAttempts = 20;

  // Determine if this is a tax preparer
  const isTaxPreparer = options?.role === 'tax_preparer';

  if (isTaxPreparer && options?.firstName && options?.lastName) {
    // Generate initials-based code for tax preparers
    const baseInitials = generateInitialsFromName(
      options.firstName,
      options.middleName,
      options.lastName
    );

    let suffix = '';
    let suffixNumber = 1;

    while (exists && attempts < maxAttempts) {
      code = baseInitials + suffix;

      // Check if code already exists
      const existing = await prisma.profile.findFirst({
        where: {
          OR: [{ trackingCode: code }, { customTrackingCode: code }],
        },
      });

      if (!existing) {
        exists = false;
      } else {
        // Try with number suffix
        suffixNumber++;
        suffix = suffixNumber.toString();
        attempts++;
      }
    }

    if (exists) {
      throw new Error(
        `Failed to generate unique initials-based tracking code for ${baseInitials} after ${maxAttempts} attempts`
      );
    }
  } else {
    // Generate numeric code for affiliates and customers
    while (exists && attempts < maxAttempts) {
      // Generate 6-digit random number
      const random = Math.floor(100000 + Math.random() * 900000);
      code = `TGP-${random}`;

      // Check if code already exists
      const existing = await prisma.profile.findFirst({
        where: {
          OR: [{ trackingCode: code }, { customTrackingCode: code }],
        },
      });

      exists = !!existing;
      attempts++;
    }

    if (exists) {
      throw new Error('Failed to generate unique tracking code after multiple attempts');
    }
  }

  return code!;
}

/**
 * Generate QR code for tracking code
 */
export async function generateTrackingQRCode(
  trackingCode: string,
  profileId: string,
  baseUrl: string = 'https://taxgeniuspro.tax'
): Promise<QRCodeResult> {
  const trackingUrl = `${baseUrl}/ref/${trackingCode}`;

  return await generateQRCode({
    url: trackingUrl,
    materialId: trackingCode,
    format: 'PNG',
    size: 512,
    errorCorrectionLevel: 'H', // High error correction for print materials
    withLogo: true, // Always include logo
    userId: profileId, // Pass profileId to use custom logo if available
  });
}

/**
 * Auto-generate referral links for a user (intake + appointment)
 * Called when tracking code is assigned or customized
 */
export async function autoGenerateReferralLinks(
  profileId: string,
  trackingCode: string,
  baseUrl: string = 'https://taxgeniuspro.tax'
): Promise<{ intakeLink: any; appointmentLink: any }> {
  // Get profile info
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { role: true },
  });

  if (!profile) {
    throw new Error('Profile not found');
  }

  // Generate short codes based on tracking code
  const intakeCode = `${trackingCode}-intake`.toLowerCase();
  const appointmentCode = `${trackingCode}-appt`.toLowerCase();

  // Check if links already exist (for re-customization scenarios)
  const existingIntakeLink = await prisma.marketingLink.findUnique({
    where: { code: intakeCode },
  });

  const existingAppointmentLink = await prisma.marketingLink.findUnique({
    where: { code: appointmentCode },
  });

  // Build URLs with tracking
  const intakeUrl = buildTrackingUrl(`${baseUrl}/start-filing/form`, {
    trackingCode,
    source: 'referral-link',
    medium: 'direct',
    campaign: 'auto-referral',
    content: 'intake',
  });

  const appointmentUrl = buildTrackingUrl(`${baseUrl}/book-appointment`, {
    trackingCode,
    source: 'referral-link',
    medium: 'direct',
    campaign: 'auto-referral',
    content: 'appointment',
  });

  // Generate QR codes with user's custom logo
  const intakeQR = await generateQRCode({
    url: intakeUrl,
    materialId: intakeCode,
    format: 'PNG',
    size: 512,
    errorCorrectionLevel: 'H',
    withLogo: true,
    userId: profileId,
  });

  const appointmentQR = await generateQRCode({
    url: appointmentUrl,
    materialId: appointmentCode,
    format: 'PNG',
    size: 512,
    errorCorrectionLevel: 'H',
    withLogo: true,
    userId: profileId,
  });

  // Create or update intake link
  const intakeLink = existingIntakeLink
    ? await prisma.marketingLink.update({
        where: { id: existingIntakeLink.id },
        data: {
          code: intakeCode,
          url: intakeUrl,
          shortUrl: `${baseUrl}/go/${intakeCode}`,
          qrCodeImageUrl: intakeQR.dataUrl,
          title: `Referral Link - Tax Filing`,
        },
      })
    : await prisma.marketingLink.create({
        data: {
          creatorId: profileId,
          creatorType: profile.role,
          linkType: 'LANDING_PAGE',
          code: intakeCode,
          url: intakeUrl,
          shortUrl: `${baseUrl}/go/${intakeCode}`,
          title: `Referral Link - Tax Filing`,
          description: 'Auto-generated referral link for tax filing intake form',
          campaign: 'auto-referral',
          targetPage: '/start-filing/form',
          qrCodeImageUrl: intakeQR.dataUrl,
          isActive: true,
        },
      });

  // Create or update appointment link
  const appointmentLink = existingAppointmentLink
    ? await prisma.marketingLink.update({
        where: { id: existingAppointmentLink.id },
        data: {
          code: appointmentCode,
          url: appointmentUrl,
          shortUrl: `${baseUrl}/go/${appointmentCode}`,
          qrCodeImageUrl: appointmentQR.dataUrl,
          title: `Referral Link - Book Appointment`,
        },
      })
    : await prisma.marketingLink.create({
        data: {
          creatorId: profileId,
          creatorType: profile.role,
          linkType: 'LANDING_PAGE',
          code: appointmentCode,
          url: appointmentUrl,
          shortUrl: `${baseUrl}/go/${appointmentCode}`,
          title: `Referral Link - Book Appointment`,
          description: 'Auto-generated referral link for booking appointments',
          campaign: 'auto-referral',
          targetPage: '/book-appointment',
          qrCodeImageUrl: appointmentQR.dataUrl,
          isActive: true,
        },
      });

  logger.info(
    `✅ Auto-generated referral links for ${trackingCode}: ${intakeCode}, ${appointmentCode}`
  );

  return { intakeLink, appointmentLink };
}

/**
 * Validate custom tracking code format
 */
export function validateCustomTrackingCode(code: string): { valid: boolean; error?: string } {
  // Must be 3-20 characters
  if (code.length < 3 || code.length > 20) {
    return { valid: false, error: 'Code must be between 3 and 20 characters' };
  }

  // Only alphanumeric, hyphens, and underscores
  if (!/^[a-zA-Z0-9-_]+$/.test(code)) {
    return {
      valid: false,
      error: 'Code can only contain letters, numbers, hyphens, and underscores',
    };
  }

  // Cannot start with hyphen or underscore
  if (/^[-_]/.test(code)) {
    return { valid: false, error: 'Code cannot start with a hyphen or underscore' };
  }

  // Cannot end with hyphen or underscore
  if (/[-_]$/.test(code)) {
    return { valid: false, error: 'Code cannot end with a hyphen or underscore' };
  }

  // Cannot be all numbers (would conflict with auto-generated codes)
  if (/^\d+$/.test(code)) {
    return { valid: false, error: 'Code cannot be all numbers' };
  }

  // Reserved words (case-insensitive)
  const reserved = ['admin', 'api', 'dashboard', 'auth', 'test', 'demo', 'support', 'help'];
  if (reserved.includes(code.toLowerCase())) {
    return { valid: false, error: 'This code is reserved and cannot be used' };
  }

  return { valid: true };
}

/**
 * Check if custom tracking code is available
 */
export async function isTrackingCodeAvailable(code: string): Promise<boolean> {
  const existing = await prisma.profile.findFirst({
    where: {
      OR: [{ trackingCode: code }, { customTrackingCode: code }],
    },
  });

  return !existing;
}

/**
 * Assign tracking code to user (for new signups)
 * Also auto-generates referral links for intake and appointment
 */
export async function assignTrackingCodeToUser(
  profileId: string,
  baseUrl?: string
): Promise<TrackingCodeData> {
  const url = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

  // Get profile data for tracking code generation
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      role: true,
      firstName: true,
      middleName: true,
      lastName: true,
    },
  });

  if (!profile) {
    throw new Error('Profile not found');
  }

  // Generate unique code with user data
  const trackingCode = await generateUniqueTrackingCode({
    role: profile.role,
    firstName: profile.firstName,
    middleName: profile.middleName,
    lastName: profile.lastName,
  });

  // Generate QR code with user's logo
  const qrCode = await generateTrackingQRCode(trackingCode, profileId, url);

  // Update profile
  await prisma.profile.update({
    where: { id: profileId },
    data: {
      trackingCode,
      trackingCodeQRUrl: qrCode.dataUrl,
    },
  });

  // Auto-generate referral links (intake + appointment)
  try {
    await autoGenerateReferralLinks(profileId, trackingCode, url);
    logger.info(`✅ Auto-generated referral links for new user ${profileId}`);
  } catch (error) {
    logger.error(`❌ Failed to auto-generate referral links for ${profileId}:`, error);
    // Don't throw - tracking code assignment should still succeed
  }

  const trackingUrl = `${url}?ref=${trackingCode}`;

  return {
    code: trackingCode,
    isCustom: false,
    qrCodeUrl: qrCode.dataUrl,
    canCustomize: true,
    isFinalized: false,
    trackingUrl,
  };
}

/**
 * Customize tracking code (can be edited multiple times until finalized)
 * Also updates referral links with new vanity code
 */
export async function customizeTrackingCode(
  profileId: string,
  customCode: string,
  baseUrl?: string
): Promise<{ success: boolean; error?: string; data?: TrackingCodeData }> {
  const url = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

  // Get profile
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      trackingCode: true,
      trackingCodeChanged: true,
      trackingCodeFinalized: true,
      customTrackingCode: true,
    },
  });

  if (!profile) {
    return { success: false, error: 'Profile not found' };
  }

  // Check if already finalized
  if (profile.trackingCodeFinalized) {
    return {
      success: false,
      error: 'Tracking code has been finalized and cannot be changed',
    };
  }

  // Validate format
  const validation = validateCustomTrackingCode(customCode);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Check availability
  const available = await isTrackingCodeAvailable(customCode);
  if (!available) {
    return { success: false, error: 'This tracking code is already taken' };
  }

  // Generate new QR code with custom code and user's logo
  const qrCode = await generateTrackingQRCode(customCode, profileId, url);

  // Delete old referral links (based on currently active tracking code)
  const activeCode = profile.customTrackingCode || profile.trackingCode;
  const oldIntakeCode = `${activeCode}-intake`.toLowerCase();
  const oldAppointmentCode = `${activeCode}-appt`.toLowerCase();

  try {
    await prisma.marketingLink.deleteMany({
      where: {
        creatorId: profileId,
        code: {
          in: [oldIntakeCode, oldAppointmentCode],
        },
      },
    });
    logger.info(`🗑️  Deleted old referral links for ${profile.trackingCode}`);
  } catch (error) {
    logger.error('Error deleting old referral links:', error);
    // Continue anyway
  }

  // Update profile
  await prisma.profile.update({
    where: { id: profileId },
    data: {
      customTrackingCode: customCode,
      trackingCodeChanged: true,
      trackingCodeQRUrl: qrCode.dataUrl,
    },
  });

  // Auto-generate new referral links with custom code
  try {
    await autoGenerateReferralLinks(profileId, customCode, url);
    logger.info(`✅ Regenerated referral links with custom code ${customCode}`);
  } catch (error) {
    logger.error(`❌ Failed to regenerate referral links for ${customCode}:`, error);
    // Don't throw - customization should still succeed
  }

  const trackingUrl = `${url}?ref=${customCode}`;

  return {
    success: true,
    data: {
      code: customCode,
      isCustom: true,
      qrCodeUrl: qrCode.dataUrl,
      canCustomize: true, // Still can customize until finalized
      isFinalized: false,
      trackingUrl,
    },
  };
}

/**
 * Get user's active tracking code data
 */
export async function getUserTrackingCode(profileId: string, baseUrl?: string): Promise<TrackingCodeData | null> {
  const url = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      trackingCode: true,
      customTrackingCode: true,
      trackingCodeChanged: true,
      trackingCodeFinalized: true,
      trackingCodeQRUrl: true,
    },
  });

  if (!profile) {
    return null;
  }

  // Custom code takes precedence
  const activeCode = profile.customTrackingCode || profile.trackingCode;
  if (!activeCode) {
    return null;
  }

  const trackingUrl = `${url}?ref=${activeCode}`;

  return {
    code: activeCode,
    isCustom: !!profile.customTrackingCode,
    qrCodeUrl: profile.trackingCodeQRUrl,
    canCustomize: !profile.trackingCodeFinalized,
    isFinalized: profile.trackingCodeFinalized,
    trackingUrl,
  };
}

/**
 * Finalize tracking code (permanently lock it)
 * After finalization, the code cannot be changed anymore
 */
export async function finalizeTrackingCode(
  profileId: string,
  baseUrl?: string
): Promise<{ success: boolean; error?: string; data?: TrackingCodeData }> {
  const url = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

  // Get profile
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      trackingCode: true,
      customTrackingCode: true,
      trackingCodeFinalized: true,
      trackingCodeQRUrl: true,
    },
  });

  if (!profile) {
    return { success: false, error: 'Profile not found' };
  }

  // Check if already finalized
  if (profile.trackingCodeFinalized) {
    return { success: false, error: 'Tracking code is already finalized' };
  }

  // Get active code
  const activeCode = profile.customTrackingCode || profile.trackingCode;
  if (!activeCode) {
    return { success: false, error: 'No tracking code found' };
  }

  // Update profile to finalize
  await prisma.profile.update({
    where: { id: profileId },
    data: {
      trackingCodeFinalized: true,
      trackingCodeChanged: true, // Also set this for backwards compatibility
    },
  });

  const trackingUrl = `${url}?ref=${activeCode}`;

  logger.info(`✅ Tracking code finalized for profile ${profileId}: ${activeCode}`);

  return {
    success: true,
    data: {
      code: activeCode,
      isCustom: !!profile.customTrackingCode,
      qrCodeUrl: profile.trackingCodeQRUrl,
      canCustomize: false,
      isFinalized: true,
      trackingUrl,
    },
  };
}

/**
 * Get user by tracking code (for attribution)
 */
export async function getUserByTrackingCode(
  code: string
): Promise<{ id: string; userId: string | null; role: string } | null> {
  const profile = await prisma.profile.findFirst({
    where: {
      OR: [{ trackingCode: code }, { customTrackingCode: code }],
    },
    select: {
      id: true,
      userId: true,
      role: true,
    },
  });

  return profile;
}

/**
 * Backfill tracking codes for existing users
 * (Run this once after adding the tracking code feature)
 */
export async function backfillTrackingCodes(
  baseUrl?: string
): Promise<{ updated: number; errors: number }> {
  const profiles = await prisma.profile.findMany({
    where: {
      trackingCode: null,
    },
    select: {
      id: true,
    },
  });

  let updated = 0;
  let errors = 0;

  for (const profile of profiles) {
    try {
      await assignTrackingCodeToUser(profile.id, baseUrl);
      updated++;
    } catch (error) {
      logger.error(`Failed to assign tracking code to profile ${profile.id}:`, error);
      errors++;
    }
  }

  return { updated, errors };
}
