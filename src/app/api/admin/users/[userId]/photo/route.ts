/**
 * Admin API: Upload Photo for User
 *
 * POST: Upload and set profile photo for a tax preparer
 */

import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import sharp from 'sharp';

// Local interfaces
interface Profile {
  id: string;
  userId: string;
  role: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 1. Check admin permissions
    const session = await auth();
    const adminUserId = session?.user?.id;

    if (!adminUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get admin's profile
    const { data: adminProfileData, error: adminProfileError } = await db.from('profiles')
      .select('role')
      .eq('userId', adminUserId)
      .limit(1);

    if (adminProfileError) {
      throw adminProfileError;
    }

    const adminProfile = firstOrNull<{ role: string }>(adminProfileData);

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // 2. Get target user's profile
    const { userId } = await params;

    const { data: targetProfileData, error: targetProfileError } = await db.from('profiles')
      .select('id, userId, role')
      .eq('userId', userId)
      .limit(1);

    if (targetProfileError) {
      throw targetProfileError;
    }

    const targetProfile = firstOrNull<Profile>(targetProfileData);

    if (!targetProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // 3. Get form data
    const formData = await request.formData();
    const file = formData.get('photo') as File || formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 4. Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // 5. Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    // 6. Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 7. Process image: resize to 200x200, optimize for QR code center
    const processedImage = await sharp(buffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center',
      })
      .png({ quality: 90, compressionLevel: 9 })
      .toBuffer();

    // 8. Convert to base64 data URL
    const dataUrl = `data:image/png;base64,${processedImage.toString('base64')}`;

    // 9. Update profile with photo
    const { error: updateError } = await db.from('profiles')
      .update({
        avatarUrl: dataUrl,
        qrCodeLogoUrl: dataUrl, // Use same photo for QR branding
      })
      .eq('id', targetProfile.id);

    if (updateError) {
      throw updateError;
    }

    logger.info(`Admin ${adminUserId} uploaded photo for user ${userId}`);

    return NextResponse.json({
      success: true,
      photoUrl: dataUrl,
      message: 'Profile photo updated successfully',
    });
  } catch (error) {
    logger.error('Error uploading user photo:', error);
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
  }
}
