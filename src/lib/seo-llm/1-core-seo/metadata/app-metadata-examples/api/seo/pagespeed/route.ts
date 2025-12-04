/**
 * PageSpeed Insights API Route
 *
 * Provides PageSpeed performance data with authentication and rate limiting.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import {
  analyzeURL,
  getCoreWebVitals,
  getPerformanceScore,
  compareDevices,
  isPageSpeedConfigured,
} from '@/lib/seo/pagespeed-insights'
import { seoCache } from '@/lib/seo/cache-manager'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // PageSpeed can take up to 60 seconds

/**
 * GET /api/seo/pagespeed
 *
 * Query params:
 * - url: URL to analyze (required)
 * - strategy: 'mobile' | 'desktop' (default: 'mobile')
 * - type: 'full' | 'vitals' | 'score' | 'compare' (default: 'full')
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

    // Check if PageSpeed is configured
    if (!isPageSpeedConfigured()) {
      return NextResponse.json({ error: 'PageSpeed Insights API not configured' }, { status: 503 })
    }

    const searchParams = request.nextUrl.searchParams
    const url = searchParams.get('url')
    const strategy = (searchParams.get('strategy') as 'mobile' | 'desktop') || 'mobile'
    const type = searchParams.get('type') || 'full'

    // Validate URL parameter
    if (!url) {
      return NextResponse.json({ error: 'Missing required parameter: url' }, { status: 400 })
    }

    // Check rate limit
    if (!seoCache.canMakeRequest('pagespeed')) {
      const status = seoCache.getRateLimitStatus('pagespeed')
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          limit: status.limit,
          resetAt: status.resetAt,
        },
        { status: 429 }
      )
    }

    // Check cache first (24-hour retention for PageSpeed)
    const cacheKey = `seo_pagespeed_${type}_${url}_${strategy}`
    const cached = seoCache.getCached(cacheKey)
    if (cached) {
      return NextResponse.json({ data: cached, cached: true })
    }

    let data: any = null

    switch (type) {
      case 'full':
        data = await analyzeURL(url, strategy)
        break

      case 'vitals':
        data = await getCoreWebVitals(url)
        break

      case 'score':
        data = await getPerformanceScore(url)
        break

      case 'compare':
        data = await compareDevices(url)
        break

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Failed to analyze URL' }, { status: 500 })
    }

    // Increment rate limit
    seoCache.incrementRateLimit('pagespeed')

    // Cache the result (24 hours)
    seoCache.setCached(cacheKey, data)

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('PageSpeed API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
