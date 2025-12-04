/**
 * Tax Assistant Threads API
 *
 * POST /api/tax-assistant/threads - Create new thread
 * GET /api/tax-assistant/threads - List user's threads
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createThread, listThreads } from '@/lib/services/tax-assistant.service';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { initialMessage } = body;

    const thread = await createThread({
      userId: userId,
      initialMessage,
    });

    return NextResponse.json({
      success: true,
      data: thread,
    });
  } catch (error) {
    logger.error('Error creating thread:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create thread' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const threads = await listThreads(userId);

    return NextResponse.json({
      success: true,
      data: threads,
    });
  } catch (error) {
    logger.error('Error listing threads:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list threads' },
      { status: 500 }
    );
  }
}
