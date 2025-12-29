/**
 * CRM Task Service
 *
 * Manages tasks and reminders associated with CRM contacts
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

interface TaskRecord {
  id: string;
  contactId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo?: string | null;
  createdBy?: string | null;
  completedAt?: string | null;
  completedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  contact?: ContactBasic | null;
}

interface ContactBasic {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}

export interface CreateTaskInput {
  contactId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  priority?: TaskPriority;
  assignedTo?: string; // userId
  createdBy?: string; // userId
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  dueDate?: Date;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignedTo?: string;
}

export interface TaskFilters {
  contactId?: string;
  assignedTo?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  overdue?: boolean;
  dueBefore?: Date;
  dueAfter?: Date;
}

export class CRMTaskService {
  /**
   * Create a new task
   */
  static async createTask(data: CreateTaskInput) {
    try {
      logger.info('[CRMTaskService] Creating task', {
        contactId: data.contactId,
        title: data.title,
      });

      const { data: task, error } = await db
        .from('crm_tasks')
        .insert({
          contactId: data.contactId,
          title: data.title,
          description: data.description,
          dueDate: data.dueDate?.toISOString(),
          priority: data.priority || ('MEDIUM' as TaskPriority),
          status: 'TODO' as TaskStatus,
          assignedTo: data.assignedTo,
          createdBy: data.createdBy,
        })
        .select()
        .single();

      if (error) throw error;

      // Get contact info
      const { data: contactData } = await db
        .from('crm_contacts')
        .select('id, firstName, lastName, email')
        .eq('id', data.contactId)
        .limit(1);

      const contact = firstOrNull(contactData) as ContactBasic | null;

      logger.info('[CRMTaskService] Task created', { taskId: task?.id });
      return { ...task, contact } as TaskRecord;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMTaskService] Error creating task', { error: errorMessage });
      throw new Error(`Failed to create task: ${errorMessage}`);
    }
  }

  /**
   * Get task by ID
   */
  static async getTaskById(taskId: string) {
    try {
      const { data: taskData, error } = await db
        .from('crm_tasks')
        .select('*')
        .eq('id', taskId)
        .limit(1);

      if (error) throw error;

      const task = firstOrNull(taskData) as TaskRecord | null;

      if (!task) {
        throw new Error('Task not found');
      }

      // Get contact info
      const { data: contactData } = await db
        .from('crm_contacts')
        .select('id, firstName, lastName, email')
        .eq('id', task.contactId)
        .limit(1);

      task.contact = firstOrNull(contactData) as ContactBasic | null;

      return task;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMTaskService] Error getting task', { error: errorMessage, taskId });
      throw error;
    }
  }

  /**
   * List tasks with filters
   */
  static async listTasks(
    filters: TaskFilters = {},
    pagination: { page?: number; limit?: number } = {}
  ) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      // Build query
      let query = db.from('crm_tasks').select('*');

      if (filters.contactId) query = query.eq('contactId', filters.contactId);
      if (filters.assignedTo) query = query.eq('assignedTo', filters.assignedTo);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.priority) query = query.eq('priority', filters.priority);

      if (filters.overdue) {
        query = query
          .lte('dueDate', new Date().toISOString())
          .not('status', 'eq', 'DONE')
          .not('status', 'eq', 'CANCELLED');
      }

      if (filters.dueBefore) {
        query = query.lte('dueDate', filters.dueBefore.toISOString());
      }

      if (filters.dueAfter) {
        query = query.gte('dueDate', filters.dueAfter.toISOString());
      }

      // Order by dueDate first, then priority, then createdAt
      query = query
        .order('dueDate', { ascending: true, nullsFirst: false })
        .order('createdAt', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: tasksData, error } = await query;

      if (error) throw error;

      const tasks = (tasksData || []) as TaskRecord[];

      // Get contact info for all tasks
      const contactIds = [...new Set(tasks.map((t) => t.contactId))];
      if (contactIds.length > 0) {
        const { data: contactsData } = await db
          .from('crm_contacts')
          .select('id, firstName, lastName, email')
          .in('id', contactIds);

        const contactsMap = new Map((contactsData || []).map((c: ContactBasic) => [c.id, c]));

        for (const task of tasks) {
          task.contact = contactsMap.get(task.contactId) || null;
        }
      }

      // Get total count with same filters
      let countQuery = db.from('crm_tasks').select('id', { count: 'exact', head: true });

      if (filters.contactId) countQuery = countQuery.eq('contactId', filters.contactId);
      if (filters.assignedTo) countQuery = countQuery.eq('assignedTo', filters.assignedTo);
      if (filters.status) countQuery = countQuery.eq('status', filters.status);
      if (filters.priority) countQuery = countQuery.eq('priority', filters.priority);

      if (filters.overdue) {
        countQuery = countQuery
          .lte('dueDate', new Date().toISOString())
          .not('status', 'eq', 'DONE')
          .not('status', 'eq', 'CANCELLED');
      }

      if (filters.dueBefore) {
        countQuery = countQuery.lte('dueDate', filters.dueBefore.toISOString());
      }

      if (filters.dueAfter) {
        countQuery = countQuery.gte('dueDate', filters.dueAfter.toISOString());
      }

      const { count: total } = await countQuery;

      return {
        tasks,
        total: total || 0,
        page,
        limit,
        totalPages: Math.ceil((total || 0) / limit),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMTaskService] Error listing tasks', { error: errorMessage });
      throw new Error(`Failed to list tasks: ${errorMessage}`);
    }
  }

  /**
   * Update task
   */
  static async updateTask(taskId: string, data: UpdateTaskInput, updatedBy?: string) {
    try {
      logger.info('[CRMTaskService] Updating task', { taskId, updates: Object.keys(data) });

      // Build update data
      const updateData: Record<string, unknown> = {};

      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.dueDate !== undefined) updateData.dueDate = data.dueDate?.toISOString();
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;

      // If marking as done, set completedAt and completedBy
      if (data.status === 'DONE') {
        updateData.completedAt = new Date().toISOString();
        updateData.completedBy = updatedBy;
      }

      const { data: task, error } = await db
        .from('crm_tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      // Get contact info
      if (task) {
        const { data: contactData } = await db
          .from('crm_contacts')
          .select('id, firstName, lastName, email')
          .eq('id', (task as TaskRecord).contactId)
          .limit(1);

        (task as TaskRecord).contact = firstOrNull(contactData) as ContactBasic | null;
      }

      logger.info('[CRMTaskService] Task updated', { taskId });
      return task as TaskRecord;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMTaskService] Error updating task', { error: errorMessage, taskId });
      throw new Error(`Failed to update task: ${errorMessage}`);
    }
  }

  /**
   * Delete task
   */
  static async deleteTask(taskId: string) {
    try {
      logger.info('[CRMTaskService] Deleting task', { taskId });

      const { error } = await db.from('crm_tasks').delete().eq('id', taskId);

      if (error) throw error;

      logger.info('[CRMTaskService] Task deleted', { taskId });
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMTaskService] Error deleting task', { error: errorMessage, taskId });
      throw new Error(`Failed to delete task: ${errorMessage}`);
    }
  }

  /**
   * Get tasks due soon (within next 7 days)
   */
  static async getTasksDueSoon(assignedTo: string, days: number = 7) {
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);

      const { data: tasksData, error } = await db
        .from('crm_tasks')
        .select('*')
        .eq('assignedTo', assignedTo)
        .gte('dueDate', new Date().toISOString())
        .lte('dueDate', dueDate.toISOString())
        .not('status', 'in', '(DONE,CANCELLED)')
        .order('dueDate', { ascending: true });

      if (error) throw error;

      const tasks = (tasksData || []) as TaskRecord[];

      // Get contact info for all tasks
      const contactIds = [...new Set(tasks.map((t) => t.contactId))];
      if (contactIds.length > 0) {
        const { data: contactsData } = await db
          .from('crm_contacts')
          .select('id, firstName, lastName, email')
          .in('id', contactIds);

        const contactsMap = new Map((contactsData || []).map((c: ContactBasic) => [c.id, c]));

        for (const task of tasks) {
          task.contact = contactsMap.get(task.contactId) || null;
        }
      }

      return tasks;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMTaskService] Error getting tasks due soon', { error: errorMessage });
      throw new Error(`Failed to get tasks due soon: ${errorMessage}`);
    }
  }

  /**
   * Get overdue tasks
   */
  static async getOverdueTasks(assignedTo?: string) {
    try {
      let query = db
        .from('crm_tasks')
        .select('*')
        .lt('dueDate', new Date().toISOString())
        .not('status', 'in', '(DONE,CANCELLED)')
        .order('dueDate', { ascending: true });

      if (assignedTo) {
        query = query.eq('assignedTo', assignedTo);
      }

      const { data: tasksData, error } = await query;

      if (error) throw error;

      const tasks = (tasksData || []) as TaskRecord[];

      // Get contact info for all tasks
      const contactIds = [...new Set(tasks.map((t) => t.contactId))];
      if (contactIds.length > 0) {
        const { data: contactsData } = await db
          .from('crm_contacts')
          .select('id, firstName, lastName, email')
          .in('id', contactIds);

        const contactsMap = new Map((contactsData || []).map((c: ContactBasic) => [c.id, c]));

        for (const task of tasks) {
          task.contact = contactsMap.get(task.contactId) || null;
        }
      }

      return tasks;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMTaskService] Error getting overdue tasks', { error: errorMessage });
      throw new Error(`Failed to get overdue tasks: ${errorMessage}`);
    }
  }

  /**
   * Get task statistics for a user
   */
  static async getTaskStats(assignedTo: string) {
    try {
      const [
        { count: total },
        { count: todo },
        { count: inProgress },
        { count: done },
        { count: overdue },
      ] = await Promise.all([
        db
          .from('crm_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignedTo', assignedTo),
        db
          .from('crm_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignedTo', assignedTo)
          .eq('status', 'TODO'),
        db
          .from('crm_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignedTo', assignedTo)
          .eq('status', 'IN_PROGRESS'),
        db
          .from('crm_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignedTo', assignedTo)
          .eq('status', 'DONE'),
        db
          .from('crm_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignedTo', assignedTo)
          .lt('dueDate', new Date().toISOString())
          .not('status', 'in', '(DONE,CANCELLED)'),
      ]);

      return {
        total: total || 0,
        todo: todo || 0,
        inProgress: inProgress || 0,
        done: done || 0,
        overdue: overdue || 0,
        active: (todo || 0) + (inProgress || 0),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMTaskService] Error getting task stats', { error: errorMessage });
      throw new Error(`Failed to get task stats: ${errorMessage}`);
    }
  }
}
