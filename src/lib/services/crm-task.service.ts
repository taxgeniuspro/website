/**
 * CRM Task Service
 *
 * Manages tasks and reminders associated with CRM contacts
 */

import { prisma } from '@/lib/prisma';
import { TaskPriority, TaskStatus, type Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

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

      const task = await prisma.cRMTask.create({
        data: {
          contactId: data.contactId,
          title: data.title,
          description: data.description,
          dueDate: data.dueDate,
          priority: data.priority || TaskPriority.MEDIUM,
          status: TaskStatus.TODO,
          assignedTo: data.assignedTo,
          createdBy: data.createdBy,
        },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      logger.info('[CRMTaskService] Task created', { taskId: task.id });
      return task;
    } catch (error: unknown) {
      logger.error('[CRMTaskService] Error creating task', { error: error.message });
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }

  /**
   * Get task by ID
   */
  static async getTaskById(taskId: string) {
    try {
      const task = await prisma.cRMTask.findUnique({
        where: { id: taskId },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!task) {
        throw new Error('Task not found');
      }

      return task;
    } catch (error: unknown) {
      logger.error('[CRMTaskService] Error getting task', { error: error.message, taskId });
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
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.CRMTaskWhereInput = {};

      if (filters.contactId) where.contactId = filters.contactId;
      if (filters.assignedTo) where.assignedTo = filters.assignedTo;
      if (filters.status) where.status = filters.status;
      if (filters.priority) where.priority = filters.priority;

      if (filters.overdue) {
        where.AND = [
          { dueDate: { lte: new Date() } },
          { status: { not: TaskStatus.DONE } },
          { status: { not: TaskStatus.CANCELLED } },
        ];
      }

      if (filters.dueBefore) {
        where.dueDate = { ...where.dueDate, lte: filters.dueBefore };
      }

      if (filters.dueAfter) {
        where.dueDate = { ...where.dueDate, gte: filters.dueAfter };
      }

      const [tasks, total] = await Promise.all([
        prisma.cRMTask.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        prisma.cRMTask.count({ where }),
      ]);

      return {
        tasks,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: unknown) {
      logger.error('[CRMTaskService] Error listing tasks', { error: error.message });
      throw new Error(`Failed to list tasks: ${error.message}`);
    }
  }

  /**
   * Update task
   */
  static async updateTask(taskId: string, data: UpdateTaskInput, updatedBy?: string) {
    try {
      logger.info('[CRMTaskService] Updating task', { taskId, updates: Object.keys(data) });

      // If marking as done, set completedAt and completedBy
      const updateData: Prisma.CRMTaskUpdateInput = { ...data };

      if (data.status === TaskStatus.DONE) {
        updateData.completedAt = new Date();
        updateData.completedBy = updatedBy;
      }

      const task = await prisma.cRMTask.update({
        where: { id: taskId },
        data: updateData,
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      logger.info('[CRMTaskService] Task updated', { taskId });
      return task;
    } catch (error: unknown) {
      logger.error('[CRMTaskService] Error updating task', { error: error.message, taskId });
      throw new Error(`Failed to update task: ${error.message}`);
    }
  }

  /**
   * Delete task
   */
  static async deleteTask(taskId: string) {
    try {
      logger.info('[CRMTaskService] Deleting task', { taskId });

      await prisma.cRMTask.delete({
        where: { id: taskId },
      });

      logger.info('[CRMTaskService] Task deleted', { taskId });
      return { success: true };
    } catch (error: unknown) {
      logger.error('[CRMTaskService] Error deleting task', { error: error.message, taskId });
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }

  /**
   * Get tasks due soon (within next 7 days)
   */
  static async getTasksDueSoon(assignedTo: string, days: number = 7) {
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);

      const tasks = await prisma.cRMTask.findMany({
        where: {
          assignedTo,
          dueDate: {
            gte: new Date(),
            lte: dueDate,
          },
          status: {
            notIn: [TaskStatus.DONE, TaskStatus.CANCELLED],
          },
        },
        orderBy: { dueDate: 'asc' },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return tasks;
    } catch (error: unknown) {
      logger.error('[CRMTaskService] Error getting tasks due soon', { error: error.message });
      throw new Error(`Failed to get tasks due soon: ${error.message}`);
    }
  }

  /**
   * Get overdue tasks
   */
  static async getOverdueTasks(assignedTo?: string) {
    try {
      const where: Prisma.CRMTaskWhereInput = {
        dueDate: { lt: new Date() },
        status: {
          notIn: [TaskStatus.DONE, TaskStatus.CANCELLED],
        },
      };

      if (assignedTo) {
        where.assignedTo = assignedTo;
      }

      const tasks = await prisma.cRMTask.findMany({
        where,
        orderBy: { dueDate: 'asc' },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return tasks;
    } catch (error: unknown) {
      logger.error('[CRMTaskService] Error getting overdue tasks', { error: error.message });
      throw new Error(`Failed to get overdue tasks: ${error.message}`);
    }
  }

  /**
   * Get task statistics for a user
   */
  static async getTaskStats(assignedTo: string) {
    try {
      const [total, todo, inProgress, done, overdue] = await Promise.all([
        prisma.cRMTask.count({ where: { assignedTo } }),
        prisma.cRMTask.count({ where: { assignedTo, status: TaskStatus.TODO } }),
        prisma.cRMTask.count({ where: { assignedTo, status: TaskStatus.IN_PROGRESS } }),
        prisma.cRMTask.count({ where: { assignedTo, status: TaskStatus.DONE } }),
        prisma.cRMTask.count({
          where: {
            assignedTo,
            dueDate: { lt: new Date() },
            status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
          },
        }),
      ]);

      return {
        total,
        todo,
        inProgress,
        done,
        overdue,
        active: todo + inProgress,
      };
    } catch (error: unknown) {
      logger.error('[CRMTaskService] Error getting task stats', { error: error.message });
      throw new Error(`Failed to get task stats: ${error.message}`);
    }
  }
}
