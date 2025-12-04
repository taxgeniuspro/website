/**
 * Regenerate QR Codes API - DISABLED
 *
 * This endpoint has been disabled because QR codes are permanently linked to tracking codes
 * and should not be regenerated to avoid confusion with printed marketing materials.
 *
 * QR codes are automatically generated when:
 * - User first receives a tracking code (on signup)
 * - User customizes their tracking code
 * - Marketing links are created
 */

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * POST: Disabled - QR codes are permanent and cannot be regenerated
 */
export async function POST() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    logger.warn(`User ${userId} attempted to regenerate QR codes - feature is disabled`);

    return NextResponse.json(
      {
        error: 'QR code regeneration is disabled',
        message:
          'QR codes are permanently linked to your tracking code and cannot be regenerated. This prevents confusion with printed marketing materials (business cards, flyers, etc.). Your QR code was created when you set up your tracking code.',
      },
      { status: 403 }
    );
  } catch (error) {
    logger.error('Error in regenerate-qr endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
