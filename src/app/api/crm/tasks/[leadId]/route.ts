/**
 * CRM Lead Tasks API
 *
 * GET /api/crm/tasks/[leadId]
 * Fetches all tasks for a specific lead.
 *
 * POST /api/crm/tasks/[leadId]
 * Creates a new task for a lead.
 *
 * @module api/crm/tasks/[leadId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkCRMPermission, CRMFeature } from '@/lib/permissions/crm-permissions';
import { logger } from '@/lib/logger';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { logTaskCreated } from '@/lib/services/activity.service';

/**
 * GET /api/crm/tasks/[leadId]
 *
 * Query params:
 * - status: Filter by task status (optional)
 * - assignedTo: Filter by assigned profile ID (optional)
 *
 * Response:
 * {
 *   "tasks": [...],
 *   "total": 123,
 *   "stats": { "TODO": 5, "IN_PROGRESS": 2, "DONE": 10 }
 * }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check permission
    const permissionCheck = await checkCRMPermission(userId, CRMFeature.TASK_MANAGEMENT);
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: 'You do not have permission to view tasks' },
        { status: 403 }
      );
    }

    const leadId = params.leadId;

    // Verify lead exists and user has access
    const lead = await prisma.taxIntakeLead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        assignedTo: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, role: true },
    });

    // Check access
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
    const isAssignedPreparer = lead.assignedTo === profile?.id;

    if (!isAdmin && !isAssignedPreparer) {
      return NextResponse.json(
        { error: 'You do not have access to this lead' },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as TaskStatus | null;
    const assignedTo = searchParams.get('assignedTo');

    // Build where clause
    const where: any = { leadId };
    if (status && Object.values(TaskStatus).includes(status)) {
      where.status = status;
    }
    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    // Fetch tasks
    const tasks = await prisma.leadTask.findMany({
      where,
      orderBy: [
        { status: 'asc' }, // TODO first, then IN_PROGRESS, then DONE
        { priority: 'desc' }, // URGENT first
        { dueDate: 'asc' }, // Soonest due date first
      ],
    });

    // Get stats
    const stats = await prisma.leadTask.groupBy({
      by: ['status'],
      where: { leadId },
      _count: true,
    });

    const statsMap: Record<string, number> = {};
    stats.forEach((stat) => {
      statsMap[stat.status] = stat._count;
    });

    logger.info(`User ${userId} fetched ${tasks.length} tasks for lead ${leadId}`);

    return NextResponse.json({
      tasks,
      total: tasks.length,
      stats: statsMap,
    });
  } catch (error) {
    logger.error('Error fetching lead tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

/**
 * POST /api/crm/tasks/[leadId]
 *
 * Request body:
 * {
 *   "title": "Follow up call",
 *   "description": "Call to discuss tax return",
 *   "priority": "HIGH",
 *   "dueDate": "2025-01-15T14:00:00Z",
 *   "assignedTo": "profile_id" // optional
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "task": {...}
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check permission
    const permissionCheck = await checkCRMPermission(userId, CRMFeature.TASK_MANAGEMENT);
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: 'You do not have permission to create tasks' },
        { status: 403 }
      );
    }

    const leadId = params.leadId;

    // Verify lead exists and user has access
    const lead = await prisma.taxIntakeLead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        assignedTo: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        id: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check access
    const isAdmin = profile.role === 'admin' || profile.role === 'super_admin';
    const isAssignedPreparer = lead.assignedTo === profile.id;

    if (!isAdmin && !isAssignedPreparer) {
      return NextResponse.json(
        { error: 'You do not have access to this lead' },
        { status: 403 }
      );
    }

    // Parse request body
    const { title, description, priority, dueDate, assignedTo } = await req.json();

    // Validate
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (priority && !Object.values(TaskPriority).includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    }

    // Get assigned to name if provided
    let assignedToName = null;
    if (assignedTo) {
      const assignedProfile = await prisma.profile.findUnique({
        where: { id: assignedTo },
        select: { firstName: true, lastName: true },
      });

      if (assignedProfile) {
        assignedToName = [assignedProfile.firstName, assignedProfile.lastName]
          .filter(Boolean)
          .join(' ');
      }
    }

    // Create task
    const createdByName = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(' ') || 'Unknown';

    const task = await prisma.leadTask.create({
      data: {
        leadId,
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || TaskPriority.MEDIUM,
        status: TaskStatus.TODO,
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedTo: assignedTo || profile.id, // Default to creator
        assignedToName: assignedToName || createdByName,
        createdBy: profile.id,
        createdByName,
      },
    });

    // Log activity
    await logTaskCreated(
      leadId,
      title,
      task.id,
      task.dueDate || undefined,
      profile.id,
      createdByName
    );

    logger.info(`User ${userId} created task for lead ${leadId}`, {
      taskId: task.id,
    });

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    logger.error('Error creating lead task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
