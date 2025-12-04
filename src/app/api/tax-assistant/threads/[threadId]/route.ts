/**
 * Tax Assistant Thread Operations API
 *
 * GET /api/tax-assistant/threads/[threadId] - Get thread history
 * DELETE /api/tax-assistant/threads/[threadId] - Delete thread
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getThread, deleteThread } from '@/lib/services/tax-assistant.service';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = await params;

    const thread = await getThread(threadId, userId);

    return NextResponse.json({
      success: true,
      data: thread,
    });
  } catch (error) {
    logger.error('Error getting thread:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get thread' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = await params;

    await deleteThread(threadId, userId);

    return NextResponse.json({
      success: true,
      message: 'Thread deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting thread:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete thread' },
      { status: 500 }
    );
  }
}
