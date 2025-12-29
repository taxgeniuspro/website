/**
 * SEO Brain API - Performance Data
 *
 * GET /api/seo-brain/performance?campaignId=xxx
 *
 * Get performance metrics for a campaign
 */

import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

// TypeScript interface for CityLandingPage
interface CityLandingPage {
  id: string;
  slug: string;
  views: number;
  revenue: number;
  conversionRate: number | null;
  orderCount?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const campaignId = searchParams.get('campaignId')

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    // Get all city pages for this campaign
    const { data: cityPagesRaw, error: fetchError } = await db
      .from('city_landing_pages')
      .select('id, slug, views, revenue, conversionRate')
      .eq('landingPageSetId', campaignId)
      .order('revenue', { ascending: false })

    if (fetchError) {
      throw fetchError
    }

    const cityPages = (cityPagesRaw || []) as CityLandingPage[]

    // For each city page, get order count
    const cityPagesWithOrders: CityLandingPage[] = []
    for (const page of cityPages) {
      const { count } = await db
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('cityLandingPageId', page.id)

      cityPagesWithOrders.push({
        ...page,
        orderCount: count || 0,
      })
    }

    // Calculate metrics
    const totalViews = cityPagesWithOrders.reduce((sum, page) => sum + page.views, 0)
    const totalConversions = cityPagesWithOrders.reduce((sum, page) => sum + (page.orderCount || 0), 0)
    const totalRevenue = cityPagesWithOrders.reduce((sum, page) => sum + (typeof page.revenue === 'number' ? page.revenue : 0), 0)

    // Top 10 performers
    const topPerformers = cityPagesWithOrders.slice(0, 10).map((page) => ({
      city: page.slug,
      views: page.views,
      conversions: page.orderCount || 0,
      revenue: typeof page.revenue === 'number' ? page.revenue : 0,
      conversionRate: page.conversionRate || 0,
    }))

    // Bottom 10 performers
    const bottomPerformers = cityPagesWithOrders
      .slice(-10)
      .reverse()
      .map((page) => ({
        city: page.slug,
        views: page.views,
        conversions: page.orderCount || 0,
        revenue: typeof page.revenue === 'number' ? page.revenue : 0,
        conversionRate: page.conversionRate || 0,
      }))

    return NextResponse.json({
      success: true,
      summary: {
        totalCities: cityPagesWithOrders.length,
        totalViews,
        totalConversions,
        totalRevenue,
        avgConversionRate: totalViews > 0 ? totalConversions / totalViews : 0,
      },
      topPerformers,
      bottomPerformers,
    })
  } catch (error) {
    logger.error('[SEO Brain API] Performance error', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json({ error: 'Failed to fetch performance' }, { status: 500 })
  }
}
