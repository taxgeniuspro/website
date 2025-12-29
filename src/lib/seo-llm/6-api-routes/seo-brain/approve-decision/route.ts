/**
 * SEO Brain API - Approve Decision
 *
 * POST /api/seo-brain/approve-decision
 *
 * User approves a decision (A, B, or C)
 */

import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { db, firstOrNull } from '@/lib/db'
import { seoBrain } from '@/lib/seo-brain/orchestrator'

// TypeScript interfaces (replaces Prisma types)
interface SEOBrainDecision {
  id: string
  status: string
  selectedOption: string | null
  userFeedback: string | null
  respondedAt: string | null
  createdAt: string
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { decisionId, selectedOption, feedback } = body

    if (!decisionId || !selectedOption) {
      return NextResponse.json({ error: 'Missing decisionId or selectedOption' }, { status: 400 })
    }

    // Validate option
    if (!['A', 'B', 'C'].includes(selectedOption.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid option. Must be A, B, or C' }, { status: 400 })
    }

    // Get decision
    const { data: decisionData } = await db
      .from('seo_brain_decisions')
      .select('*')
      .eq('id', decisionId)
      .limit(1)

    const decision = firstOrNull<SEOBrainDecision>(decisionData)

    if (!decision) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 })
    }

    if (decision.status !== 'PENDING') {
      return NextResponse.json({ error: 'Decision already processed' }, { status: 400 })
    }

    // Update decision with user response
    const { error: updateError } = await db
      .from('seo_brain_decisions')
      .update({
        selectedOption: selectedOption.toUpperCase(),
        userFeedback: feedback || null,
        respondedAt: new Date().toISOString(),
        status: 'APPROVED',
      })
      .eq('id', decisionId)

    if (updateError) {
      throw new Error(`Failed to update decision: ${updateError.message}`)
    }

    // Execute the decision
    await seoBrain.executeDecision(decisionId, selectedOption.toUpperCase())

    return NextResponse.json({
      success: true,
      message: `Decision approved. Executing option ${selectedOption.toUpperCase()}...`,
    })
  } catch (error) {
    console.error('[SEO Brain API] Approve decision error:', error)
    return NextResponse.json({ error: 'Failed to approve decision' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pending decisions
    const { data: pendingDecisions } = await db
      .from('seo_brain_decisions')
      .select('*')
      .eq('status', 'PENDING')
      .order('createdAt', { ascending: false })
      .limit(20)

    return NextResponse.json({ decisions: pendingDecisions || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch decisions' }, { status: 500 })
  }
}
