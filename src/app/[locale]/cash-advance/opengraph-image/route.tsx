/**
 * Dynamic Open Graph Image Route for Cash Advance Page
 *
 * This route generates/returns the OG image based on the ref parameter.
 * Facebook/Twitter crawlers will fetch this URL for the og:image.
 *
 * URL: /[locale]/cash-advance/opengraph-image?ref=CODE
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');

    let imageUrl: string | null = null;
    let preparerId: string | undefined;

    // If preparer code is provided, look up the preparer
    if (ref) {
      const preparer = await prisma.profile.findFirst({
        where: {
          OR: [{ customTrackingCode: ref }, { trackingCode: ref }],
          role: 'tax_preparer',
        },
        select: { id: true },
      });
      preparerId = preparer?.id;
    }

    // First, try preparer-specific images
    if (preparerId) {
      const preparerSet = await prisma.referralImageSet.findFirst({
        where: {
          preparerId,
          folderType: 'preseason_loans',
          category: 'preparer',
          isActive: true,
        },
        include: {
          images: {
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
        },
      });

      if (preparerSet?.images.length && preparerSet.images[0].imageUrl) {
        imageUrl = preparerSet.images[0].imageUrl;
      }
    }

    // Fallback to default images
    if (!imageUrl) {
      const defaultSet = await prisma.referralImageSet.findFirst({
        where: {
          category: 'default',
          preparerId: null,
          folderType: 'preseason_loans',
          isActive: true,
        },
        include: {
          images: {
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
        },
      });

      if (defaultSet?.images.length && defaultSet.images[0].imageUrl) {
        imageUrl = defaultSet.images[0].imageUrl;
      }
    }

    // If we have an image URL, fetch it and return as image
    if (imageUrl) {
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      });
    }

    // No image found - return 404
    // Note: Default images should exist in the database under folderType: 'preseason_loans'
    console.error('No preseason_loans images found in database');
    return new NextResponse('No OG image available', { status: 404 });
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new NextResponse('Error generating OG image', { status: 500 });
  }
}
