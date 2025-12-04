/**
 * AI Suggest Response API
 * POST /api/support/ai/suggest-response - Get AI-powered response suggestion
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { suggestResponse } from '@/lib/services/ai-support.service';
import { logger } from '@/lib/logger';

/**
 * POST /api/support/ai/suggest-response
 * Get AI-powered response suggestion for a ticket
 */
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

    // Only preparers and admins can use AI features
    const canUseAI =
      profile.role === 'TAX_PREPARER' || profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN';

    if (!canUseAI) {
      return NextResponse.json(
        { error: 'Only tax preparers and admins can use AI features' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { ticketId, context } = body;

    if (!ticketId) {
      return NextResponse.json({ error: 'Missing required field: ticketId' }, { status: 400 });
    }

    // Verify ticket access
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { assignedToId: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const isAdmin = profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN';
    if (ticket.assignedToId !== profile.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get AI suggestion
    const result = await suggestResponse({
      ticketId,
      context,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Failed to suggest AI response', { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to suggest response',
      },
      { status: 500 }
    );
  }
}
