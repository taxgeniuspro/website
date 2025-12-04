/**
 * SEO Brain API - Approve Decision
 *
 * POST /api/seo-brain/approve-decision
 *
 * User approves a decision (A, B, or C)
 */

import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { seoBrain } from '@/lib/seo-brain/orchestrator'

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
    const decision = await prisma.sEOBrainDecision.findUnique({
      where: { id: decisionId },
    })

    if (!decision) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 })
    }

    if (decision.status !== 'PENDING') {
      return NextResponse.json({ error: 'Decision already processed' }, { status: 400 })
    }

    // Update decision with user response
    await prisma.sEOBrainDecision.update({
      where: { id: decisionId },
      data: {
        selectedOption: selectedOption.toUpperCase(),
        userFeedback: feedback || null,
        respondedAt: new Date(),
        status: 'APPROVED',
      },
    })

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
    const pendingDecisions = await prisma.sEOBrainDecision.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ decisions: pendingDecisions })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch decisions' }, { status: 500 })
  }
}
