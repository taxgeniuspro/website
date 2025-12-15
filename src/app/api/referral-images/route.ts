/**
 * GET /api/referral-images
 *
 * Get current promotional images for the referral program.
 * Returns images based on current date (preseason vs tax season)
 * and optionally preparer-specific images.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCurrentImageSet } from '@/lib/services/client-referral.service';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    // Optional: Get preparer ID from query or session
    const { searchParams } = new URL(req.url);
    const preparerIdParam = searchParams.get('preparerId');

    let preparerId: string | undefined;

    // If preparerId is provided, use it
    // Otherwise, if user is a client, try to get their preparer's images
    if (preparerIdParam) {
      preparerId = preparerIdParam;
    } else if (session?.user?.id) {
      const profile = await prisma.profile.findUnique({
        where: { userId: session.user.id },
        select: {
          id: true,
          role: true,
          clientPreparers: {
            where: { isActive: true },
            select: { preparerId: true },
            take: 1,
          },
        },
      });

      if (profile?.clientPreparers?.[0]?.preparerId) {
        preparerId = profile.clientPreparers[0].preparerId;
      }
    }

    // Get current image set
    const imageSet = await getCurrentImageSet(preparerId);

    if (!imageSet) {
      return NextResponse.json({
        success: true,
        imageSet: null,
        message: 'No promotional images available at this time',
      });
    }

    return NextResponse.json({
      success: true,
      imageSet: {
        id: imageSet.id,
        name: imageSet.name,
        category: imageSet.category,
        images: imageSet.images.map((img) => ({
          id: img.id,
          url: img.url,
          thumbnailUrl: img.thumbnailUrl,
          alt: img.alt,
          platform: img.platform,
          downloadUrl: `/api/referral-images/${img.id}/download`,
        })),
      },
    });
  } catch (error) {
    logger.error('Error getting referral images', { error });
    return NextResponse.json(
      { error: 'Failed to get referral images' },
      { status: 500 }
    );
  }
}
