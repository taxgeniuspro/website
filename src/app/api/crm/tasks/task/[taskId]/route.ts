/**
 * CRM Task Update/Delete API
 *
 * PATCH /api/crm/tasks/task/[taskId]
 * Updates a specific task.
 *
 * DELETE /api/crm/tasks/task/[taskId]
 * Deletes a specific task.
 *
 * @module api/crm/tasks/task/[taskId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkCRMPermission, CRMFeature } from '@/lib/permissions/crm-permissions';
import { logger } from '@/lib/logger';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { logTaskCompleted } from '@/lib/services/activity.service';

/**
 * PATCH /api/crm/tasks/task/[taskId]
 *
 * Request body (partial update):
 * {
 *   "title": "Updated title",
 *   "status": "IN_PROGRESS",
 *   "priority": "URGENT",
 *   "dueDate": "2025-01-20T14:00:00Z"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "task": {...}
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { taskId: string } }
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
        { error: 'You do not have permission to update tasks' },
        { status: 403 }
      );
    }

    const taskId = params.taskId;

    // Fetch existing task with lead info
    const existingTask = await prisma.leadTask.findUnique({
      where: { id: taskId },
      include: {
        lead: {
          select: {
            id: true,
            assignedTo: true,
          },
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
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
    const isAssignedPreparer = existingTask.lead.assignedTo === profile.id;

    if (!isAdmin && !isAssignedPreparer) {
      return NextResponse.json(
        { error: 'You do not have access to this task' },
        { status: 403 }
      );
    }

    // Parse request body
    const updates = await req.json();

    // Validate status if provided
    if (updates.status && !Object.values(TaskStatus).includes(updates.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Validate priority if provided
    if (updates.priority && !Object.values(TaskPriority).includes(updates.priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    }

    // Build update data
    const updateData: any = {};

    if (updates.title !== undefined) updateData.title = updates.title.trim();
    if (updates.description !== undefined) updateData.description = updates.description?.trim() || null;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;

    // If status is being changed to DONE, set completedAt
    if (updates.status === TaskStatus.DONE && existingTask.status !== TaskStatus.DONE) {
      updateData.completedAt = new Date();

      // Log task completion activity
      const createdByName = [profile.firstName, profile.lastName]
        .filter(Boolean)
        .join(' ') || 'Unknown';

      await logTaskCompleted(
        existingTask.leadId,
        existingTask.title,
        existingTask.id,
        profile.id,
        createdByName
      );
    }

    // If status is being changed from DONE to something else, clear completedAt
    if (updates.status !== TaskStatus.DONE && existingTask.status === TaskStatus.DONE) {
      updateData.completedAt = null;
    }

    // Update task
    const task = await prisma.leadTask.update({
      where: { id: taskId },
      data: updateData,
    });

    logger.info(`User ${userId} updated task ${taskId}`, { updates });

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    logger.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/tasks/task/[taskId]
 *
 * Response:
 * {
 *   "success": true
 * }
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { taskId: string } }
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
        { error: 'You do not have permission to delete tasks' },
        { status: 403 }
      );
    }

    const taskId = params.taskId;

    // Fetch task with lead info
    const task = await prisma.leadTask.findUnique({
      where: { id: taskId },
      include: {
        lead: {
          select: {
            id: true,
            assignedTo: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, role: true },
    });

    // Check access
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
    const isAssignedPreparer = task.lead.assignedTo === profile?.id;

    if (!isAdmin && !isAssignedPreparer) {
      return NextResponse.json(
        { error: 'You do not have access to this task' },
        { status: 403 }
      );
    }

    // Delete task
    await prisma.leadTask.delete({
      where: { id: taskId },
    });

    logger.info(`User ${userId} deleted task ${taskId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
