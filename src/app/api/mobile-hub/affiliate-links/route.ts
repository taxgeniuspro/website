/**
 * Affiliate Links API
 *
 * GET /api/mobile-hub/affiliate-links - Get affiliate's shareable links
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://taxgeniuspro.tax';

    // Generate affiliate shareable links
    const links = {
      referralUrl: `${baseUrl}/ref/${userId}`,
      trackingUrl: `${baseUrl}/?aff=${userId}`,
    };

    return NextResponse.json({
      success: true,
      data: links,
    });
  } catch (error) {
    logger.error('Error fetching affiliate links:', error);
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
  }
}
