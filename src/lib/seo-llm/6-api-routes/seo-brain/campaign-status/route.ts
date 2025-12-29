/**
 * SEO Brain API - Campaign Status
 *
 * GET /api/seo-brain/campaign-status?campaignId=xxx
 *
 * Get real-time status of campaign generation
 */

import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { db, firstOrNull } from '@/lib/db'

// TypeScript interfaces (replaces Prisma types)
interface ProductCampaignQueue {
  id: string
  productName: string
  status: string
  generationStartedAt: string | null
  generationCompletedAt: string | null
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

    // Get campaign
    const { data: campaignData } = await db
      .from('product_campaign_queues')
      .select('*')
      .eq('id', campaignId)
      .limit(1)

    const campaign = firstOrNull<ProductCampaignQueue>(campaignData)

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get city pages count
    const { count: cityPagesCount } = await db
      .from('city_landing_pages')
      .select('id', { count: 'exact', head: true })
      .eq('landingPageSetId', campaignId)

    const cityPages = cityPagesCount || 0

    // Calculate progress
    const totalCities = 200
    const progress = Math.round((cityPages / totalCities) * 100)

    // Estimate time remaining (if generating)
    let estimatedTimeRemaining = null
    if (campaign.status === 'GENERATING' && campaign.generationStartedAt) {
      const elapsed = Date.now() - new Date(campaign.generationStartedAt).getTime()
      const avgTimePerCity = elapsed / cityPages
      const remaining = (totalCities - cityPages) * avgTimePerCity
      estimatedTimeRemaining = Math.round(remaining / 1000 / 60) // minutes
    }

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        productName: campaign.productName,
        status: campaign.status,
        citiesGenerated: cityPages,
        totalCities,
        progress,
        estimatedTimeRemaining,
        startedAt: campaign.generationStartedAt,
        completedAt: campaign.generationCompletedAt,
      },
    })
  } catch (error) {
    console.error('[SEO Brain API] Status check error:', error)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}
