/**
 * Dynamic Open Graph Image Route for Cash Advance Page
 *
 * This route generates/returns the OG image based on the ref parameter.
 * Facebook/Twitter crawlers will fetch this URL for the og:image.
 *
 * URL: /[locale]/cash-advance/opengraph-image?ref=CODE
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');

    let imageUrl: string | null = null;
    let preparerId: string | undefined;

    // If preparer code is provided, look up the preparer
    if (ref) {
      const { data: preparerData } = await db
        .from('profiles')
        .select('id')
        .or(`custom_tracking_code.eq.${ref},tracking_code.eq.${ref}`)
        .eq('role', 'tax_preparer')
        .limit(1);

      const preparer = firstOrNull(preparerData);
      preparerId = preparer?.id;
    }

    // First, try preparer-specific images
    if (preparerId) {
      const { data: preparerSetData } = await db
        .from('referral_image_sets')
        .select(`
          *,
          referral_images(*)
        `)
        .eq('preparer_id', preparerId)
        .eq('folder_type', 'preseason_loans')
        .eq('category', 'preparer')
        .eq('is_active', true)
        .limit(1);

      const preparerSet = firstOrNull(preparerSetData);
      const images = (preparerSet?.referral_images || [])
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        .slice(0, 1);

      if (images.length && images[0].image_url) {
        imageUrl = images[0].image_url;
      }
    }

    // Fallback to default images
    if (!imageUrl) {
      const { data: defaultSetData } = await db
        .from('referral_image_sets')
        .select(`
          *,
          referral_images(*)
        `)
        .eq('category', 'default')
        .is('preparer_id', null)
        .eq('folder_type', 'preseason_loans')
        .eq('is_active', true)
        .limit(1);

      const defaultSet = firstOrNull(defaultSetData);
      const images = (defaultSet?.referral_images || [])
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        .slice(0, 1);

      if (images.length && images[0].image_url) {
        imageUrl = images[0].image_url;
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
