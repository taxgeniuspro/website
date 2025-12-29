/**
 * Individual Ticket API
 * GET    /api/support/tickets/[id] - Get ticket details
 * PATCH  /api/support/tickets/[id] - Update ticket
 * DELETE /api/support/tickets/[id] - Delete ticket (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { getTicketById, updateTicket } from '@/lib/services/support-ticket.service';
import { executeWorkflows } from '@/lib/services/ticket-workflow.service';
import { logger } from '@/lib/logger';

// TypeScript interfaces to replace @prisma/client types
type WorkflowTrigger = 'TICKET_CREATED' | 'TICKET_UPDATED' | 'PREPARER_RESPONSE' | 'CLIENT_RESPONSE';
type UserRole = 'CLIENT' | 'LEAD' | 'TAX_PREPARER' | 'ADMIN' | 'SUPER_ADMIN';

/**
 * GET /api/support/tickets/[id]
 * Get ticket details with messages
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId: userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id, role')
      .eq('user_id', userId)
      .limit(1);

    const profile = firstOrNull(profileData);

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { id: ticketId } = await params;

    // Get ticket
    const ticket = await getTicketById(ticketId);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check authorization
    const profileRole = (profile.role || '').toUpperCase();
    const isAdmin = profileRole === 'SUPER_ADMIN' || profileRole === 'ADMIN';
    const isCreator = ticket.creatorId === profile.id;
    const isAssigned = ticket.assignedToId === profile.id;

    if (!isAdmin && !isCreator && !isAssigned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ticket,
      },
    });
  } catch (error) {
    logger.error('Failed to get ticket', { error, ticketId: params.id });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get ticket',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/support/tickets/[id]
 * Update ticket (status, priority, assignment, etc.)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId: userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id, role')
      .eq('user_id', userId)
      .limit(1);

    const profile = firstOrNull(profileData);

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { id: ticketId } = await params;

    // Get existing ticket
    const { data: ticketData, error: ticketError } = await db
      .from('support_tickets')
      .select('id, creator_id, assigned_to_id')
      .eq('id', ticketId)
      .limit(1);

    const existingTicket = firstOrNull(ticketData);

    if (ticketError || !existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check authorization
    const profileRole = (profile.role || '').toUpperCase();
    const isAdmin = profileRole === 'SUPER_ADMIN' || profileRole === 'ADMIN';
    const isAssigned = existingTicket.assigned_to_id === profile.id;

    if (!isAdmin && !isAssigned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { status, priority, title, description, tags, customFields, assignedToId } = body;

    // Update ticket
    const updatedTicket = await updateTicket(ticketId, {
      status,
      priority,
      title,
      description,
      tags,
      customFields,
      assignedToId,
    });

    // Trigger workflows asynchronously
    executeWorkflows('TICKET_UPDATED' as WorkflowTrigger, ticketId, {
      previousStatus: existingTicket,
      updates: body,
    }).catch((error) => {
      logger.error('Failed to execute workflows for ticket update', {
        error,
        ticketId,
      });
    });

    logger.info('Ticket updated via API', {
      ticketId,
      updatedBy: profile.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        ticket: updatedTicket,
      },
    });
  } catch (error) {
    logger.error('Failed to update ticket', { error, ticketId: params.id });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update ticket',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/support/tickets/[id]
 * Delete a ticket (admin only)
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId: userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id, role')
      .eq('user_id', userId)
      .limit(1);

    const profile = firstOrNull(profileData);

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only admins can delete tickets
    const profileRole = (profile.role || '').toUpperCase();
    const isAdmin = profileRole === 'SUPER_ADMIN' || profileRole === 'ADMIN';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can delete tickets' },
        { status: 403 }
      );
    }

    const { id: ticketId } = await params;

    // Delete ticket
    const { error: deleteError } = await db
      .from('support_tickets')
      .delete()
      .eq('id', ticketId);

    if (deleteError) {
      throw deleteError;
    }

    logger.info('Ticket deleted via API', {
      ticketId,
      deletedBy: profile.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Ticket deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete ticket', { error, ticketId: params.id });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete ticket',
      },
      { status: 500 }
    );
  }
}
