/**
 * Ticket Messages API
 * POST /api/support/tickets/[id]/messages - Add message to ticket
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addTicketMessage } from '@/lib/services/support-ticket.service';
import { executeWorkflows } from '@/lib/services/ticket-workflow.service';
import { WorkflowTrigger, UserRole } from '@prisma/client';
import { logger } from '@/lib/logger';

/**
 * POST /api/support/tickets/[id]/messages
 * Add a message to a ticket
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Verify ticket exists and user has access
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        creatorId: true,
        assignedToId: true,
      },
    });

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

    // Parse request body
    const body = await request.json();
    const { content, isInternal, isAIGenerated, attachments } = body;

    // Validate required fields
    if (!content) {
      return NextResponse.json({ error: 'Missing required field: content' }, { status: 400 });
    }

    // Only preparers/admins can add internal notes
    const internal = isInternal && (isAssigned || isAdmin);

    // Add message to ticket
    const message = await addTicketMessage({
      ticketId,
      senderId: profile.id,
      content,
      isInternal: internal,
      isAIGenerated: isAIGenerated || false,
      attachments: attachments || [],
    });

    // Determine workflow trigger and notification target
    const isPreparer = profile.role === UserRole.TAX_PREPARER || isAdmin;
    const trigger = isPreparer
      ? WorkflowTrigger.PREPARER_RESPONSE
      : WorkflowTrigger.CLIENT_RESPONSE;

    // Send notification to the other party (client sends → notify preparer, preparer sends → notify client)
    if (!isInternal) {
      const notifyUserId = isPreparer ? ticket.creatorId : ticket.assignedToId;

      if (notifyUserId) {
        // Dynamic import to avoid circular dependencies
        import('@/lib/services/notification.service')
          .then(({ NotificationService }) => {
            return NotificationService.send({
              userId: notifyUserId,
              type: isPreparer ? 'TICKET_REPLY' : 'TICKET_REPLY',
              title: isPreparer ? 'New Response from Your Tax Preparer' : 'Client Replied to Ticket',
              message: `${profile.firstName || 'Someone'} replied: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
              channels: ['IN_APP', 'EMAIL', 'PUSH'],
              metadata: {
                ticketId,
                messageId: message.id,
                actionUrl: isPreparer
                  ? `/dashboard/client/tickets/${ticketId}`
                  : `/dashboard/tax-preparer/tickets/${ticketId}`,
              },
            });
          })
          .then(() => {
            logger.info('Notification sent for ticket message', {
              ticketId,
              notifyUserId,
              messageId: message.id,
            });
          })
          .catch((notificationError) => {
            logger.error('Failed to send notification for ticket message', {
              error: notificationError,
              ticketId,
              messageId: message.id,
            });
          });
      }
    }

    // Trigger workflows asynchronously
    executeWorkflows(trigger, ticketId, {
      messageId: message.id,
      senderId: profile.id,
    }).catch((error) => {
      logger.error('Failed to execute workflows for new message', {
        error,
        ticketId,
        messageId: message.id,
      });
    });

    logger.info('Message added to ticket via API', {
      ticketId,
      messageId: message.id,
      senderId: profile.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        message,
      },
    });
  } catch (error) {
    logger.error('Failed to add message to ticket', {
      error,
      ticketId: params.id,
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to add message',
      },
      { status: 500 }
    );
  }
}
