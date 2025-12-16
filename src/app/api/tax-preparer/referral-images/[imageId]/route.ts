/**
 * Tax Preparer Referral Image API - Individual Image Operations
 *
 * DELETE /api/tax-preparer/referral-images/[imageId] - Delete an image from preparer's folder
 * PATCH /api/tax-preparer/referral-images/[imageId] - Update image metadata
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
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const session = await auth();
    const { imageId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get preparer profile
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, role: true },
    });

    if (!profile || !['tax_preparer', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Not authorized as tax preparer' }, { status: 403 });
    }

    // Get the image and verify ownership
    const image = await prisma.referralImage.findUnique({
      where: { id: imageId },
      include: {
        set: {
          select: { preparerId: true, category: true },
        },
      },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Verify the image belongs to this preparer (or they're admin)
    if (image.set.preparerId !== profile.id && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized to delete this image' }, { status: 403 });
    }

    // Extract Cloudinary public_id from URL
    const urlParts = image.imageUrl.split('/');
    const publicIdWithExt = urlParts.slice(-4).join('/'); // taxgeniuspro/referral-images/...
    const publicId = publicIdWithExt.replace(/\.[^.]+$/, ''); // Remove extension

    // Delete from Cloudinary (don't fail if this errors)
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (cloudinaryError) {
      logger.warn('Failed to delete image from Cloudinary', { publicId, error: String(cloudinaryError) });
    }

    // Delete from database
    await prisma.referralImage.delete({
      where: { id: imageId },
    });

    logger.info('Deleted referral image', {
      imageId,
      preparerId: profile.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting referral image', { error });
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const session = await auth();
    const { imageId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get preparer profile
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, role: true },
    });

    if (!profile || !['tax_preparer', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Not authorized as tax preparer' }, { status: 403 });
    }

    // Get the image and verify ownership
    const image = await prisma.referralImage.findUnique({
      where: { id: imageId },
      include: {
        set: {
          select: { preparerId: true },
        },
      },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Verify the image belongs to this preparer (or they're admin)
    if (image.set.preparerId !== profile.id && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized to update this image' }, { status: 403 });
    }

    const body = await request.json();
    const { altText, platform, sortOrder } = body;

    // Update the image
    const updatedImage = await prisma.referralImage.update({
      where: { id: imageId },
      data: {
        ...(altText !== undefined && { altText }),
        ...(platform !== undefined && { platform }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    logger.info('Updated referral image', {
      imageId,
      preparerId: profile.id,
    });

    return NextResponse.json({
      success: true,
      image: {
        id: updatedImage.id,
        altText: updatedImage.altText,
        platform: updatedImage.platform,
        sortOrder: updatedImage.sortOrder,
      },
    });
  } catch (error) {
    logger.error('Error updating referral image', { error });
    return NextResponse.json(
      { error: 'Failed to update image' },
      { status: 500 }
    );
  }
}
