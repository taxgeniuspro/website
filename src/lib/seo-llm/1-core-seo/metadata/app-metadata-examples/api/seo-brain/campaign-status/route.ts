/**
 * SEO Brain API - Campaign Status
 *
 * GET /api/seo-brain/campaign-status?campaignId=xxx
 *
 * Get real-time status of campaign generation
 */

import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const campaign = await prisma.productCampaignQueue.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get city pages count
    const cityPages = await prisma.cityLandingPage.count({
      where: { landingPageSetId: campaignId },
    })

    // Calculate progress
    const totalCities = 200
    const progress = Math.round((cityPages / totalCities) * 100)

    // Estimate time remaining (if generating)
    let estimatedTimeRemaining = null
    if (campaign.status === 'GENERATING' && campaign.generationStartedAt) {
      const elapsed = Date.now() - campaign.generationStartedAt.getTime()
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
