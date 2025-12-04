/**
 * FunnelKit Tracking API
 *
 * Records funnel visits, page views, and customer journey data.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { funnelId, funnelStepId, pageUrl, referrer, utm, device, sessionId, timestamp } = body

    // Get current user if logged in (optional)
    const { user } = await validateRequest()

    // Create funnel visit record
    const visit = await prisma.funnelVisit.create({
      data: {
        funnelId: funnelId || null,
        funnelStepId: funnelStepId || null,
        userId: user?.id || null,
        sessionId,
        pageUrl,
        referrer: referrer || null,
        utmSource: utm?.source || null,
        utmMedium: utm?.medium || null,
        utmCampaign: utm?.campaign || null,
        utmTerm: utm?.term || null,
        utmContent: utm?.content || null,
        deviceType: device?.type || 'desktop',
        browser: device?.browser || 'unknown',
        os: device?.os || 'unknown',
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      visitId: visit.id,
    })
  } catch (error) {
    console.error('Error tracking funnel visit:', error)

    // Don't expose internal errors to client
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to track visit',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/funnels/track?sessionId=xxx
 * Retrieve tracking history for a session
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    }

    const visits = await prisma.funnelVisit.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'desc' },
      take: 50, // Last 50 visits
    })

    return NextResponse.json({
      sessionId,
      visits,
      count: visits.length,
    })
  } catch (error) {
    console.error('Error retrieving tracking data:', error)
    return NextResponse.json({ error: 'Failed to retrieve tracking data' }, { status: 500 })
  }
}
