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
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces for Supabase response types
interface ReferralImage {
  id: string;
  imageUrl: string;
  sortOrder: number;
}

interface ReferralImageSet {
  id: string;
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
    let imageUrl: string | null = null;

    if (preparerId) {
      const { data: preparerSetData } = await db
        .from('referral_image_sets')
        .select(`
          id,
          referral_images (
            id,
            imageUrl,
            sortOrder
          )
        `)
        .eq('preparerId', preparerId)
        .eq('folderType', 'preseason_loans')
        .eq('category', 'preparer')
        .eq('isActive', true)
        .order('sortOrder', { referencedTable: 'referral_images', ascending: true })
        .limit(1);

      const preparerSet = firstOrNull(preparerSetData) as ReferralImageSet | null;

      if (preparerSet?.referral_images?.length) {
        imageUrl = preparerSet.referral_images[0].imageUrl;
      }
    }

    // Fallback to default images
    if (!imageUrl) {
      const { data: defaultSetData } = await db
        .from('referral_image_sets')
        .select(`
          id,
          referral_images (
            id,
            imageUrl,
            sortOrder
          )
        `)
        .eq('category', 'default')
        .is('preparerId', null)
        .eq('folderType', 'preseason_loans')
        .eq('isActive', true)
        .order('sortOrder', { referencedTable: 'referral_images', ascending: true })
        .limit(1);

      const defaultSet = firstOrNull(defaultSetData) as ReferralImageSet | null;

      if (defaultSet?.referral_images?.length) {
        imageUrl = defaultSet.referral_images[0].imageUrl;
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
