/**
 * Individual Ticket API
 * GET    /api/support/tickets/[id] - Get ticket details
 * PATCH  /api/support/tickets/[id] - Update ticket
 * DELETE /api/support/tickets/[id] - Delete ticket (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTicketById, updateTicket } from '@/lib/services/support-ticket.service';
import { executeWorkflows } from '@/lib/services/ticket-workflow.service';
import { WorkflowTrigger, UserRole } from '@prisma/client';
import { logger } from '@/lib/logger';

/**
 * GET /api/support/tickets/[id]
 * Get ticket details with messages
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId: userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, role: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const ticketId = params.id;

    // Get ticket
    const ticket = await getTicketById(ticketId);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check authorization
    const isAdmin = profile.role === UserRole.SUPER_ADMIN || profile.role === UserRole.ADMIN;
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
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId: userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, role: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const ticketId = params.id;

    // Get existing ticket
    const existingTicket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        creatorId: true,
        assignedToId: true,
      },
    });

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check authorization
    const isAdmin = profile.role === UserRole.SUPER_ADMIN || profile.role === UserRole.ADMIN;
    const isAssigned = existingTicket.assignedToId === profile.id;

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
    executeWorkflows(WorkflowTrigger.TICKET_UPDATED, ticketId, {
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
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId: userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, role: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only admins can delete tickets
    const isAdmin = profile.role === 'SUPER_ADMIN' || profile.role === 'ADMIN';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can delete tickets' },
        { status: 403 }
      );
    }

    const ticketId = params.id;

    // Delete ticket
    await prisma.supportTicket.delete({
      where: { id: ticketId },
    });

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
