/**
 * SEO Brain API - Start Campaign
 *
 * POST /api/seo-brain/start-campaign
 *
 * Starts a new 200-city landing page campaign
 */

import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generate200CityPages } from '@/lib/seo-brain/city-page-generator'
import { sendCampaignCompleteAlert } from '@/lib/seo-brain/telegram-notifier'

export async function POST(request: NextRequest) {
  try {
    // Admin only
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productName, quantity, size, material, turnaround, price, keywords, industries } = body

    // Validation
    if (!productName || !quantity || !size || !material || !turnaround || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create campaign
    const campaign = await prisma.productCampaignQueue.create({
      data: {
        id: `campaign-${Date.now()}`,
        productName,
        productSpec: {
          quantity,
          size,
          material,
          turnaround,
          price,
          onlineOnly: true,
          keywords: keywords || [],
          industries: industries || [],
        },
        status: 'PENDING',
        priority: 5,
        citiesGenerated: 0,
        citiesIndexed: 0,
      },
    })

    // Start generation in background (don't await - it takes 6-7 hours)
    startCampaignGeneration(campaign.id, {
      productName,
      quantity,
      size,
      material,
      turnaround,
      price,
      onlineOnly: true,
      keywords: keywords || [],
      industries: industries || [],
    })

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      status: 'PENDING',
      message:
        'Campaign started. Generation will take 6-7 hours. You will receive Telegram notification when complete.',
    })
  } catch (error) {
    console.error('[SEO Brain API] Start campaign error:', error)
    return NextResponse.json({ error: 'Failed to start campaign' }, { status: 500 })
  }
}

/**
 * Start campaign generation in background
 */
async function startCampaignGeneration(campaignId: string, productSpec: any) {
  try {
    // Update status
    await prisma.productCampaignQueue.update({
      where: { id: campaignId },
      data: {
        status: 'GENERATING',
        generationStartedAt: new Date(),
      },
    })

    // Initialize Ollama client
    const ollamaClient = {
      generate: async (prompt: string) => {
        const response = await fetch(
          `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/generate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: process.env.OLLAMA_MODEL || 'deepseek-r1:32b',
              prompt,
              stream: false,
            }),
          }
        )
        const data = await response.json()
        return data.response
      },
    }

    // Generate 200 city pages
    const result = await generate200CityPages(campaignId, productSpec, ollamaClient)

    // Send completion notification
    if (result.success) {
      await sendCampaignCompleteAlert({
        product: productSpec.productName,
        citiesGenerated: result.generated,
        totalRevenue: 0,
        topCities: ['New York', 'Los Angeles', 'Chicago'],
        metrics: {
          pagesCreated: result.generated,
          estimatedMonthlyTraffic: result.generated * 50,
          estimatedMonthlyRevenue: result.generated * 2,
        },
      })
    }
  } catch (error) {
    console.error('[SEO Brain] Campaign generation failed:', error)

    // Update campaign status to FAILED
    await prisma.productCampaignQueue.update({
      where: { id: campaignId },
      data: {
        status: 'FAILED',
      },
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all campaigns
    const campaigns = await prisma.productCampaignQueue.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ campaigns })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}
