/**
 * GET /api/cash-advance/og
 *
 * Dynamic Open Graph image for the cash advance page.
 * Returns the promotional image from the referral-images system.
 *
 * Query params:
 * - ref: Optional preparer tracking code
 *
 * Logic:
 * - If ref is provided and preparer has custom preseason_loans images, use those
 * - Otherwise, use default preseason_loans images
 * - Falls back to static og-cash-advance.jpg if no images configured
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
    let imageUrl: string | null = null;

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

      if (preparerSet?.images.length) {
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

      if (defaultSet?.images.length) {
        imageUrl = defaultSet.images[0].imageUrl;
      }
    }

    // If we have a dynamic image, redirect to it
    if (imageUrl) {
      return NextResponse.redirect(imageUrl);
    }

    // No image found - return 404
    // Note: Default images should exist in the database under folderType: 'preseason_loans'
    logger.error('No preseason_loans images found in database');
    return NextResponse.json({ error: 'No OG image available' }, { status: 404 });
  } catch (error) {
    logger.error('Error getting cash advance OG image', { error });
    return NextResponse.json({ error: 'Error generating OG image' }, { status: 500 });
  }
}
