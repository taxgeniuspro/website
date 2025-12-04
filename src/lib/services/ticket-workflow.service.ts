/**
 * Ticket Workflow Service
 * Handles workflow automation for support tickets
 * Triggers: ticket events (created, updated, idle, responses)
 * Actions: assign, notify, status change, auto-close, etc.
 */

import { prisma } from '@/lib/prisma';
import {
  WorkflowTrigger,
  WorkflowActionType,
  TicketStatus,
  TicketPriority,
  Prisma,
} from '@prisma/client';
import { logger } from '@/lib/logger';

// ==================== Types ====================

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  isActive?: boolean;
  priority?: number;
  conditions?: WorkflowConditions;
  actions: WorkflowAction[];
  createdById: string;
}

export interface WorkflowConditions {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  tags?: string[];
  idleHours?: number;
  customField?: {
    key: string;
    value: string | number | boolean;
  };
}

export interface WorkflowActionConfig {
  preparerId?: string;
  tag?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  savedReplyId?: string;
  senderId?: string;
  message?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface WorkflowAction {
  type: WorkflowActionType;
  config: WorkflowActionConfig;
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  priority?: number;
  conditions?: WorkflowConditions;
  actions?: WorkflowAction[];
}

export type TicketWithRelations = Prisma.SupportTicketGetPayload<{
  include: {
    creator: true;
    assignedTo: true;
    messages: {
      orderBy: { createdAt: 'desc' };
      take: 1;
    };
  };
}>;

export type WorkflowWithCreator = Prisma.TicketWorkflowGetPayload<{
  include: {
    createdBy: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
      };
    };
  };
}>;

// ==================== Workflow Management ====================

/**
 * Create a new workflow
 */
export async function createWorkflow(input: CreateWorkflowInput) {
  try {
    const workflow = await prisma.ticketWorkflow.create({
      data: {
        name: input.name,
        description: input.description,
        trigger: input.trigger,
        isActive: input.isActive !== false,
        priority: input.priority || 0,
        conditions: input.conditions || {},
        actions: input.actions,
        createdById: input.createdById,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info('Workflow created', {
      workflowId: workflow.id,
      name: workflow.name,
      trigger: workflow.trigger,
    });

    return workflow;
  } catch (error) {
    logger.error('Failed to create workflow', {
      error,
      input,
    });
    throw new Error('Failed to create workflow');
  }
}

/**
 * Get all workflows
 */
export async function getWorkflows(filters?: { trigger?: WorkflowTrigger; isActive?: boolean }) {
  try {
    const where: Prisma.TicketWorkflowWhereInput = {};

    if (filters?.trigger) {
      where.trigger = filters.trigger;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const workflows = await prisma.ticketWorkflow.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return workflows;
  } catch (error) {
    logger.error('Failed to get workflows', { error });
    throw new Error('Failed to get workflows');
  }
}

/**
 * Get workflow by ID
 */
export async function getWorkflowById(workflowId: string) {
  try {
    const workflow = await prisma.ticketWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        logs: {
          take: 10,
          orderBy: {
            executedAt: 'desc',
          },
        },
      },
    });

    return workflow;
  } catch (error) {
    logger.error('Failed to get workflow by ID', {
      error,
      workflowId,
    });
    throw new Error('Failed to get workflow');
  }
}

/**
 * Update a workflow
 */
export async function updateWorkflow(workflowId: string, input: UpdateWorkflowInput) {
  try {
    const workflow = await prisma.ticketWorkflow.update({
      where: { id: workflowId },
      data: input,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info('Workflow updated', {
      workflowId,
      updates: input,
    });

    return workflow;
  } catch (error) {
    logger.error('Failed to update workflow', {
      error,
      workflowId,
      input,
    });
    throw new Error('Failed to update workflow');
  }
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(workflowId: string) {
  try {
    await prisma.ticketWorkflow.delete({
      where: { id: workflowId },
    });

    logger.info('Workflow deleted', { workflowId });

    return { success: true };
  } catch (error) {
    logger.error('Failed to delete workflow', {
      error,
      workflowId,
    });
    throw new Error('Failed to delete workflow');
  }
}

/**
 * Toggle workflow active status
 */
export async function toggleWorkflowStatus(workflowId: string, isActive: boolean) {
  return updateWorkflow(workflowId, { isActive });
}

// ==================== Workflow Execution ====================

/**
 * Execute workflows for a specific trigger and ticket
 */
export async function executeWorkflows(
  trigger: WorkflowTrigger,
  ticketId: string,
  context?: Record<string, string | number | boolean>
) {
  try {
    // Get active workflows for this trigger
    const workflows = await prisma.ticketWorkflow.findMany({
      where: {
        trigger,
        isActive: true,
      },
      orderBy: {
        priority: 'desc',
      },
    });

    if (workflows.length === 0) {
      return;
    }

    // Get ticket details
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        creator: true,
        assignedTo: true,
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!ticket) {
      return;
    }

    // Execute each workflow
    for (const workflow of workflows) {
      try {
        // Check if conditions are met
        const conditionsMet = checkWorkflowConditions(workflow, ticket, context);

        if (!conditionsMet) {
          await logWorkflowExecution(workflow.id, ticketId, 'skipped', {
            reason: 'Conditions not met',
          });
          continue;
        }

        // Execute workflow actions
        await executeWorkflowActions(workflow, ticket);

        // Update workflow statistics
        await prisma.ticketWorkflow.update({
          where: { id: workflow.id },
          data: {
            lastTriggeredAt: new Date(),
            triggerCount: { increment: 1 },
          },
        });

        await logWorkflowExecution(workflow.id, ticketId, 'success', {
          actionsExecuted: Array.isArray(workflow.actions) ? workflow.actions.length : 0,
        });
      } catch (error) {
        logger.error('Failed to execute workflow', {
          error,
          workflowId: workflow.id,
          ticketId,
        });

        await logWorkflowExecution(workflow.id, ticketId, 'failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  } catch (error) {
    logger.error('Failed to execute workflows', {
      error,
      trigger,
      ticketId,
    });
  }
}

/**
 * Check if workflow conditions are met
 */
function checkWorkflowConditions(
  workflow: WorkflowWithCreator,
  ticket: TicketWithRelations,
  context?: Record<string, string | number | boolean>
): boolean {
  const conditions = workflow.conditions as WorkflowConditions;

  if (!conditions || Object.keys(conditions).length === 0) {
    return true; // No conditions = always execute
  }

  // Check status condition
  if (conditions.status && !conditions.status.includes(ticket.status)) {
    return false;
  }

  // Check priority condition
  if (conditions.priority && !conditions.priority.includes(ticket.priority)) {
    return false;
  }

  // Check tags condition
  if (conditions.tags && conditions.tags.length > 0) {
    const hasRequiredTag = conditions.tags.some((tag) => ticket.tags.includes(tag));
    if (!hasRequiredTag) {
      return false;
    }
  }

  // Check idle hours condition
  if (conditions.idleHours) {
    const hoursSinceLastActivity =
      (Date.now() - new Date(ticket.lastActivityAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastActivity < conditions.idleHours) {
      return false;
    }
  }

  // Check custom field condition
  if (conditions.customField) {
    const customFields = ticket.customFields as Prisma.JsonObject;
    if (
      !customFields ||
      customFields[conditions.customField.key] !== conditions.customField.value
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Execute workflow actions
 */
async function executeWorkflowActions(workflow: WorkflowWithCreator, ticket: TicketWithRelations) {
  const actions = workflow.actions as WorkflowAction[];

  for (const action of actions) {
    try {
      await executeAction(action, ticket);
    } catch (error) {
      logger.error('Failed to execute workflow action', {
        error,
        workflowId: workflow.id,
        actionType: action.type,
        ticketId: ticket.id,
      });
    }
  }
}

/**
 * Execute a single workflow action
 */
async function executeAction(action: WorkflowAction, ticket: TicketWithRelations) {
  switch (action.type) {
    case WorkflowActionType.ASSIGN_PREPARER:
      await handleAssignPreparer(action.config, ticket);
      break;

    case WorkflowActionType.SEND_NOTIFICATION:
      await handleSendNotification(action.config, ticket);
      break;

    case WorkflowActionType.ADD_TAG:
      await handleAddTag(action.config, ticket);
      break;

    case WorkflowActionType.CHANGE_STATUS:
      await handleChangeStatus(action.config, ticket);
      break;

    case WorkflowActionType.CHANGE_PRIORITY:
      await handleChangePriority(action.config, ticket);
      break;

    case WorkflowActionType.SEND_SAVED_REPLY:
      await handleSendSavedReply(action.config, ticket);
      break;

    case WorkflowActionType.AUTO_CLOSE:
      await handleAutoClose(action.config, ticket);
      break;

    case WorkflowActionType.CREATE_TASK:
      await handleCreateTask(action.config, ticket);
      break;

    default:
      logger.warn('Unknown workflow action type', {
        actionType: action.type,
      });
  }
}

// ==================== Action Handlers ====================

async function handleAssignPreparer(config: WorkflowActionConfig, ticket: TicketWithRelations) {
  if (!config.preparerId) return;

  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { assignedToId: config.preparerId },
  });

  logger.info('Workflow: Assigned preparer', {
    ticketId: ticket.id,
    preparerId: config.preparerId,
  });
}

async function handleSendNotification(config: WorkflowActionConfig, ticket: TicketWithRelations) {
  // TODO: Integrate with notification service
  // This will be implemented when we enhance notification.service.ts
  logger.info('Workflow: Send notification', {
    ticketId: ticket.id,
    notificationConfig: config,
  });
}

async function handleAddTag(config: WorkflowActionConfig, ticket: TicketWithRelations) {
  if (!config.tag) return;

  const currentTags = ticket.tags || [];
  if (currentTags.includes(config.tag)) return;

  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: {
      tags: [...currentTags, config.tag],
    },
  });

  logger.info('Workflow: Added tag', {
    ticketId: ticket.id,
    tag: config.tag,
  });
}

async function handleChangeStatus(config: WorkflowActionConfig, ticket: TicketWithRelations) {
  if (!config.status) return;

  const updateData: Prisma.SupportTicketUpdateInput = { status: config.status };

  if (config.status === TicketStatus.RESOLVED) {
    updateData.resolvedAt = new Date();
  }
  if (config.status === TicketStatus.CLOSED) {
    updateData.closedAt = new Date();
  }

  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: updateData,
  });

  logger.info('Workflow: Changed status', {
    ticketId: ticket.id,
    newStatus: config.status,
  });
}

async function handleChangePriority(config: WorkflowActionConfig, ticket: TicketWithRelations) {
  if (!config.priority) return;

  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { priority: config.priority },
  });

  logger.info('Workflow: Changed priority', {
    ticketId: ticket.id,
    newPriority: config.priority,
  });
}

async function handleSendSavedReply(config: WorkflowActionConfig, ticket: TicketWithRelations) {
  if (!config.savedReplyId || !config.senderId) return;

  // TODO: Integrate with saved-reply service
  logger.info('Workflow: Send saved reply', {
    ticketId: ticket.id,
    savedReplyId: config.savedReplyId,
  });
}

async function handleAutoClose(config: WorkflowActionConfig, ticket: TicketWithRelations) {
  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: {
      status: TicketStatus.CLOSED,
      closedAt: new Date(),
    },
  });

  logger.info('Workflow: Auto-closed ticket', {
    ticketId: ticket.id,
  });
}

async function handleCreateTask(config: WorkflowActionConfig, ticket: TicketWithRelations) {
  // TODO: Integrate with CRM task system if needed
  logger.info('Workflow: Create task', {
    ticketId: ticket.id,
    taskConfig: config,
  });
}

/**
 * Log workflow execution
 */
async function logWorkflowExecution(
  workflowId: string,
  ticketId: string,
  result: string,
  details?: Record<string, string | number | boolean>
) {
  try {
    await prisma.ticketWorkflowLog.create({
      data: {
        workflowId,
        ticketId,
        action: 'execute',
        result,
        details: details || {},
      },
    });
  } catch (error) {
    logger.error('Failed to log workflow execution', {
      error,
      workflowId,
      ticketId,
    });
  }
}

// ==================== Auto-Close Service ====================

/**
 * Find and close idle tickets based on settings
 * This should be run as a scheduled job (e.g., via cron)
 */
export async function autoCloseIdleTickets(settings: {
  inactiveDays: number;
  excludeIfClientWaiting?: boolean;
  excludeTags?: string[];
}) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.inactiveDays);

    const where: Prisma.SupportTicketWhereInput = {
      lastActivityAt: { lt: cutoffDate },
      status: {
        notIn: [TicketStatus.CLOSED, TicketStatus.ARCHIVED],
      },
    };

    // Exclude tickets waiting for client response
    if (settings.excludeIfClientWaiting) {
      where.status = { not: TicketStatus.WAITING_CLIENT };
    }

    // Exclude tickets with specific tags
    if (settings.excludeTags && settings.excludeTags.length > 0) {
      where.NOT = {
        tags: { hasSome: settings.excludeTags },
      };
    }

    const idleTickets = await prisma.supportTicket.findMany({
      where,
      take: 100, // Process in batches
    });

    let closedCount = 0;

    for (const ticket of idleTickets) {
      try {
        await prisma.supportTicket.update({
          where: { id: ticket.id },
          data: {
            status: TicketStatus.CLOSED,
            closedAt: new Date(),
          },
        });

        // Add internal note
        await prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            senderId: ticket.assignedToId || ticket.creatorId,
            content: `Ticket automatically closed due to ${settings.inactiveDays} days of inactivity.`,
            isInternal: true,
          },
        });

        closedCount++;
      } catch (error) {
        logger.error('Failed to auto-close ticket', {
          error,
          ticketId: ticket.id,
        });
      }
    }

    logger.info('Auto-closed idle tickets', {
      closedCount,
      inactiveDays: settings.inactiveDays,
    });

    return { closedCount };
  } catch (error) {
    logger.error('Failed to auto-close idle tickets', {
      error,
      settings,
    });
    throw new Error('Failed to auto-close idle tickets');
  }
}

/**
 * Get workflow execution statistics
 */
export async function getWorkflowStats(workflowId?: string) {
  try {
    const where: Prisma.TicketWorkflowLogWhereInput = {};
    if (workflowId) {
      where.workflowId = workflowId;
    }

    const [totalExecutions, successCount, failedCount] = await Promise.all([
      prisma.ticketWorkflowLog.count({ where }),
      prisma.ticketWorkflowLog.count({
        where: { ...where, result: 'success' },
      }),
      prisma.ticketWorkflowLog.count({
        where: { ...where, result: 'failed' },
      }),
    ]);

    return {
      totalExecutions,
      successCount,
      failedCount,
      successRate: totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0,
    };
  } catch (error) {
    logger.error('Failed to get workflow stats', {
      error,
      workflowId,
    });
    return {
      totalExecutions: 0,
      successCount: 0,
      failedCount: 0,
      successRate: 0,
    };
  }
}
