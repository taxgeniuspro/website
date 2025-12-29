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

// Local type definitions (replacing @prisma/client)
interface CityLandingPage {
  id: string
  slug: string
  views: number
  revenue: number
  conversionRate?: number | null
  landingPageSetId: string
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const campaignId = searchParams.get('campaignId')

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    // Get all city pages for this campaign
    const { data: cityPagesData } = await db
      .from('city_landing_pages')
      .select('*')
      .eq('landingPageSetId', campaignId)
      .order('revenue', { ascending: false })

    const cityPagesRaw = (cityPagesData || []) as CityLandingPage[]

    // Get order counts for each page
    const pageIds = cityPagesRaw.map((p) => p.id)
    let orderCounts: Record<string, number> = {}
    if (pageIds.length > 0) {
      const { data: ordersData } = await db
        .from('orders')
        .select('cityLandingPageId')
        .in('cityLandingPageId', pageIds)

      ;(ordersData || []).forEach((order: any) => {
        const pageId = order.cityLandingPageId
        orderCounts[pageId] = (orderCounts[pageId] || 0) + 1
      })
    }

    // Add order counts to pages
    const cityPages = cityPagesRaw.map((page) => ({
      ...page,
      _count: { orders: orderCounts[page.id] || 0 },
    }))

    // Calculate metrics
    const totalViews = cityPages.reduce((sum, page) => sum + (page.views || 0), 0)
    const totalConversions = cityPages.reduce((sum, page) => sum + page._count.orders, 0)
    const totalRevenue = cityPages.reduce((sum, page) => sum + (typeof page.revenue === 'number' ? page.revenue : Number(page.revenue) || 0), 0)

    // Top 10 performers
    const topPerformers = cityPages.slice(0, 10).map((page) => ({
      city: page.slug,
      views: page.views || 0,
      conversions: page._count.orders,
      revenue: typeof page.revenue === 'number' ? page.revenue : Number(page.revenue) || 0,
      conversionRate: page.conversionRate || 0,
    }))

    // Bottom 10 performers
    const bottomPerformers = cityPages
      .slice(-10)
      .reverse()
      .map((page) => ({
        city: page.slug,
        views: page.views || 0,
        conversions: page._count.orders,
        revenue: typeof page.revenue === 'number' ? page.revenue : Number(page.revenue) || 0,
        conversionRate: page.conversionRate || 0,
      }))

    return NextResponse.json({
      success: true,
      summary: {
        totalCities: cityPages.length,
        totalViews,
        totalConversions,
        totalRevenue,
        avgConversionRate: totalConversions / totalViews || 0,
      },
      topPerformers,
      bottomPerformers,
    })
  } catch (error) {
    console.error('[SEO Brain API] Performance error:', error)
    return NextResponse.json({ error: 'Failed to fetch performance' }, { status: 500 })
  }
}
