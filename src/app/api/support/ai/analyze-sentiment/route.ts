/**
 * AI Analyze Sentiment API
 * POST /api/support/ai/analyze-sentiment - Analyze ticket sentiment
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { analyzeSentiment } from '@/lib/services/ai-support.service';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { userId: userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, role: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const canUseAI =
      profile.role === 'TAX_PREPARER' || profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN';

    if (!canUseAI) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { ticketId } = body;

    if (!ticketId) {
      return NextResponse.json({ error: 'Missing ticketId' }, { status: 400 });
    }

    const result = await analyzeSentiment({ ticketId });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to analyze sentiment', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze sentiment' },
      { status: 500 }
    );
  }
}
