/**
 * AI Suggest Response API
 * POST /api/support/ai/suggest-response - Get AI-powered response suggestion
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
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

    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id, role')
      .eq('user_id', userId)
      .limit(1);

    const profile = firstOrNull(profileData);

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only preparers and admins can use AI features
    const canUseAI = profile.role === 'tax_preparer' || profile.role === 'admin' || profile.role === 'super_admin';

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
    const { data: ticketData, error: ticketError } = await db
      .from('support_tickets')
      .select('assigned_to_id')
      .eq('id', ticketId)
      .limit(1);

    const ticket = firstOrNull(ticketData);

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const isAdmin = profile.role === 'admin' || profile.role === 'super_admin';
    if (ticket.assigned_to_id !== profile.id && !isAdmin) {
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
