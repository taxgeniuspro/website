/**
 * Support Tickets API
 * POST   /api/support/tickets - Create new ticket
 * GET    /api/support/tickets - List tickets (filtered by role)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  createTicket,
  getTicketsByUser,
  getTicketStats,
} from '@/lib/services/support-ticket.service';
import { executeWorkflows } from '@/lib/services/ticket-workflow.service';
import { WorkflowTrigger, TicketStatus, TicketPriority, UserRole } from '@prisma/client';
import { logger } from '@/lib/logger';

/**
 * GET /api/support/tickets
 * List tickets for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with role
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, role: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const statusFilter = searchParams.get('status')?.split(',') as TicketStatus[] | undefined;
    const priorityFilter = searchParams.get('priority')?.split(',') as TicketPriority[] | undefined;
    const search = searchParams.get('search') || undefined;
    const includeStats = searchParams.get('includeStats') === 'true';

    // Determine role for filtering
    let role: 'client' | 'preparer' | 'admin' = 'client';
    if (profile.role === UserRole.TAX_PREPARER) {
      role = 'preparer';
    } else if (profile.role === UserRole.SUPER_ADMIN || profile.role === UserRole.ADMIN) {
      role = 'admin';
    } else if (profile.role === UserRole.CLIENT || profile.role === UserRole.LEAD) {
      role = 'client';
    }

    // Get tickets
    const result = await getTicketsByUser(
      profile.id,
      role,
      {
        status: statusFilter,
        priority: priorityFilter,
        search,
      },
      page,
      limit
    );

    // Optionally include statistics
    let stats = undefined;
    if (includeStats) {
      stats = await getTicketStats(profile.id, role);
    }

    return NextResponse.json({
      success: true,
      data: {
        tickets: result.tickets,
        pagination: result.pagination,
        stats,
      },
    });
  } catch (error) {
    logger.error('Failed to get tickets', { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get tickets',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/support/tickets
 * Create a new support ticket
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { title, description, priority, tags, customFields } = body;

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description' },
        { status: 400 }
      );
    }

    // Create ticket (automatically assigns to preparer via ClientPreparer relationship)
    const ticket = await createTicket({
      title,
      description,
      priority: priority || TicketPriority.NORMAL,
      tags: tags || [],
      customFields: customFields || {},
      creatorId: profile.id,
    });

    // Trigger workflows asynchronously
    executeWorkflows(WorkflowTrigger.TICKET_CREATED, ticket.id).catch((error) => {
      logger.error('Failed to execute workflows for new ticket', {
        error,
        ticketId: ticket.id,
      });
    });

    logger.info('Ticket created via API', {
      ticketId: ticket.id,
      creatorId: profile.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        ticket,
      },
    });
  } catch (error) {
    logger.error('Failed to create ticket', { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create ticket',
      },
      { status: 500 }
    );
  }
}
