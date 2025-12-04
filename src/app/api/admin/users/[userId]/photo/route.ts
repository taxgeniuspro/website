/**
 * Admin API: Upload Photo for User
 *
 * POST: Upload and set profile photo for a tax preparer
 */

import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import sharp from 'sharp';

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // 1. Check admin permissions
    const session = await auth();
    const adminUserId = session?.user?.id;

    if (!adminUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get admin's profile
    const adminProfile = await prisma.profile.findUnique({
      where: { userId: adminUserId },
      select: { role: true },
    });

    if (!adminProfile || !['super_admin', 'admin'].includes(adminProfile.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // 2. Get target user's profile
    const targetProfile = await prisma.profile.findUnique({
      where: { userId: params.userId },
      select: { id: true, userId: true, role: true },
    });

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
    await prisma.profile.update({
      where: { id: targetProfile.id },
      data: {
        avatarUrl: dataUrl,
        qrCodeLogoUrl: dataUrl, // Use same photo for QR branding
      },
    });

    logger.info(`Admin ${adminUserId} uploaded photo for user ${params.userId}`);

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
