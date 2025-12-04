/**
 * Journey Tracking API Endpoint
 *
 * POST /api/journey/track
 * Tracks customer journey stages (intake start, intake complete, return filed)
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackJourneyStage, type JourneyStage } from '@/lib/services/journey-tracking.service';
import { getUTMCookie } from '@/lib/utils/cookie-manager';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { stage, userId, metadata } = body;

    // Validate stage
    const validStages: JourneyStage[] = [
      'CLICKED',
      'INTAKE_STARTED',
      'INTAKE_COMPLETED',
      'RETURN_FILED',
    ];
    if (!validStages.includes(stage)) {
      return NextResponse.json({ error: 'Invalid journey stage' }, { status: 400 });
    }

    // Get tracking code from UTM cookie
    const attribution = await getUTMCookie();

    if (!attribution) {
      return NextResponse.json(
        { error: 'No tracking attribution found. User may have cleared cookies.' },
        { status: 404 }
      );
    }

    // Track the journey stage
    const result = await trackJourneyStage({
      trackingCode: attribution.trackingCode,
      stage,
      userId,
      metadata,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to track journey stage' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      journeyStage: result.journeyStage,
      attribution: result.attribution,
    });
  } catch (error) {
    logger.error('Journey tracking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/journey/track
 * Get current journey status from cookie
 */
export async function GET() {
  try {
    const attribution = await getUTMCookie();

    if (!attribution) {
      return NextResponse.json(
        { found: false, message: 'No tracking attribution found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      found: true,
      attribution: {
        source: attribution.source,
        medium: attribution.medium,
        campaign: attribution.campaign,
        content: attribution.content,
        term: attribution.term,
        trackingCode: attribution.trackingCode,
        firstTouch: new Date(attribution.firstTouch).toISOString(),
        lastTouch: new Date(attribution.lastTouch).toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get journey status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
