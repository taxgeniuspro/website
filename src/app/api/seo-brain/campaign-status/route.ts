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
import { logger } from '@/lib/logger'

// TypeScript interface for Campaign
interface ProductCampaign {
  id: string;
  productName: string;
  status: string;
  generationStartedAt: string | null;
  generationCompletedAt: string | null;
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

    // Get campaign
    const { data: campaignData, error: fetchError } = await db
      .from('product_campaign_queue')
      .select('id, productName, status, generationStartedAt, generationCompletedAt')
      .eq('id', campaignId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      }
      throw fetchError
    }

    const campaign = campaignData as ProductCampaign

    // Get city pages count
    const { count: cityPages } = await db
      .from('city_landing_pages')
      .select('*', { count: 'exact', head: true })
      .eq('landingPageSetId', campaignId)

    const cityPagesCount = cityPages || 0

    // Calculate progress
    const totalCities = 200
    const progress = Math.round((cityPagesCount / totalCities) * 100)

    // Estimate time remaining (if generating)
    let estimatedTimeRemaining = null
    if (campaign.status === 'GENERATING' && campaign.generationStartedAt && cityPagesCount > 0) {
      const elapsed = Date.now() - new Date(campaign.generationStartedAt).getTime()
      const avgTimePerCity = elapsed / cityPagesCount
      const remaining = (totalCities - cityPagesCount) * avgTimePerCity
      estimatedTimeRemaining = Math.round(remaining / 1000 / 60) // minutes
    }

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        productName: campaign.productName,
        status: campaign.status,
        citiesGenerated: cityPagesCount,
        totalCities,
        progress,
        estimatedTimeRemaining,
        startedAt: campaign.generationStartedAt,
        completedAt: campaign.generationCompletedAt,
      },
    })
  } catch (error) {
    logger.error('[SEO Brain API] Status check error', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}
