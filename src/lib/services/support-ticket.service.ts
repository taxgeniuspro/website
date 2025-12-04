/**
 * Support Ticket Service
 * Handles ticket creation, management, routing, and assignment
 * Automatically routes tickets to assigned tax preparers via ClientPreparer relationship
 */

import { prisma } from '@/lib/prisma';
import { TicketStatus, TicketPriority, Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

// ==================== Types ====================

export interface CreateTicketInput {
  title: string;
  description: string;
  priority?: TicketPriority;
  tags?: string[];
  customFields?: Record<string, any>;
  creatorId: string;
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  tags?: string[];
  customFields?: Record<string, any>;
  assignedToId?: string;
}

export interface AddMessageInput {
  ticketId: string;
  senderId: string;
  content: string;
  isInternal?: boolean;
  isAIGenerated?: boolean;
  attachments?: any[];
}

export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  assignedToId?: string;
  creatorId?: string;
  tags?: string[];
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

// ==================== Ticket Management ====================

/**
 * Create a new support ticket with automatic preparer assignment
 * Routes ticket to the client's assigned tax preparer via ClientPreparer relationship
 */
export async function createTicket(input: CreateTicketInput) {
  try {
    // Generate unique ticket number
    const ticketNumber = await generateTicketNumber();

    // Find assigned tax preparer for this client
    const assignedPreparer = await findAssignedPreparer(input.creatorId);

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        title: input.title,
        description: input.description,
        priority: input.priority || TicketPriority.NORMAL,
        tags: input.tags || [],
        customFields: input.customFields || {},
        creatorId: input.creatorId,
        assignedToId: assignedPreparer?.id,
        lastActivityAt: new Date(),
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    logger.info('Support ticket created', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      creatorId: input.creatorId,
      assignedToId: assignedPreparer?.id,
    });

    // Send notification to assigned preparer
    if (assignedPreparer?.id) {
      try {
        const { NotificationService } = await import('./notification.service');
        await NotificationService.send({
          userId: assignedPreparer.id,
          type: 'TICKET_ASSIGNED',
          title: 'New Support Ticket',
          message: `${ticket.creator.firstName || 'A client'} created a new support ticket: ${ticket.title}`,
          channels: ['IN_APP', 'EMAIL', 'PUSH'],
          metadata: {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            actionUrl: `/dashboard/tax-preparer/tickets/${ticket.id}`,
          },
        });

        logger.info('Notification sent to preparer for new ticket', {
          preparerId: assignedPreparer.id,
          ticketId: ticket.id,
        });
      } catch (notificationError) {
        logger.error('Failed to send notification to preparer', {
          error: notificationError,
          ticketId: ticket.id,
        });
      }
    }

    // Trigger workflows asynchronously
    executeWorkflows('TICKET_CREATED', ticket.id).catch((error) => {
      logger.error('Failed to execute workflows for new ticket', {
        error,
        ticketId: ticket.id,
      });
    });

    return ticket;
  } catch (error) {
    logger.error('Failed to create support ticket', {
      error,
      input,
    });
    throw new Error('Failed to create support ticket');
  }
}

/**
 * Find the assigned tax preparer for a client via ClientPreparer relationship
 * Returns null if no active preparer assignment found
 */
async function findAssignedPreparer(clientId: string) {
  try {
    const activeAssignment = await prisma.clientPreparer.findFirst({
      where: {
        clientId,
        isActive: true,
      },
      include: {
        preparer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    return activeAssignment?.preparer || null;
  } catch (error) {
    logger.error('Failed to find assigned preparer', {
      error,
      clientId,
    });
    return null;
  }
}

/**
 * Generate unique ticket number (e.g., TGP-TICKET-12345)
 */
async function generateTicketNumber(): Promise<string> {
  const count = await prisma.supportTicket.count();
  const number = (count + 1).toString().padStart(5, '0');
  return `TGP-TICKET-${number}`;
}

/**
 * Get ticket by ID with full details
 */
export async function getTicketById(ticketId: string) {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            companyName: true,
            licenseNo: true,
          },
        },
        messages: {
          include: {
            senderProfile: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        timeEntries: {
          include: {
            preparer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            startedAt: 'desc',
          },
        },
      },
    });

    return ticket;
  } catch (error) {
    logger.error('Failed to get ticket by ID', {
      error,
      ticketId,
    });
    throw new Error('Failed to get ticket');
  }
}

/**
 * Update ticket status, priority, or other fields
 */
export async function updateTicket(ticketId: string, input: UpdateTicketInput) {
  try {
    const updateData: any = {
      ...input,
      lastActivityAt: new Date(),
    };

    // Track when ticket was resolved or closed
    if (input.status === TicketStatus.RESOLVED && !updateData.resolvedAt) {
      updateData.resolvedAt = new Date();
    }
    if (input.status === TicketStatus.CLOSED && !updateData.closedAt) {
      updateData.closedAt = new Date();
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        creator: true,
        assignedTo: true,
      },
    });

    logger.info('Support ticket updated', {
      ticketId,
      updates: input,
    });

    // TODO: Trigger workflow - TICKET_UPDATED
    // TODO: Send notification

    return ticket;
  } catch (error) {
    logger.error('Failed to update ticket', {
      error,
      ticketId,
      input,
    });
    throw new Error('Failed to update ticket');
  }
}

/**
 * Add a message to a ticket
 */
export async function addTicketMessage(input: AddMessageInput) {
  try {
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: input.ticketId,
        senderId: input.senderId,
        content: input.content,
        isInternal: input.isInternal || false,
        isAIGenerated: input.isAIGenerated || false,
        attachments: input.attachments || [],
      },
      include: {
        senderProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    // Update ticket's last activity timestamp
    await prisma.supportTicket.update({
      where: { id: input.ticketId },
      data: {
        lastActivityAt: new Date(),
      },
    });

    // Track first response time
    await trackFirstResponse(input.ticketId, input.senderId);

    logger.info('Ticket message added', {
      ticketId: input.ticketId,
      messageId: message.id,
      senderId: input.senderId,
    });

    // TODO: Trigger workflow - CLIENT_RESPONSE or PREPARER_RESPONSE
    // TODO: Send notification

    return message;
  } catch (error) {
    logger.error('Failed to add ticket message', {
      error,
      input,
    });
    throw new Error('Failed to add message to ticket');
  }
}

/**
 * Track first response time for metrics
 */
async function trackFirstResponse(ticketId: string, senderId: string) {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: {
        firstResponseAt: true,
        creatorId: true,
        assignedToId: true,
      },
    });

    // If this is the first response from the preparer
    if (
      !ticket?.firstResponseAt &&
      senderId === ticket?.assignedToId &&
      senderId !== ticket?.creatorId
    ) {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { firstResponseAt: new Date() },
      });
    }
  } catch (error) {
    logger.error('Failed to track first response', {
      error,
      ticketId,
    });
  }
}

/**
 * Get tickets for a specific user (client or preparer)
 */
export async function getTicketsByUser(
  userId: string,
  role: 'client' | 'preparer' | 'admin',
  filters?: TicketFilters,
  page = 1,
  limit = 20
) {
  try {
    const where: Prisma.SupportTicketWhereInput = {};

    // Role-based filtering
    if (role === 'client') {
      where.creatorId = userId;
    } else if (role === 'preparer') {
      where.assignedToId = userId;
    }
    // Admin sees all tickets

    // Apply filters
    if (filters?.status?.length) {
      where.status = { in: filters.status };
    }
    if (filters?.priority?.length) {
      where.priority = { in: filters.priority };
    }
    if (filters?.tags?.length) {
      where.tags = { hasSome: filters.tags };
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { ticketNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          messages: {
            select: {
              id: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
        orderBy: {
          lastActivityAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Failed to get tickets by user', {
      error,
      userId,
      role,
    });
    throw new Error('Failed to get tickets');
  }
}

/**
 * Get ticket statistics for a user
 */
export async function getTicketStats(userId: string, role: 'client' | 'preparer' | 'admin') {
  try {
    const where: Prisma.SupportTicketWhereInput = {};

    if (role === 'client') {
      where.creatorId = userId;
    } else if (role === 'preparer') {
      where.assignedToId = userId;
    }

    const [total, open, inProgress, waitingClient, waitingPreparer, resolved, closed] =
      await Promise.all([
        prisma.supportTicket.count({ where }),
        prisma.supportTicket.count({ where: { ...where, status: TicketStatus.OPEN } }),
        prisma.supportTicket.count({
          where: { ...where, status: TicketStatus.IN_PROGRESS },
        }),
        prisma.supportTicket.count({
          where: { ...where, status: TicketStatus.WAITING_CLIENT },
        }),
        prisma.supportTicket.count({
          where: { ...where, status: TicketStatus.WAITING_PREPARER },
        }),
        prisma.supportTicket.count({ where: { ...where, status: TicketStatus.RESOLVED } }),
        prisma.supportTicket.count({ where: { ...where, status: TicketStatus.CLOSED } }),
      ]);

    return {
      total,
      byStatus: {
        open,
        inProgress,
        waitingClient,
        waitingPreparer,
        resolved,
        closed,
      },
      activeTickets: open + inProgress + waitingClient + waitingPreparer,
    };
  } catch (error) {
    logger.error('Failed to get ticket stats', {
      error,
      userId,
      role,
    });
    throw new Error('Failed to get ticket statistics');
  }
}

/**
 * Close a ticket
 */
export async function closeTicket(ticketId: string, closedBy: string) {
  return updateTicket(ticketId, {
    status: TicketStatus.CLOSED,
  });
}

/**
 * Reopen a closed ticket
 */
export async function reopenTicket(ticketId: string) {
  return updateTicket(ticketId, {
    status: TicketStatus.OPEN,
  });
}

/**
 * Reassign ticket to a different preparer
 */
export async function reassignTicket(ticketId: string, newPreparerId: string) {
  return updateTicket(ticketId, {
    assignedToId: newPreparerId,
  });
}

/**
 * Get unread message count for a ticket
 */
export async function getUnreadMessageCount(ticketId: string, userId: string) {
  try {
    // This is a simplified version - you may want to track read status more precisely
    const lastReadAt = await getLastReadTimestamp(ticketId, userId);

    const count = await prisma.ticketMessage.count({
      where: {
        ticketId,
        senderId: { not: userId },
        createdAt: lastReadAt ? { gt: lastReadAt } : undefined,
        isInternal: false, // Don't count internal notes
      },
    });

    return count;
  } catch (error) {
    logger.error('Failed to get unread message count', {
      error,
      ticketId,
      userId,
    });
    return 0;
  }
}

/**
 * Get last read timestamp for a user on a ticket
 * This is a placeholder - implement based on your read tracking strategy
 */
async function getLastReadTimestamp(ticketId: string, userId: string): Promise<Date | null> {
  // TODO: Implement read tracking
  // You might want to create a separate TicketReadStatus table
  return null;
}

/**
 * Search tickets across all fields
 */
export async function searchTickets(query: string, userId?: string, role?: string) {
  try {
    const where: Prisma.SupportTicketWhereInput = {
      OR: [
        { ticketNumber: { contains: query, mode: 'insensitive' } },
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { tags: { hasSome: [query] } },
      ],
    };

    // Apply role-based filtering
    if (userId && role === 'client') {
      where.creatorId = userId;
    } else if (userId && role === 'preparer') {
      where.assignedToId = userId;
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        lastActivityAt: 'desc',
      },
      take: 50,
    });

    return tickets;
  } catch (error) {
    logger.error('Failed to search tickets', {
      error,
      query,
    });
    throw new Error('Failed to search tickets');
  }
}
