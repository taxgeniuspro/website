/**
 * QR Code Logo Management API
 *
 * POST: Upload and save cropped image as QR code logo
 * DELETE: Remove QR code logo (revert to default Tax Genius logo)
 */

import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import sharp from 'sharp';

/** Profile data interface */
interface Profile {
  id: string;
  role: string;
}

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
    const { data: profiles, error: fetchError } = await db
      .from('profiles')
      .select('id, role')
      .eq('userId', userId);

    if (fetchError) {
      logger.error('Error fetching profile:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const profile = firstOrNull<Profile>(profiles);

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
    const { error: updateError } = await db
      .from('profiles')
      .update({ qrCodeLogoUrl: dataUrl })
      .eq('id', profile.id);

    if (updateError) {
      logger.error('Error updating QR logo:', updateError);
      return NextResponse.json({ error: 'Failed to update QR logo' }, { status: 500 });
    }

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
    const { data: profiles, error: fetchError } = await db
      .from('profiles')
      .select('id')
      .eq('userId', userId);

    if (fetchError) {
      logger.error('Error fetching profile:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const profile = firstOrNull<{ id: string }>(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Remove QR logo
    const { error: updateError } = await db
      .from('profiles')
      .update({ qrCodeLogoUrl: null })
      .eq('id', profile.id);

    if (updateError) {
      logger.error('Error removing QR logo:', updateError);
      return NextResponse.json({ error: 'Failed to remove QR logo' }, { status: 500 });
    }

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
