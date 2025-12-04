/**
 * Tax Preparer Links API
 *
 * GET /api/mobile-hub/preparer-links - Get tax preparer's shareable links
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

    // Generate shareable links with user tracking
    const links = {
      intakeUrl: `${baseUrl}/start-filing?ref=${userId}`,
      leadUrl: `${baseUrl}/contact?ref=${userId}`,
    };

    return NextResponse.json({
      success: true,
      data: links,
    });
  } catch (error) {
    logger.error('Error fetching preparer links:', error);
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
  }
}
