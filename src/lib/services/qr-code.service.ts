/**
 * QR Code Generation Service
 *
 * Generates QR codes for marketing materials and uploads them to storage.
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6.2
 */

import QRCode from 'qrcode';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface GenerateQROptions {
  url: string;
  materialId: string;
  format?: 'PNG' | 'SVG';
  size?: number;
  brandColor?: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  withLogo?: boolean; // Add Tax Genius logo in center
  userId?: string; // User ID to check for custom photo preference
}

export interface QRCodeResult {
  dataUrl: string; // Base64 data URL for immediate display
  format: 'PNG' | 'SVG';
  size: number;
}

/**
 * Generate QR code and return as base64 data URL
 * For storage, we'll use public/qr-codes directory (can be upgraded to R2/S3 later)
 */
export async function generateQRCode(options: GenerateQROptions): Promise<QRCodeResult> {
  const {
    url,
    format = 'PNG',
    size = 512,
    brandColor = '#000000', // Always use black for best scanning
    errorCorrectionLevel = 'H', // High error correction for print materials
    withLogo = true, // Default to true - always add logo
    userId,
  } = options;

  const qrOptions = {
    width: size,
    margin: 2,
    color: {
      dark: brandColor, // Use the brandColor parameter
      light: '#FFFFFF', // Always white background
    },
    errorCorrectionLevel,
  };

  try {
    let dataUrl: string;

    if (format === 'SVG') {
      // SVG doesn't support logo overlay (use PNG for logo version)
      const svgString = await QRCode.toString(url, {
        ...qrOptions,
        type: 'svg',
      });
      dataUrl = `data:image/svg+xml;base64,${Buffer.from(svgString).toString('base64')}`;
    } else {
      // Generate PNG
      let qrBuffer = await QRCode.toBuffer(url, {
        ...qrOptions,
        type: 'png',
      });

      // Add logo if requested
      if (withLogo) {
        logger.info('🎨 Adding logo to QR code...', { userId, size });
        // Check if user has custom QR code logo
        let customLogoUrl: string | undefined;
        if (userId) {
          const userProfile = await prisma.profile.findFirst({
            where: {
              OR: [
                { id: userId },
                { userId: userId }
              ]
            },
            select: {
              qrCodeLogoUrl: true,
            },
          });

          if (userProfile?.qrCodeLogoUrl) {
            customLogoUrl = userProfile.qrCodeLogoUrl;
            logger.info('📸 Using custom QR logo from profile', { userId, logoUrl: customLogoUrl });
          } else {
            logger.info('🏢 No custom logo found, will use default Tax Genius logo');
          }
        } else {
          logger.info('🏢 No userId provided, using default Tax Genius logo');
        }

        qrBuffer = await addLogoToQRCode(qrBuffer, size, customLogoUrl);
      } else {
        logger.info('⏭️ Skipping logo - withLogo is false');
      }

      // Add white bevel border around entire QR code
      qrBuffer = await addWhiteBevel(qrBuffer, size);

      // Convert to data URL
      dataUrl = `data:image/png;base64,${qrBuffer.toString('base64')}`;
    }

    return {
      dataUrl,
      format,
      size,
    };
  } catch (error) {
    logger.error('QR code generation failed:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code as buffer (for downloads)
 */
export async function generateQRBuffer(options: GenerateQROptions): Promise<Buffer> {
  const {
    url,
    format = 'PNG',
    size = 512,
    brandColor = '#000000', // Always use black for best scanning
    errorCorrectionLevel = 'H',
    withLogo = true, // Default to true - always add logo
    userId,
  } = options;

  const qrOptions = {
    width: size,
    margin: 2,
    color: {
      dark: brandColor, // Use the brandColor parameter
      light: '#FFFFFF', // Always white background
    },
    errorCorrectionLevel,
  };

  try {
    if (format === 'SVG') {
      // SVG doesn't support logo overlay
      const svgString = await QRCode.toString(url, {
        ...qrOptions,
        type: 'svg',
      });
      return Buffer.from(svgString, 'utf-8');
    } else {
      let qrBuffer = await QRCode.toBuffer(url, {
        ...qrOptions,
        type: 'png',
      });

      // Add logo if requested
      if (withLogo) {
        logger.info('🎨 [Buffer] Adding logo to QR code...', { userId, size });
        // Check if user has custom QR code logo
        let customLogoUrl: string | undefined;
        if (userId) {
          const userProfile = await prisma.profile.findFirst({
            where: {
              OR: [
                { id: userId },
                { userId: userId }
              ]
            },
            select: {
              qrCodeLogoUrl: true,
            },
          });

          if (userProfile?.qrCodeLogoUrl) {
            customLogoUrl = userProfile.qrCodeLogoUrl;
            logger.info('📸 [Buffer] Using custom QR logo from profile', { userId, logoUrl: customLogoUrl });
          } else {
            logger.info('🏢 [Buffer] No custom logo found, will use default Tax Genius logo');
          }
        } else {
          logger.info('🏢 [Buffer] No userId provided, using default Tax Genius logo');
        }

        qrBuffer = await addLogoToQRCode(qrBuffer, size, customLogoUrl);
      } else {
        logger.info('⏭️ [Buffer] Skipping logo - withLogo is false');
      }

      // Add white bevel border around entire QR code
      qrBuffer = await addWhiteBevel(qrBuffer, size);

      return qrBuffer;
    }
  } catch (error) {
    logger.error('QR code buffer generation failed:', error);
    throw new Error('Failed to generate QR code buffer');
  }
}

/**
 * Validate QR code size (should be < 50KB for optimal performance)
 */
export function validateQRSize(buffer: Buffer): { valid: boolean; size: number } {
  const sizeInKB = buffer.length / 1024;
  return {
    valid: sizeInKB < 50,
    size: sizeInKB,
  };
}

/**
 * Add Tax Genius logo overlay to QR code
 * Logo will be centered and sized to ~20% of QR code (safe with H error correction)
 */
async function addLogoToQRCode(qrBuffer: Buffer, qrSize: number, customLogoUrl?: string): Promise<Buffer> {
  try {
    let logoBuffer: Buffer | undefined;

    // Use custom logo URL if provided (from preparer profile)
    if (customLogoUrl) {
      try {
        logger.info('Attempting to fetch custom logo from:', customLogoUrl);
        const response = await fetch(customLogoUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          logoBuffer = Buffer.from(arrayBuffer);
          logger.info('✅ Custom logo fetched successfully');
        } else {
          throw new Error(`Failed to fetch custom logo: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        logger.warn('Failed to fetch custom logo, using default:', error);
        // Fall through to default logo
        customLogoUrl = undefined;
        logoBuffer = undefined;
      }
    }

    // If no custom logo or custom logo failed, use default Tax Genius logo
    if (!logoBuffer) {
      const logoPath = path.join(process.cwd(), 'public', 'images', 'tax-genius-logo.png');
      logger.info('Using default logo from:', logoPath);

      try {
        logoBuffer = await fs.readFile(logoPath);
        logger.info('✅ Default logo loaded successfully');
      } catch (error) {
        // Fallback to icon if logo not found
        logger.warn('Default logo not found, trying fallback icon:', error);
        const iconPath = path.join(process.cwd(), 'public', 'icon-512x512.png');
        try {
          logoBuffer = await fs.readFile(iconPath);
          logger.info('✅ Fallback icon loaded successfully');
        } catch (iconError) {
          logger.error('Failed to load fallback icon:', iconError);
          throw new Error('No logo file available');
        }
      }
    }

    // Calculate logo size (20% of QR code size for optimal scanning)
    const logoSize = Math.floor(qrSize * 0.2);
    const padding = Math.floor(logoSize * 0.15); // White padding around logo
    const totalLogoSize = logoSize + (padding * 2);

    // Resize and add white background to logo
    const processedLogo = await sharp(logoBuffer)
      .resize(logoSize, logoSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toBuffer();

    // Composite logo onto QR code center
    const qrWithLogo = await sharp(qrBuffer)
      .composite([{
        input: processedLogo,
        gravity: 'center'
      }])
      .png()
      .toBuffer();

    logger.info('✅ Logo successfully composited onto QR code');
    return qrWithLogo;
  } catch (error) {
    logger.error('❌ Failed to add logo to QR code:', error);
    // Return original QR code if logo overlay fails
    logger.warn('⚠️ Returning QR code without logo');
    return qrBuffer;
  }
}

/**
 * Add white bevel border around QR code
 * This ensures the QR code can be scanned on dark materials
 */
async function addWhiteBevel(qrBuffer: Buffer, qrSize: number): Promise<Buffer> {
  try {
    // Add 10% padding as white border (bevel)
    const bevelSize = Math.floor(qrSize * 0.1);

    const qrWithBevel = await sharp(qrBuffer)
      .extend({
        top: bevelSize,
        bottom: bevelSize,
        left: bevelSize,
        right: bevelSize,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toBuffer();

    return qrWithBevel;
  } catch (error) {
    logger.error('Failed to add white bevel to QR code:', error);
    // Return original QR code if bevel fails
    return qrBuffer;
  }
}

/**
 * Generate tracking URL with UTM parameters
 */
export function generateTrackingURL(params: {
  baseUrl: string;
  userId: string;
  materialId: string;
  materialType: string;
  campaignName?: string;
  location?: string;
}): string {
  const url = new URL(params.baseUrl);

  // Add UTM parameters
  url.searchParams.set('utm_source', params.userId);
  url.searchParams.set('utm_medium', params.materialType.toLowerCase().replace(/_/g, '-'));

  if (params.campaignName) {
    url.searchParams.set('utm_campaign', params.campaignName.toLowerCase().replace(/\s+/g, '-'));
  }

  url.searchParams.set('utm_content', params.materialId);

  if (params.location) {
    url.searchParams.set('utm_term', params.location.toLowerCase().replace(/\s+/g, '-'));
  }

  // Add ref parameter for backward compatibility
  url.searchParams.set('ref', params.materialId);

  return url.toString();
}

/**
 * Generate unique tracking code for material
 */
export function generateMaterialTrackingCode(params: {
  userSlug?: string;
  materialType: string;
}): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const typeSlug = params.materialType.toLowerCase().replace(/_/g, '-');

  if (params.userSlug) {
    return `${params.userSlug}_${typeSlug}_${random}`;
  }

  return `material_${typeSlug}_${timestamp}_${random}`;
}
