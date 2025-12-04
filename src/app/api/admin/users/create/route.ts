/**
 * Admin API: Create Tax Preparer Account
 *
 * POST: Create a new tax preparer account with all setup
 * - Creates User + Profile
 * - Generates tracking code and QR code
 * - Creates magic link for password setup
 * - Sends welcome email
 * - Returns complete account details
 */

import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { generateUniqueTrackingCode, assignTrackingCodeToUser } from '@/lib/services/tracking-code.service';
import { EmailService } from '@/lib/services/email.service';
import crypto from 'crypto';
import sharp from 'sharp';

/**
 * POST: Create tax preparer account
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Check admin permissions
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get admin's profile
    const adminProfile = await prisma.profile.findUnique({
      where: { userId },
      select: { role: true },
    });

    if (!adminProfile || !['super_admin', 'admin'].includes(adminProfile.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // 2. Parse request body
    const body = await request.json();
    const {
      email,
      firstName,
      lastName,
      middleName,
      phone,
      customTrackingCode,
      photoDataUrl, // Base64 data URL if photo uploaded
    } = body;

    // 3. Validate required fields
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, first name, and last name are required' },
        { status: 400 }
      );
    }

    // 4. Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // 5. Create User record (no password yet - will be set via magic link)
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: `${firstName} ${lastName}`,
        emailVerified: new Date(), // Admin-created accounts are pre-verified
      },
    });

    logger.info(`Admin created user: ${newUser.id} (${email})`);

    // 6. Generate or use custom tracking code
    let trackingCode: string;
    let isCustomCode = false;

    if (customTrackingCode && customTrackingCode.trim()) {
      // Admin provided custom code
      trackingCode = customTrackingCode.trim().toLowerCase();
      isCustomCode = true;

      // Check if tracking code is available
      const existingCode = await prisma.profile.findFirst({
        where: {
          OR: [
            { trackingCode },
            { customTrackingCode: trackingCode },
          ],
        },
      });

      if (existingCode) {
        // Rollback user creation
        await prisma.user.delete({ where: { id: newUser.id } });
        return NextResponse.json(
          { error: `Tracking code "${trackingCode}" is already taken` },
          { status: 400 }
        );
      }
    } else {
      // Auto-generate from name
      trackingCode = await generateUniqueTrackingCode({
        role: 'tax_preparer',
        firstName,
        middleName,
        lastName,
      });
    }

    // 7. Process profile photo if provided
    let avatarUrl: string | null = null;
    let qrCodeLogoUrl: string | null = null;

    if (photoDataUrl && photoDataUrl.startsWith('data:image')) {
      try {
        // Extract base64 data
        const base64Data = photoDataUrl.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');

        // Process image with Sharp (resize to 200x200 for QR overlay)
        const processedImage = await sharp(buffer)
          .resize(200, 200, {
            fit: 'cover',
            position: 'center',
          })
          .png({ quality: 90, compressionLevel: 9 })
          .toBuffer();

        // Convert back to base64 data URL
        const processedDataUrl = `data:image/png;base64,${processedImage.toString('base64')}`;

        avatarUrl = processedDataUrl;
        qrCodeLogoUrl = processedDataUrl;
      } catch (error) {
        logger.error('Failed to process uploaded photo:', error);
        // Continue without photo - not a critical error
      }
    }

    // 8. Create Profile record
    const newProfile = await prisma.profile.create({
      data: {
        userId: newUser.id,
        role: 'tax_preparer',
        firstName,
        lastName,
        middleName,
        phone,
        avatarUrl,
        qrCodeLogoUrl,
        ...(isCustomCode
          ? { customTrackingCode: trackingCode }
          : { trackingCode }),
      },
    });

    logger.info(`Created profile for user ${newUser.id} with tracking code: ${trackingCode}`);

    // 9. Assign tracking code (generates QR code and referral links)
    await assignTrackingCodeToUser(newProfile.id);

    // 10. Fetch updated profile with QR code
    const updatedProfile = await prisma.profile.findUnique({
      where: { id: newProfile.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        trackingCode: true,
        customTrackingCode: true,
        trackingCodeQRUrl: true,
        qrCodeLogoUrl: true,
        avatarUrl: true,
      },
    });

    // 11. Generate magic link token
    const magicToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.magicLink.create({
      data: {
        token: magicToken,
        userId: newUser.id,
        expiresAt,
        used: false,
      },
    });

    // 12. Generate magic link URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://taxgeniuspro.tax';
    const magicLink = `${baseUrl}/auth/setup-password?token=${magicToken}`;

    // 13. Get final tracking code (custom or auto)
    const finalTrackingCode = updatedProfile?.customTrackingCode || updatedProfile?.trackingCode || trackingCode;

    // 14. Generate referral URLs
    const intakeFormUrl = `${baseUrl}/start-filing?ref=${finalTrackingCode}`;
    const appointmentUrl = `${baseUrl}/appointment?ref=${finalTrackingCode}`;

    // 15. Send welcome email with magic link
    try {
      const emailSent = await EmailService.sendTaxPreparerWelcomeEmail(
        email,
        firstName,
        email,
        finalTrackingCode,
        magicLink,
        '24 hours'
      );

      if (emailSent) {
        logger.info(`Welcome email sent to ${email} with magic link`);
      } else {
        logger.warn(`Failed to send welcome email to ${email}, but account created successfully`);
      }
    } catch (emailError) {
      // Don't fail the entire request if email fails
      logger.error('Error sending welcome email:', emailError);
      logger.info(`Account created but email failed for ${email} - manual intervention may be needed`);
    }

    // 16. Return complete account details
    return NextResponse.json({
      success: true,
      message: 'Tax preparer account created successfully',
      data: {
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        profileId: updatedProfile?.id,
        firstName,
        lastName,
        middleName,
        phone,
        trackingCode: finalTrackingCode,
        magicLink,
        magicLinkExpiry: expiresAt.toISOString(),
        qrCodeUrl: updatedProfile?.trackingCodeQRUrl,
        intakeFormUrl,
        appointmentUrl,
        profilePhotoUrl: updatedProfile?.avatarUrl,
      },
    });
  } catch (error) {
    logger.error('Error creating tax preparer account:', error);
    return NextResponse.json(
      { error: 'Failed to create tax preparer account' },
      { status: 500 }
    );
  }
}
