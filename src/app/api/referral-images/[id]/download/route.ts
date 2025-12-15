/**
 * GET /api/referral-images/[id]/download
 *
 * Track download and redirect to the image URL.
 * Increments download counter for analytics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { incrementImageDownload } from '@/lib/services/client-referral.service';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get the image
    const image = await prisma.referralImage.findUnique({
      where: { id },
      select: {
        id: true,
        imageUrl: true,
        fileName: true,
      },
    });

    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Increment download counter (non-blocking)
    incrementImageDownload(id).catch((err) => {
      logger.warn('Failed to increment download count', { error: err, imageId: id });
    });

    // Redirect to the image URL
    return NextResponse.redirect(image.imageUrl);
  } catch (error) {
    logger.error('Error downloading referral image', { error });
    return NextResponse.json(
      { error: 'Failed to download image' },
      { status: 500 }
    );
  }
}
