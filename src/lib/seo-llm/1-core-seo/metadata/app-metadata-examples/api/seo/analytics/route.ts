/**
 * Google Analytics 4 API Route
 *
 * Provides GA4 traffic data with authentication and rate limiting.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import {
  getTrafficData,
  getTrafficSources,
  getDeviceBreakdown,
  getRealtimeTraffic,
  isGA4Configured,
} from '@/lib/seo/google-analytics-4'
import { seoCache } from '@/lib/seo/cache-manager'

export const dynamic = 'force-dynamic'

/**
 * GET /api/seo/analytics
 *
 * Query params:
 * - startDate: YYYY-MM-DD
 * - endDate: YYYY-MM-DD
 * - type: 'traffic' | 'sources' | 'devices' | 'realtime'
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const { user } = await validateRequest()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if GA4 is configured
    if (!isGA4Configured()) {
      return NextResponse.json({ error: 'Google Analytics 4 not configured' }, { status: 503 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'traffic'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Validate date parameters for non-realtime requests
    if (type !== 'realtime' && (!startDate || !endDate)) {
      return NextResponse.json(
        { error: 'Missing required parameters: startDate, endDate' },
        { status: 400 }
      )
    }

    // Check rate limit
    if (!seoCache.canMakeRequest('ga4')) {
      const status = seoCache.getRateLimitStatus('ga4')
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          limit: status.limit,
          resetAt: status.resetAt,
        },
        { status: 429 }
      )
    }

    // Check cache first
    const cacheKey = `seo_ga4_${type}_${startDate}_${endDate}`
    const cached = seoCache.getCached(cacheKey)
    if (cached) {
      return NextResponse.json({ data: cached, cached: true })
    }

    let data: any = null

    switch (type) {
      case 'realtime':
        data = await getRealtimeTraffic()
        break

      case 'traffic':
        data = await getTrafficData(startDate!, endDate!)
        break

      case 'sources':
        data = await getTrafficSources(startDate!, endDate!)
        break

      case 'devices':
        data = await getDeviceBreakdown(startDate!, endDate!)
        break

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 })
    }

    // Increment rate limit
    seoCache.incrementRateLimit('ga4')

    // Cache the result (4 hours for GA4 data)
    seoCache.setCached(cacheKey, data, undefined, 'session')

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
