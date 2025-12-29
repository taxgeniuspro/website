/**
 * SEO Brain API - Start Campaign
 *
 * POST /api/seo-brain/start-campaign
 *
 * Starts a new 200-city landing page campaign
 */

import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { generate200CityPages } from '@/lib/seo-llm/3-seo-brain/campaign-generator/city-page-generator'
import { sendCampaignCompleteAlert } from '@/lib/seo-llm/3-seo-brain/telegram-notifier/telegram-notifier'
import { logger } from '@/lib/logger'

// TypeScript interface for Campaign
interface ProductCampaign {
  id: string;
  productName: string;
  productSpec: Record<string, unknown>;
  status: string;
  priority: number;
  citiesGenerated: number;
  citiesIndexed: number;
  createdAt: string;
}

export async function POST(request: NextRequest) {
  try {
    // Admin only
    const { user } = await validateRequest()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productName, quantity, size, material, turnaround, price, keywords, industries } = body

    // Validation
    if (!productName || !quantity || !size || !material || !turnaround || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const campaignId = `campaign-${Date.now()}`
    const productSpec = {
      quantity,
      size,
      material,
      turnaround,
      price,
      onlineOnly: true,
      keywords: keywords || [],
      industries: industries || [],
    }

    // Create campaign
    const { data: campaign, error: createError } = await db
      .from('product_campaign_queue')
      .insert({
        id: campaignId,
        productName,
        productSpec,
        status: 'PENDING',
        priority: 5,
        citiesGenerated: 0,
        citiesIndexed: 0,
      })
      .select()
      .single()

    if (createError) {
      throw createError
    }

    // Start generation in background (don't await - it takes 6-7 hours)
    startCampaignGeneration(campaignId, {
      productName,
      ...productSpec,
    })

    return NextResponse.json({
      success: true,
      campaignId: campaignId,
      status: 'PENDING',
      message:
        'Campaign started. Generation will take 6-7 hours. You will receive Telegram notification when complete.',
    })
  } catch (error) {
    logger.error('[SEO Brain API] Start campaign error', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json({ error: 'Failed to start campaign' }, { status: 500 })
  }
}

/**
 * Start campaign generation in background
 */
async function startCampaignGeneration(campaignId: string, productSpec: any) {
  try {
    // Update status
    const { error: updateError } = await db
      .from('product_campaign_queue')
      .update({
        status: 'GENERATING',
        generationStartedAt: new Date().toISOString(),
      })
      .eq('id', campaignId)

    if (updateError) {
      throw updateError
    }

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
    logger.error('[SEO Brain] Campaign generation failed', { error: error instanceof Error ? error.message : 'Unknown error' })

    // Update campaign status to FAILED
    await db
      .from('product_campaign_queue')
      .update({
        status: 'FAILED',
      })
      .eq('id', campaignId)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all campaigns
    const { data: campaigns, error: fetchError } = await db
      .from('product_campaign_queue')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(20)

    if (fetchError) {
      throw fetchError
    }

    return NextResponse.json({ campaigns: campaigns || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}
