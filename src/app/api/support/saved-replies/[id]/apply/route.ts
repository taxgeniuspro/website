/**
 * Apply Saved Reply API
 * POST /api/support/saved-replies/[id]/apply - Apply template with variable substitution
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { applySavedReply } from '@/lib/services/saved-reply.service';
import { logger } from '@/lib/logger';

/**
 * POST /api/support/saved-replies/[id]/apply
 * Apply saved reply to a ticket with variable substitution
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Parse request body
    const body = await request.json();
    const { ticketId, variables } = body;

    if (!ticketId) {
      return NextResponse.json({ error: 'Missing required field: ticketId' }, { status: 400 });
    }

    // Apply saved reply with variable substitution
    const result = await applySavedReply({
      replyId: params.id,
      ticketId,
      variables: variables || {},
    });

    logger.info('Saved reply applied via API', {
      savedReplyId: params.id,
      ticketId,
      userId: profile.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        content: result.content,
      },
    });
  } catch (error) {
    logger.error('Failed to apply saved reply', { error, id: params.id });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to apply saved reply',
      },
      { status: 500 }
    );
  }
}
