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
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces for Supabase response types
interface ReferralImage {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  altText: string | null;
  sortOrder: number;
}

interface ReferralImageSet {
  id: string;
  preparerId: string | null;
  folderType: string;
  category: string;
  isActive: boolean;
  referral_images: ReferralImage[];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const preparerCode = searchParams.get('ref');

    let preparerId: string | undefined;

    // If preparer code is provided, look up the preparer
    if (preparerCode) {
      const { data: preparerData } = await db
        .from('profiles')
        .select('id')
        .or(`customTrackingCode.eq.${preparerCode},trackingCode.eq.${preparerCode}`)
        .eq('role', 'tax_preparer')
        .limit(1);

      const preparer = firstOrNull(preparerData);
      preparerId = preparer?.id;
    }

    // First, try preparer-specific images
    let imageSet: ReferralImageSet | null = null;
    if (preparerId) {
      const { data: imageSetData } = await db
        .from('referral_image_sets')
        .select(`
          id,
          preparerId,
          folderType,
          category,
          isActive,
          referral_images (
            id,
            imageUrl,
            thumbnailUrl,
            altText,
            sortOrder
          )
        `)
        .eq('preparerId', preparerId)
        .eq('folderType', 'preseason_loans')
        .eq('category', 'preparer')
        .eq('isActive', true)
        .order('sortOrder', { referencedTable: 'referral_images', ascending: true })
        .limit(1);

      const result = firstOrNull(imageSetData) as ReferralImageSet | null;

      // Only use if it has images
      if (result?.referral_images?.length) {
        // Limit to 4 images
        result.referral_images = result.referral_images.slice(0, 4);
        imageSet = result;
      }
    }

    // Fallback to defaults if no preparer images
    if (!imageSet) {
      const { data: defaultImageSetData } = await db
        .from('referral_image_sets')
        .select(`
          id,
          preparerId,
          folderType,
          category,
          isActive,
          referral_images (
            id,
            imageUrl,
            thumbnailUrl,
            altText,
            sortOrder
          )
        `)
        .eq('category', 'default')
        .is('preparerId', null)
        .eq('folderType', 'preseason_loans')
        .eq('isActive', true)
        .order('sortOrder', { referencedTable: 'referral_images', ascending: true })
        .limit(1);

      const result = firstOrNull(defaultImageSetData) as ReferralImageSet | null;
      if (result?.referral_images?.length) {
        // Limit to 4 images
        result.referral_images = result.referral_images.slice(0, 4);
        imageSet = result;
      }
    }

    if (!imageSet || imageSet.referral_images.length === 0) {
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
    const imageIndex = rotationCycle % imageSet.referral_images.length;

    const currentImage = imageSet.referral_images[imageIndex];

    return NextResponse.json({
      success: true,
      image: {
        id: currentImage.id,
        url: currentImage.imageUrl,
        thumbnailUrl: currentImage.thumbnailUrl,
        alt: currentImage.altText,
        rotationIndex: imageIndex,
        totalImages: imageSet.referral_images.length,
        nextRotationDays: 3 - (daysSinceEpoch % 3),
      },
      allImages: imageSet.referral_images.map((img, index) => ({
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
