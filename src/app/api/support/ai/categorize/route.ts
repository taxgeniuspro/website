/**
 * AI Categorize Ticket API
 * POST /api/support/ai/categorize - Auto-suggest tags for ticket
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { categorizeTicket } from '@/lib/services/ai-support.service';
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

    const body = await request.json();
    const { title, description } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description' },
        { status: 400 }
      );
    }

    const result = await categorizeTicket({ title, description });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to categorize ticket', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to categorize ticket' },
      { status: 500 }
    );
  }
}
