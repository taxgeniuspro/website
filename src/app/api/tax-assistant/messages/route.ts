/**
 * Tax Assistant Messages API
 *
 * POST /api/tax-assistant/messages - Send message to assistant
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendMessage } from '@/lib/services/tax-assistant.service';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { threadId, message } = body;

    if (!threadId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: threadId, message' },
        { status: 400 }
      );
    }

    const response = await sendMessage({
      threadId,
      userId: userId,
      message,
    });

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    logger.error('Error sending message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send message' },
      { status: 500 }
    );
  }
}
