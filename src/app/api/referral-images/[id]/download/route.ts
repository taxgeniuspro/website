/**
 * GET /api/referral-images/[id]/download
 *
 * Track download and redirect to the image URL.
 * Increments download counter for analytics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { incrementImageDownload } from '@/lib/services/client-referral.service';
import { logger } from '@/lib/logger';

// TypeScript interface for referral image
interface ReferralImage {
  id: string;
  imageUrl: string;
  fileName: string | null;
}

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get the image
    const { data: imageData, error } = await db
      .from('referral_images')
      .select('id, image_url, file_name')
      .eq('id', id)
      .limit(1);

    const image = firstOrNull(imageData);

    if (error || !image) {
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
    return NextResponse.redirect(image.image_url);
  } catch (error) {
    logger.error('Error downloading referral image', { error });
    return NextResponse.json(
      { error: 'Failed to download image' },
      { status: 500 }
    );
  }
}
