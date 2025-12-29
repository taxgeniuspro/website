/**
 * Support Ticket Service
 * Handles ticket creation, management, routing, and assignment
 * Automatically routes tickets to assigned tax preparers via ClientPreparer relationship
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_CLIENT'
  | 'WAITING_PREPARER'
  | 'RESOLVED'
  | 'CLOSED';

type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

interface SupportTicketRecord {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  tags: string[];
  customFields?: Record<string, unknown> | null;
  creatorId: string;
  assignedToId?: string | null;
  lastActivityAt: Date | string;
  firstResponseAt?: Date | string | null;
  resolvedAt?: Date | string | null;
  closedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface ProfileRecord {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  companyName?: string | null;
  licenseNo?: string | null;
}

interface TicketMessageRecord {
  id: string;
  ticketId: string;
  senderId: string;
  content: string;
  isInternal: boolean;
  isAIGenerated: boolean;
  attachments?: unknown[] | null;
  createdAt: Date | string;
}

interface TimeEntryRecord {
  id: string;
  ticketId: string;
  preparerId: string;
  startedAt: Date | string;
  endedAt?: Date | string | null;
  duration?: number | null;
  description?: string | null;
}

interface ClientPreparerRecord {
  id: string;
  clientId: string;
  preparerId: string;
  isActive: boolean;
  assignedAt: Date | string;
}

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

    const now = new Date().toISOString();
    const { data: ticketData, error } = await db
      .from('support_tickets')
      .insert({
        ticketNumber,
        title: input.title,
        description: input.description,
        status: 'OPEN' as TicketStatus,
        priority: input.priority || 'NORMAL',
        tags: input.tags || [],
        customFields: input.customFields || {},
        creatorId: input.creatorId,
        assignedToId: assignedPreparer?.id || null,
        lastActivityAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (error || !ticketData) {
      throw new Error(`Failed to create ticket: ${error?.message}`);
    }

    // Fetch creator profile
    const { data: creatorData } = await db
      .from('profiles')
      .select('id, firstName, lastName, phone')
      .eq('id', input.creatorId)
      .limit(1);

    const creator = firstOrNull(creatorData) as ProfileRecord | null;

    // Fetch assigned preparer profile if exists
    let assignedTo: ProfileRecord | null = null;
    if (assignedPreparer?.id) {
      const { data: assignedData } = await db
        .from('profiles')
        .select('id, firstName, lastName, phone')
        .eq('id', assignedPreparer.id)
        .limit(1);
      assignedTo = firstOrNull(assignedData) as ProfileRecord | null;
    }

    const ticket = {
      ...ticketData,
      creator: creator || { id: input.creatorId },
      assignedTo,
    };

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
    // Find active assignment
    const { data: assignmentData } = await db
      .from('client_preparers')
      .select('id, preparerId')
      .eq('clientId', clientId)
      .eq('isActive', true)
      .order('assignedAt', { ascending: false })
      .limit(1);

    const assignment = firstOrNull(assignmentData) as { id: string; preparerId: string } | null;

    if (!assignment) return null;

    // Fetch preparer profile
    const { data: preparerData } = await db
      .from('profiles')
      .select('id, firstName, lastName, phone')
      .eq('id', assignment.preparerId)
      .limit(1);

    return firstOrNull(preparerData) as ProfileRecord | null;
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
  const { count } = await db
    .from('support_tickets')
    .select('id', { count: 'exact', head: true });

  const number = ((count || 0) + 1).toString().padStart(5, '0');
  return `TGP-TICKET-${number}`;
}

/**
 * Get ticket by ID with full details
 */
export async function getTicketById(ticketId: string) {
  try {
    // Fetch ticket
    const { data: ticketData } = await db
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .limit(1);

    const ticket = firstOrNull(ticketData) as SupportTicketRecord | null;
    if (!ticket) return null;

    // Fetch creator profile
    const { data: creatorData } = await db
      .from('profiles')
      .select('id, firstName, lastName, phone, avatarUrl')
      .eq('id', ticket.creatorId)
      .limit(1);

    const creator = firstOrNull(creatorData) as ProfileRecord | null;

    // Fetch assigned preparer profile if exists
    let assignedTo: ProfileRecord | null = null;
    if (ticket.assignedToId) {
      const { data: assignedData } = await db
        .from('profiles')
        .select('id, firstName, lastName, phone, avatarUrl, companyName, licenseNo')
        .eq('id', ticket.assignedToId)
        .limit(1);
      assignedTo = firstOrNull(assignedData) as ProfileRecord | null;
    }

    // Fetch messages
    const { data: messagesData } = await db
      .from('ticket_messages')
      .select('*')
      .eq('ticketId', ticketId)
      .order('createdAt', { ascending: true });

    const messages = (messagesData || []) as TicketMessageRecord[];

    // Fetch sender profiles for messages
    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const { data: sendersData } = await db
      .from('profiles')
      .select('id, firstName, lastName, avatarUrl, role')
      .in('id', senderIds.length > 0 ? senderIds : ['__none__']);

    const senderMap = new Map((sendersData || []).map((s: ProfileRecord) => [s.id, s]));

    const messagesWithSender = messages.map((m) => ({
      ...m,
      senderProfile: senderMap.get(m.senderId) || null,
    }));

    // Fetch time entries
    const { data: timeEntriesData } = await db
      .from('ticket_time_entries')
      .select('*')
      .eq('ticketId', ticketId)
      .order('startedAt', { ascending: false });

    const timeEntries = (timeEntriesData || []) as TimeEntryRecord[];

    // Fetch preparer profiles for time entries
    const preparerIds = [...new Set(timeEntries.map((t) => t.preparerId))];
    const { data: preparersData } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .in('id', preparerIds.length > 0 ? preparerIds : ['__none__']);

    const preparerMap = new Map((preparersData || []).map((p: ProfileRecord) => [p.id, p]));

    const timeEntriesWithPreparer = timeEntries.map((t) => ({
      ...t,
      preparer: preparerMap.get(t.preparerId) || null,
    }));

    return {
      ...ticket,
      creator,
      assignedTo,
      messages: messagesWithSender,
      timeEntries: timeEntriesWithPreparer,
    };
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
    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      ...input,
      lastActivityAt: now,
      updatedAt: now,
    };

    // Track when ticket was resolved or closed
    if (input.status === 'RESOLVED' && !updateData.resolvedAt) {
      updateData.resolvedAt = now;
    }
    if (input.status === 'CLOSED' && !updateData.closedAt) {
      updateData.closedAt = now;
    }

    const { data: ticketData, error } = await db
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single();

    if (error || !ticketData) {
      throw new Error(`Failed to update ticket: ${error?.message}`);
    }

    // Fetch creator profile
    const { data: creatorData } = await db
      .from('profiles')
      .select('*')
      .eq('id', ticketData.creatorId)
      .limit(1);

    const creator = firstOrNull(creatorData) as ProfileRecord | null;

    // Fetch assigned preparer profile if exists
    let assignedTo: ProfileRecord | null = null;
    if (ticketData.assignedToId) {
      const { data: assignedData } = await db
        .from('profiles')
        .select('*')
        .eq('id', ticketData.assignedToId)
        .limit(1);
      assignedTo = firstOrNull(assignedData) as ProfileRecord | null;
    }

    const ticket = {
      ...ticketData,
      creator,
      assignedTo,
    };

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
    const now = new Date().toISOString();

    const { data: messageData, error } = await db
      .from('ticket_messages')
      .insert({
        ticketId: input.ticketId,
        senderId: input.senderId,
        content: input.content,
        isInternal: input.isInternal || false,
        isAIGenerated: input.isAIGenerated || false,
        attachments: input.attachments || [],
        createdAt: now,
      })
      .select()
      .single();

    if (error || !messageData) {
      throw new Error(`Failed to create message: ${error?.message}`);
    }

    // Fetch sender profile
    const { data: senderData } = await db
      .from('profiles')
      .select('id, firstName, lastName, avatarUrl, role')
      .eq('id', input.senderId)
      .limit(1);

    const senderProfile = firstOrNull(senderData) as ProfileRecord | null;

    const message = {
      ...messageData,
      senderProfile,
    };

    // Update ticket's last activity timestamp
    await db
      .from('support_tickets')
      .update({
        lastActivityAt: now,
        updatedAt: now,
      })
      .eq('id', input.ticketId);

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
    const { data: ticketData } = await db
      .from('support_tickets')
      .select('firstResponseAt, creatorId, assignedToId')
      .eq('id', ticketId)
      .limit(1);

    const ticket = firstOrNull(ticketData) as {
      firstResponseAt?: string | null;
      creatorId: string;
      assignedToId?: string | null;
    } | null;

    // If this is the first response from the preparer
    if (
      !ticket?.firstResponseAt &&
      senderId === ticket?.assignedToId &&
      senderId !== ticket?.creatorId
    ) {
      await db
        .from('support_tickets')
        .update({
          firstResponseAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', ticketId);
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
    // Build base query
    let query = db.from('support_tickets').select('*', { count: 'exact' });

    // Role-based filtering
    if (role === 'client') {
      query = query.eq('creatorId', userId);
    } else if (role === 'preparer') {
      query = query.eq('assignedToId', userId);
    }
    // Admin sees all tickets

    // Apply filters
    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }
    if (filters?.priority?.length) {
      query = query.in('priority', filters.priority);
    }
    if (filters?.tags?.length) {
      query = query.overlaps('tags', filters.tags);
    }
    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,ticketNumber.ilike.%${filters.search}%`
      );
    }
    if (filters?.startDate) {
      query = query.gte('createdAt', filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query = query.lte('createdAt', filters.endDate.toISOString());
    }

    // Apply pagination and ordering
    const offset = (page - 1) * limit;
    query = query.order('lastActivityAt', { ascending: false }).range(offset, offset + limit - 1);

    const { data: ticketsData, count: total } = await query;

    const tickets = (ticketsData || []) as SupportTicketRecord[];

    // Fetch related data
    const creatorIds = [...new Set(tickets.map((t) => t.creatorId))];
    const assignedIds = [...new Set(tickets.map((t) => t.assignedToId).filter(Boolean))];
    const ticketIds = tickets.map((t) => t.id);

    // Fetch creators
    const { data: creatorsData } = await db
      .from('profiles')
      .select('id, firstName, lastName, avatarUrl')
      .in('id', creatorIds.length > 0 ? creatorIds : ['__none__']);

    const creatorMap = new Map((creatorsData || []).map((c: ProfileRecord) => [c.id, c]));

    // Fetch assigned preparers
    const { data: assignedData } = await db
      .from('profiles')
      .select('id, firstName, lastName, avatarUrl')
      .in('id', assignedIds.length > 0 ? (assignedIds as string[]) : ['__none__']);

    const assignedMap = new Map((assignedData || []).map((a: ProfileRecord) => [a.id, a]));

    // Fetch latest messages for each ticket
    const { data: messagesData } = await db
      .from('ticket_messages')
      .select('id, ticketId, createdAt')
      .in('ticketId', ticketIds.length > 0 ? ticketIds : ['__none__'])
      .order('createdAt', { ascending: false });

    // Group messages by ticket and get latest
    const messageMap = new Map<string, { id: string; createdAt: string }[]>();
    (messagesData || []).forEach((m: { id: string; ticketId: string; createdAt: string }) => {
      if (!messageMap.has(m.ticketId)) {
        messageMap.set(m.ticketId, []);
      }
      const msgs = messageMap.get(m.ticketId)!;
      if (msgs.length < 1) {
        msgs.push({ id: m.id, createdAt: m.createdAt });
      }
    });

    // Build enriched tickets
    const enrichedTickets = tickets.map((t) => ({
      ...t,
      creator: creatorMap.get(t.creatorId) || null,
      assignedTo: t.assignedToId ? assignedMap.get(t.assignedToId) || null : null,
      messages: messageMap.get(t.id) || [],
    }));

    return {
      tickets: enrichedTickets,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
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
    // Build base query based on role
    const buildQuery = (status?: TicketStatus) => {
      let query = db.from('support_tickets').select('id', { count: 'exact', head: true });

      if (role === 'client') {
        query = query.eq('creatorId', userId);
      } else if (role === 'preparer') {
        query = query.eq('assignedToId', userId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      return query;
    };

    const [
      { count: total },
      { count: open },
      { count: inProgress },
      { count: waitingClient },
      { count: waitingPreparer },
      { count: resolved },
      { count: closed },
    ] = await Promise.all([
      buildQuery(),
      buildQuery('OPEN'),
      buildQuery('IN_PROGRESS'),
      buildQuery('WAITING_CLIENT'),
      buildQuery('WAITING_PREPARER'),
      buildQuery('RESOLVED'),
      buildQuery('CLOSED'),
    ]);

    return {
      total: total || 0,
      byStatus: {
        open: open || 0,
        inProgress: inProgress || 0,
        waitingClient: waitingClient || 0,
        waitingPreparer: waitingPreparer || 0,
        resolved: resolved || 0,
        closed: closed || 0,
      },
      activeTickets: (open || 0) + (inProgress || 0) + (waitingClient || 0) + (waitingPreparer || 0),
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

    let query = db
      .from('ticket_messages')
      .select('id', { count: 'exact', head: true })
      .eq('ticketId', ticketId)
      .neq('senderId', userId)
      .eq('isInternal', false);

    if (lastReadAt) {
      query = query.gt('createdAt', lastReadAt.toISOString());
    }

    const { count } = await query;

    return count || 0;
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
    // Build search query
    let dbQuery = db.from('support_tickets').select('*');

    // Apply role-based filtering
    if (userId && role === 'client') {
      dbQuery = dbQuery.eq('creatorId', userId);
    } else if (userId && role === 'preparer') {
      dbQuery = dbQuery.eq('assignedToId', userId);
    }

    // Apply search - search across multiple fields
    dbQuery = dbQuery.or(
      `ticketNumber.ilike.%${query}%,title.ilike.%${query}%,description.ilike.%${query}%`
    );

    dbQuery = dbQuery.order('lastActivityAt', { ascending: false }).limit(50);

    const { data: ticketsData } = await dbQuery;

    const tickets = (ticketsData || []) as SupportTicketRecord[];

    // Also search by tag (overlaps doesn't work well with search, so filter in memory)
    // For a more comprehensive search, we might need to expand this

    // Fetch creators and assigned preparers
    const creatorIds = [...new Set(tickets.map((t) => t.creatorId))];
    const assignedIds = [...new Set(tickets.map((t) => t.assignedToId).filter(Boolean))];

    const { data: creatorsData } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .in('id', creatorIds.length > 0 ? creatorIds : ['__none__']);

    const creatorMap = new Map((creatorsData || []).map((c: ProfileRecord) => [c.id, c]));

    const { data: assignedData } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .in('id', assignedIds.length > 0 ? (assignedIds as string[]) : ['__none__']);

    const assignedMap = new Map((assignedData || []).map((a: ProfileRecord) => [a.id, a]));

    return tickets.map((t) => ({
      ...t,
      creator: creatorMap.get(t.creatorId) || null,
      assignedTo: t.assignedToId ? assignedMap.get(t.assignedToId) || null : null,
    }));
  } catch (error) {
    logger.error('Failed to search tickets', {
      error,
      query,
    });
    throw new Error('Failed to search tickets');
  }
}
