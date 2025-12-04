/**
 * QR Code Logo Management API
 *
 * POST: Upload and save cropped image as QR code logo
 * DELETE: Remove QR code logo (revert to default Tax Genius logo)
 */

import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import sharp from 'sharp';

/**
 * POST: Upload cropped image as QR code logo
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, role: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('logo') as File || formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process image: resize to 200x200, optimize for QR code center
    const processedImage = await sharp(buffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center',
      })
      .png({ quality: 90, compressionLevel: 9 })
      .toBuffer();

    // Convert to base64 data URL
    const dataUrl = `data:image/png;base64,${processedImage.toString('base64')}`;

    // Update profile with QR logo
    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        qrCodeLogoUrl: dataUrl,
      },
    });

    logger.info(`QR logo updated for profile ${profile.id}`);

    return NextResponse.json({
      success: true,
      qrCodeLogoUrl: dataUrl,
      message: 'QR code logo updated successfully',
    });
  } catch (error) {
    logger.error('Error uploading QR logo:', error);
    return NextResponse.json({ error: 'Failed to upload QR logo' }, { status: 500 });
  }
}

/**
 * DELETE: Remove QR code logo (revert to default)
 */
export async function DELETE() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Remove QR logo
    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        qrCodeLogoUrl: null,
      },
    });

    logger.info(`QR logo removed for profile ${profile.id}`);

    return NextResponse.json({
      success: true,
      message: 'QR code logo removed. Using default Tax Genius logo.',
    });
  } catch (error) {
    logger.error('Error removing QR logo:', error);
    return NextResponse.json({ error: 'Failed to remove QR logo' }, { status: 500 });
  }
}
