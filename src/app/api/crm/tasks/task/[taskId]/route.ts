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
import { db, firstOrNull } from '@/lib/db';
import { checkCRMPermission, CRMFeature } from '@/lib/permissions/crm-permissions';
import { logger } from '@/lib/logger';
import { logTaskCompleted } from '@/lib/services/activity.service';

// Local type definitions (replacing @prisma/client imports)
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

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
  { params }: { params: Promise<{ taskId: string }> }
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

    const { taskId } = await params;

    // Fetch existing task
    const { data: existingTasks } = await db
      .from('lead_tasks')
      .select('*')
      .eq('id', taskId)
      .limit(1);

    const existingTask = firstOrNull(existingTasks);

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Fetch lead info
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select('id, assignedTo')
      .eq('id', existingTask.leadId)
      .limit(1);

    const lead = firstOrNull(leads);

    // Get user profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id, role, firstName, lastName')
      .eq('userId', userId)
      .limit(1);

    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check access
    const isAdmin = profile.role === 'admin';
    const isAssignedPreparer = lead?.assignedTo === profile.id;

    if (!isAdmin && !isAssignedPreparer) {
      return NextResponse.json(
        { error: 'You do not have access to this task' },
        { status: 403 }
      );
    }

    // Parse request body
    const updates = await req.json();

    // Valid statuses and priorities
    const validStatuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
    const validPriorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

    // Validate status if provided
    if (updates.status && !validStatuses.includes(updates.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Validate priority if provided
    if (updates.priority && !validPriorities.includes(updates.priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    }

    // Build update data
    const updateData: Record<string, any> = {};

    if (updates.title !== undefined) updateData.title = updates.title.trim();
    if (updates.description !== undefined) updateData.description = updates.description?.trim() || null;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate ? new Date(updates.dueDate).toISOString() : null;

    // If status is being changed to DONE, set completedAt
    if (updates.status === 'DONE' && existingTask.status !== 'DONE') {
      updateData.completedAt = new Date().toISOString();

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
    if (updates.status !== 'DONE' && existingTask.status === 'DONE') {
      updateData.completedAt = null;
    }

    // Update task
    const { data: task, error: updateError } = await db
      .from('lead_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

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
  { params }: { params: Promise<{ taskId: string }> }
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

    const { taskId } = await params;

    // Fetch task
    const { data: tasks } = await db
      .from('lead_tasks')
      .select('id, leadId')
      .eq('id', taskId)
      .limit(1);

    const task = firstOrNull(tasks);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Fetch lead info
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select('id, assignedTo')
      .eq('id', task.leadId)
      .limit(1);

    const lead = firstOrNull(leads);

    // Get user profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id, role')
      .eq('userId', userId)
      .limit(1);

    const profile = firstOrNull(profiles);

    // Check access
    const isAdmin = profile?.role === 'admin';
    const isAssignedPreparer = lead?.assignedTo === profile?.id;

    if (!isAdmin && !isAssignedPreparer) {
      return NextResponse.json(
        { error: 'You do not have access to this task' },
        { status: 403 }
      );
    }

    // Delete task
    await db
      .from('lead_tasks')
      .delete()
      .eq('id', taskId);

    logger.info(`User ${userId} deleted task ${taskId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
