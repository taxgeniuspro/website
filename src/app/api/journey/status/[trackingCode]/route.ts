/**
 * Journey Status API Endpoint
 *
 * GET /api/journey/status/[trackingCode]
 * Gets the current status of a customer journey
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJourneyStatus } from '@/lib/services/journey-tracking.service';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingCode: string }> }
) {
  try {
    const { trackingCode } = await params;

    if (!trackingCode) {
      return NextResponse.json({ error: 'Tracking code is required' }, { status: 400 });
    }

    const status = await getJourneyStatus(trackingCode);

    if (!status) {
      return NextResponse.json(
        { found: false, message: 'Journey not found for this tracking code' },
        { status: 404 }
      );
    }

    return NextResponse.json(status);
  } catch (error) {
    logger.error('Get journey status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
