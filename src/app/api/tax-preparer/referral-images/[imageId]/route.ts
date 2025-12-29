/**
 * Tax Preparer Referral Image API - Individual Image Operations
 *
 * DELETE /api/tax-preparer/referral-images/[imageId] - Delete an image from preparer's folder
 * PATCH /api/tax-preparer/referral-images/[imageId] - Update image metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { DiskStorageService } from '@/lib/services/disk-storage.service';

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
    const { data: profiles } = await db
      .from('profiles')
      .select('id, role')
      .eq('userId', session.user.id)
      .limit(1);

    const profile = firstOrNull(profiles);

    if (!profile || !['tax_preparer', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Not authorized as tax preparer' }, { status: 403 });
    }

    // Get the image and verify ownership
    const { data: images } = await db
      .from('referral_images')
      .select(
        `
        id,
        imageUrl,
        set:referral_image_sets!setId (
          preparerId,
          category
        )
      `
      )
      .eq('id', imageId)
      .limit(1);

    const image = firstOrNull(images);

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Verify the image belongs to this preparer (or they're admin)
    const setData = image.set as { preparerId: string; category: string } | null;
    if (setData?.preparerId !== profile.id && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized to delete this image' }, { status: 403 });
    }

    // Extract storage key from URL (format: /api/uploads/referral-images/...)
    const urlMatch = image.imageUrl.match(/\/api\/uploads\/(.+)$/);
    if (urlMatch) {
      const storageKey = urlMatch[1];
      try {
        await DiskStorageService.deleteFile(storageKey);
      } catch (storageError) {
        logger.warn('Failed to delete image from disk storage', {
          storageKey,
          error: String(storageError),
        });
      }
    }

    // Delete from database
    await db.from('referral_images').delete().eq('id', imageId);

    logger.info('Deleted referral image', {
      imageId,
      preparerId: profile.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting referral image', { error });
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
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
    const { data: profiles } = await db
      .from('profiles')
      .select('id, role')
      .eq('userId', session.user.id)
      .limit(1);

    const profile = firstOrNull(profiles);

    if (!profile || !['tax_preparer', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Not authorized as tax preparer' }, { status: 403 });
    }

    // Get the image and verify ownership
    const { data: images } = await db
      .from('referral_images')
      .select(
        `
        id,
        set:referral_image_sets!setId (
          preparerId
        )
      `
      )
      .eq('id', imageId)
      .limit(1);

    const image = firstOrNull(images);

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Verify the image belongs to this preparer (or they're admin)
    const setData = image.set as { preparerId: string } | null;
    if (setData?.preparerId !== profile.id && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized to update this image' }, { status: 403 });
    }

    const body = await request.json();
    const { altText, platform, sortOrder } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (altText !== undefined) updateData.altText = altText;
    if (platform !== undefined) updateData.platform = platform;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    // Update the image
    const { data: updatedImage, error: updateError } = await db
      .from('referral_images')
      .update(updateData)
      .eq('id', imageId)
      .select('id, altText, platform, sortOrder')
      .single();

    if (updateError || !updatedImage) {
      throw new Error(updateError?.message || 'Failed to update image');
    }

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
    return NextResponse.json({ error: 'Failed to update image' }, { status: 500 });
  }
}
