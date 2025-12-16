/**
 * Admin Referral Image API (Single Image)
 *
 * DELETE /api/admin/referral-images/[imageId] - Delete an image
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { imageId } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { role: true },
    });

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the image
    const image = await prisma.referralImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Try to delete from Cloudinary
    try {
      // Extract public_id from Cloudinary URL
      const urlParts = image.imageUrl.split('/');
      const publicIdWithExt = urlParts.slice(-2).join('/'); // e.g., "referral-images/abc123.jpg"
      const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ''); // Remove extension

      await cloudinary.uploader.destroy(publicId);
      logger.info('Deleted image from Cloudinary', { publicId });
    } catch (cloudinaryError) {
      logger.warn('Failed to delete from Cloudinary (continuing anyway)', { error: String(cloudinaryError) });
    }

    // Delete from database
    await prisma.referralImage.delete({
      where: { id: imageId },
    });

    logger.info('Deleted referral image', { imageId });

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting referral image', { error });
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
