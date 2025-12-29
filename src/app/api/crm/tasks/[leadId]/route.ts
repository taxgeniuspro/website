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
import { db, firstOrNull } from '@/lib/db';
import { checkCRMPermission, CRMFeature } from '@/lib/permissions/crm-permissions';
import { logger } from '@/lib/logger';
import { logTaskCreated } from '@/lib/services/activity.service';

// Local type definitions (replacing @prisma/client imports)
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

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
  { params }: { params: Promise<{ leadId: string }> }
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

    const { leadId } = await params;

    // Verify lead exists and user has access
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select('id, assignedTo')
      .eq('id', leadId)
      .limit(1);

    const lead = firstOrNull(leads);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Get user profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id, role')
      .eq('userId', userId)
      .limit(1);

    const profile = firstOrNull(profiles);

    // Check access
    const isAdmin = profile?.role === 'admin';
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

    // Valid statuses
    const validStatuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

    // Build query for tasks
    let query = db
      .from('lead_tasks')
      .select('*')
      .eq('leadId', leadId)
      .order('status', { ascending: true }) // TODO first, then IN_PROGRESS, then DONE
      .order('priority', { ascending: false }) // URGENT first
      .order('dueDate', { ascending: true, nullsFirst: false }); // Soonest due date first

    if (status && validStatuses.includes(status)) {
      query = query.eq('status', status);
    }
    if (assignedTo) {
      query = query.eq('assignedTo', assignedTo);
    }

    const { data: tasks } = await query;

    // Get stats (count by status) - separate queries for each status
    const statsMap: Record<string, number> = {};
    for (const s of validStatuses) {
      const { count } = await db
        .from('lead_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('leadId', leadId)
        .eq('status', s);
      statsMap[s] = count || 0;
    }

    logger.info(`User ${userId} fetched ${(tasks || []).length} tasks for lead ${leadId}`);

    return NextResponse.json({
      tasks: tasks || [],
      total: (tasks || []).length,
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
  { params }: { params: Promise<{ leadId: string }> }
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

    const { leadId } = await params;

    // Verify lead exists and user has access
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select('id, assignedTo')
      .eq('id', leadId)
      .limit(1);

    const lead = firstOrNull(leads);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

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

    // Valid priorities
    const validPriorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    }

    // Get assigned to name if provided
    let assignedToName = null;
    if (assignedTo) {
      const { data: assignedProfiles } = await db
        .from('profiles')
        .select('firstName, lastName')
        .eq('id', assignedTo)
        .limit(1);

      const assignedProfile = firstOrNull(assignedProfiles);

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

    const { data: task, error: insertError } = await db
      .from('lead_tasks')
      .insert({
        leadId,
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || 'MEDIUM',
        status: 'TODO' as TaskStatus,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        assignedTo: assignedTo || profile.id, // Default to creator
        assignedToName: assignedToName || createdByName,
        createdBy: profile.id,
        createdByName,
      })
      .select()
      .single();

    if (insertError || !task) {
      throw new Error(insertError?.message || 'Failed to create task');
    }

    // Log activity
    await logTaskCreated(
      leadId,
      title,
      task.id,
      task.dueDate ? new Date(task.dueDate) : undefined,
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
