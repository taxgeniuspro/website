/**
 * SEO Brain API - Analyze Now
 *
 * POST /api/seo-brain/analyze-now
 *
 * Trigger immediate performance analysis for a campaign
 */

import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { seoBrain } from '@/lib/seo-brain/orchestrator'

export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campaignId } = body

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    // Trigger analysis (runs in background)
    seoBrain.analyzeCampaign(campaignId).catch((error) => {
      console.error('[SEO Brain] Analysis error:', error)
    })

    return NextResponse.json({
      success: true,
      message: 'Analysis started. You will receive decisions via Telegram.',
    })
  } catch (error) {
    console.error('[SEO Brain API] Analyze now error:', error)
    return NextResponse.json({ error: 'Failed to start analysis' }, { status: 500 })
  }
}
