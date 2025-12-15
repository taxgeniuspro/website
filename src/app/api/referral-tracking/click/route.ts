/**
 * POST /api/referral-tracking/click
 *
 * Track when a client referral link is clicked.
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackLinkClick } from '@/lib/services/client-referral.service';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { referralCode } = body;

    if (!referralCode) {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      );
    }

    const success = await trackLinkClick(referralCode);

    if (!success) {
      // Don't expose whether code exists - just return success
      logger.warn('Failed to track click - code may not exist', { referralCode });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error tracking referral click', { error });
    return NextResponse.json(
      { error: 'Failed to track click' },
      { status: 500 }
    );
  }
}
