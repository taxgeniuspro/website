/**
 * GET /api/cash-advance/images
 *
 * Get promotional images for the cash advance landing page.
 * Returns preseason_loans images with 3-day rotation logic.
 *
 * Logic:
 * - Gets up to 4 images from preseason_loans folder
 * - Rotates which image to show every 3 days
 * - If preparer has custom images, use those; otherwise use defaults
 * - If only 1 image exists, shows that one consistently
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const preparerCode = searchParams.get('ref');

    let preparerId: string | undefined;

    // If preparer code is provided, look up the preparer
    if (preparerCode) {
      const preparer = await prisma.profile.findFirst({
        where: {
          OR: [
            { customTrackingCode: preparerCode },
            { trackingCode: preparerCode },
          ],
          role: 'tax_preparer',
        },
        select: { id: true },
      });
      preparerId = preparer?.id;
    }

    // First, try preparer-specific images
    let imageSet = null;
    if (preparerId) {
      imageSet = await prisma.referralImageSet.findFirst({
        where: {
          preparerId,
          folderType: 'preseason_loans',
          category: 'preparer',
          isActive: true,
        },
        include: {
          images: {
            orderBy: { sortOrder: 'asc' },
            take: 4,
          },
        },
      });

      // Only use if it has images
      if (!imageSet?.images.length) {
        imageSet = null;
      }
    }

    // Fallback to defaults if no preparer images
    if (!imageSet) {
      imageSet = await prisma.referralImageSet.findFirst({
        where: {
          category: 'default',
          preparerId: null,
          folderType: 'preseason_loans',
          isActive: true,
        },
        include: {
          images: {
            orderBy: { sortOrder: 'asc' },
            take: 4,
          },
        },
      });
    }

    if (!imageSet || imageSet.images.length === 0) {
      return NextResponse.json({
        success: true,
        image: null,
        allImages: [],
        message: 'No promotional images available',
      });
    }

    // Calculate which image to show based on 3-day rotation
    // Days since epoch / 3 = which image index to show
    const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const rotationCycle = Math.floor(daysSinceEpoch / 3);
    const imageIndex = rotationCycle % imageSet.images.length;

    const currentImage = imageSet.images[imageIndex];

    return NextResponse.json({
      success: true,
      image: {
        id: currentImage.id,
        url: currentImage.imageUrl,
        thumbnailUrl: currentImage.thumbnailUrl,
        alt: currentImage.altText,
        rotationIndex: imageIndex,
        totalImages: imageSet.images.length,
        nextRotationDays: 3 - (daysSinceEpoch % 3),
      },
      allImages: imageSet.images.map((img, index) => ({
        id: img.id,
        url: img.imageUrl,
        thumbnailUrl: img.thumbnailUrl,
        alt: img.altText,
        isActive: index === imageIndex,
      })),
      isDefault: imageSet.category === 'default',
    });
  } catch (error) {
    logger.error('Error getting cash advance images', { error });
    return NextResponse.json(
      { error: 'Failed to get images' },
      { status: 500 }
    );
  }
}
