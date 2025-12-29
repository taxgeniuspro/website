/**
 * SEO Brain API - Telegram Webhook
 *
 * POST /api/seo-brain/webhook
 *
 * Handles responses from Telegram bot
 */

import { type NextRequest, NextResponse } from 'next/server'
import { db, firstOrNull } from '@/lib/db'
import { seoBrain } from '@/lib/seo-llm/3-seo-brain/integration'
import { logger } from '@/lib/logger'

// TypeScript interface for SEOBrainDecision
interface SEOBrainDecision {
  id: string;
  status: string;
  createdAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Extract message from Telegram webhook
    const message = body.message
    if (!message || !message.text) {
      return NextResponse.json({ ok: true })
    }

    const text = message.text.trim().toUpperCase()

    // Check if this is a decision response (A, B, or C)
    if (!['A', 'B', 'C'].includes(text)) {
      return NextResponse.json({ ok: true })
    }

    // Find most recent pending decision
    const { data: pendingData, error: findError } = await db
      .from('seo_brain_decisions')
      .select('id, status, createdAt')
      .eq('status', 'PENDING')
      .order('createdAt', { ascending: false })
      .limit(1)

    if (findError) {
      throw findError
    }

    const pendingDecision = firstOrNull(pendingData) as SEOBrainDecision | null

    if (!pendingDecision) {
      return NextResponse.json({ ok: true })
    }

    // Update decision with user response
    const { error: updateError } = await db
      .from('seo_brain_decisions')
      .update({
        selectedOption: text,
        respondedAt: new Date().toISOString(),
        status: 'APPROVED',
      })
      .eq('id', pendingDecision.id)

    if (updateError) {
      throw updateError
    }

    // Execute the decision
    await seoBrain.executeDecision(pendingDecision.id, text)

    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('[SEO Brain Webhook] Error', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json({ ok: true }) // Always return 200 to Telegram
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    webhook: 'SEO Brain Telegram Webhook',
  })
}
