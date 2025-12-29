/**
 * GET /api/referral-images
 *
 * Get current promotional images for the referral program.
 * Returns images based on current date (preseason vs tax season)
 * and optionally preparer-specific images.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { getCurrentImageSet } from '@/lib/services/client-referral.service';
import { logger } from '@/lib/logger';

// TypeScript interface for profile with client preparers
interface ProfileWithPreparers {
  id: string;
  role: string;
  clientPreparers: Array<{ preparerId: string }>;
}

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
      // First get the profile
      const { data: profileData } = await db
        .from('profiles')
        .select('id, role')
        .eq('user_id', session.user.id)
        .limit(1);

      const profile = firstOrNull(profileData);

      if (profile) {
        // Then get active client-preparer relationships
        const { data: clientPreparersData } = await db
          .from('client_preparers')
          .select('preparer_id')
          .eq('client_id', profile.id)
          .eq('is_active', true)
          .limit(1);

        if (clientPreparersData && clientPreparersData.length > 0) {
          preparerId = clientPreparersData[0].preparer_id;
        }
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
