/**
 * Ticket Workflow Service
 * Handles workflow automation for support tickets
 * Triggers: ticket events (created, updated, idle, responses)
 * Actions: assign, notify, status change, auto-close, etc.
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
type WorkflowTrigger =
  | 'TICKET_CREATED'
  | 'TICKET_UPDATED'
  | 'TICKET_IDLE'
  | 'CLIENT_RESPONSE'
  | 'PREPARER_RESPONSE'
  | 'STATUS_CHANGED'
  | 'PRIORITY_CHANGED';

type WorkflowActionType =
  | 'ASSIGN_PREPARER'
  | 'SEND_NOTIFICATION'
  | 'ADD_TAG'
  | 'CHANGE_STATUS'
  | 'CHANGE_PRIORITY'
  | 'SEND_SAVED_REPLY'
  | 'AUTO_CLOSE'
  | 'CREATE_TASK';

type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_CLIENT'
  | 'WAITING_PREPARER'
  | 'RESOLVED'
  | 'CLOSED'
  | 'ARCHIVED';

type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface TicketWorkflowRecord {
  id: string;
  name: string;
  description?: string | null;
  trigger: WorkflowTrigger;
  isActive: boolean;
  priority: number;
  conditions?: Record<string, unknown> | null;
  actions: unknown;
  createdById: string;
  lastTriggeredAt?: Date | string | null;
  triggerCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface TicketWorkflowLogRecord {
  id: string;
  workflowId: string;
  ticketId: string;
  action: string;
  result: string;
  details?: Record<string, unknown> | null;
  executedAt: Date | string;
}

interface SupportTicketRecord {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  creatorId: string;
  assignedToId?: string | null;
  tags: string[];
  customFields?: Record<string, unknown> | null;
  lastActivityAt: Date | string;
  resolvedAt?: Date | string | null;
  closedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface ProfileRecord {
  id: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
}

interface TicketMessageRecord {
  id: string;
  ticketId: string;
  senderId: string;
  content: string;
  isInternal: boolean;
  createdAt: Date | string;
}

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

export interface TicketWithRelations extends SupportTicketRecord {
  creator?: ProfileRecord | null;
  assignedTo?: ProfileRecord | null;
  messages?: TicketMessageRecord[];
}

export interface WorkflowWithCreator extends TicketWorkflowRecord {
  createdBy?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  logs?: TicketWorkflowLogRecord[];
}

// ==================== Workflow Management ====================

/**
 * Create a new workflow
 */
export async function createWorkflow(input: CreateWorkflowInput) {
  try {
    const now = new Date().toISOString();

    const { data: workflowData, error } = await db
      .from('ticket_workflows')
      .insert({
        name: input.name,
        description: input.description || null,
        trigger: input.trigger,
        isActive: input.isActive !== false,
        priority: input.priority || 0,
        conditions: input.conditions || {},
        actions: input.actions,
        createdById: input.createdById,
        triggerCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (error || !workflowData) {
      throw new Error('Failed to insert workflow');
    }

    const workflow = workflowData as TicketWorkflowRecord;

    // Get creator info
    const { data: creatorData } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .eq('id', input.createdById)
      .limit(1);

    const creator = firstOrNull(creatorData) as ProfileRecord | null;

    const workflowWithCreator: WorkflowWithCreator = {
      ...workflow,
      createdBy: creator
        ? {
            id: creator.id,
            firstName: creator.firstName,
            lastName: creator.lastName,
          }
        : null,
    };

    logger.info('Workflow created', {
      workflowId: workflow.id,
      name: workflow.name,
      trigger: workflow.trigger,
    });

    return workflowWithCreator;
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
    let query = db
      .from('ticket_workflows')
      .select('*')
      .order('priority', { ascending: false })
      .order('createdAt', { ascending: false });

    if (filters?.trigger) {
      query = query.eq('trigger', filters.trigger);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq('isActive', filters.isActive);
    }

    const { data: workflowsData } = await query;

    const workflows = (workflowsData || []) as TicketWorkflowRecord[];

    if (workflows.length === 0) {
      return [];
    }

    // Get creators for all workflows
    const creatorIds = [...new Set(workflows.map((w) => w.createdById))];
    const { data: creatorsData } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .in('id', creatorIds);

    const creators = (creatorsData || []) as ProfileRecord[];
    const creatorMap = new Map(creators.map((c) => [c.id, c]));

    // Attach creators to workflows
    const workflowsWithCreators: WorkflowWithCreator[] = workflows.map((w) => {
      const creator = creatorMap.get(w.createdById);
      return {
        ...w,
        createdBy: creator
          ? {
              id: creator.id,
              firstName: creator.firstName,
              lastName: creator.lastName,
            }
          : null,
      };
    });

    return workflowsWithCreators;
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
    const { data: workflowData } = await db
      .from('ticket_workflows')
      .select('*')
      .eq('id', workflowId)
      .limit(1);

    const workflow = firstOrNull(workflowData) as TicketWorkflowRecord | null;

    if (!workflow) {
      return null;
    }

    // Get creator
    const { data: creatorData } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .eq('id', workflow.createdById)
      .limit(1);

    const creator = firstOrNull(creatorData) as ProfileRecord | null;

    // Get logs
    const { data: logsData } = await db
      .from('ticket_workflow_logs')
      .select('*')
      .eq('workflowId', workflowId)
      .order('executedAt', { ascending: false })
      .limit(10);

    const logs = (logsData || []) as TicketWorkflowLogRecord[];

    const workflowWithRelations: WorkflowWithCreator = {
      ...workflow,
      createdBy: creator
        ? {
            id: creator.id,
            firstName: creator.firstName,
            lastName: creator.lastName,
          }
        : null,
      logs,
    };

    return workflowWithRelations;
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
    const { data: workflowData, error } = await db
      .from('ticket_workflows')
      .update({
        ...input,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', workflowId)
      .select()
      .single();

    if (error || !workflowData) {
      throw new Error('Workflow not found');
    }

    const workflow = workflowData as TicketWorkflowRecord;

    // Get creator
    const { data: creatorData } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .eq('id', workflow.createdById)
      .limit(1);

    const creator = firstOrNull(creatorData) as ProfileRecord | null;

    const workflowWithCreator: WorkflowWithCreator = {
      ...workflow,
      createdBy: creator
        ? {
            id: creator.id,
            firstName: creator.firstName,
            lastName: creator.lastName,
          }
        : null,
    };

    logger.info('Workflow updated', {
      workflowId,
      updates: input,
    });

    return workflowWithCreator;
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
    // Delete logs first (foreign key constraint)
    await db.from('ticket_workflow_logs').delete().eq('workflowId', workflowId);

    // Delete workflow
    await db.from('ticket_workflows').delete().eq('id', workflowId);

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
    const { data: workflowsData } = await db
      .from('ticket_workflows')
      .select('*')
      .eq('trigger', trigger)
      .eq('isActive', true)
      .order('priority', { ascending: false });

    const workflows = (workflowsData || []) as TicketWorkflowRecord[];

    if (workflows.length === 0) {
      return;
    }

    // Get ticket details
    const { data: ticketData } = await db
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .limit(1);

    const ticketBase = firstOrNull(ticketData) as SupportTicketRecord | null;

    if (!ticketBase) {
      return;
    }

    // Get creator and assignedTo profiles
    const profileIds = [ticketBase.creatorId, ticketBase.assignedToId].filter(Boolean) as string[];
    const { data: profilesData } = await db
      .from('profiles')
      .select('id, userId, firstName, lastName')
      .in('id', profileIds);

    const profiles = (profilesData || []) as ProfileRecord[];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    // Get last message
    const { data: messagesData } = await db
      .from('ticket_messages')
      .select('*')
      .eq('ticketId', ticketId)
      .order('createdAt', { ascending: false })
      .limit(1);

    const messages = (messagesData || []) as TicketMessageRecord[];

    const ticket: TicketWithRelations = {
      ...ticketBase,
      creator: profileMap.get(ticketBase.creatorId) || null,
      assignedTo: ticketBase.assignedToId ? profileMap.get(ticketBase.assignedToId) || null : null,
      messages,
    };

    // Execute each workflow
    for (const workflow of workflows) {
      try {
        // Check if conditions are met
        const workflowWithCreator: WorkflowWithCreator = { ...workflow, createdBy: null };
        const conditionsMet = checkWorkflowConditions(workflowWithCreator, ticket, context);

        if (!conditionsMet) {
          await logWorkflowExecution(workflow.id, ticketId, 'skipped', {
            reason: 'Conditions not met',
          });
          continue;
        }

        // Execute workflow actions
        await executeWorkflowActions(workflowWithCreator, ticket);

        // Update workflow statistics
        const currentCount = workflow.triggerCount || 0;
        await db
          .from('ticket_workflows')
          .update({
            lastTriggeredAt: new Date().toISOString(),
            triggerCount: currentCount + 1,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', workflow.id);

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
    const customFields = ticket.customFields as Record<string, unknown>;
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
    case 'ASSIGN_PREPARER':
      await handleAssignPreparer(action.config, ticket);
      break;

    case 'SEND_NOTIFICATION':
      await handleSendNotification(action.config, ticket);
      break;

    case 'ADD_TAG':
      await handleAddTag(action.config, ticket);
      break;

    case 'CHANGE_STATUS':
      await handleChangeStatus(action.config, ticket);
      break;

    case 'CHANGE_PRIORITY':
      await handleChangePriority(action.config, ticket);
      break;

    case 'SEND_SAVED_REPLY':
      await handleSendSavedReply(action.config, ticket);
      break;

    case 'AUTO_CLOSE':
      await handleAutoClose(action.config, ticket);
      break;

    case 'CREATE_TASK':
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

  await db
    .from('support_tickets')
    .update({
      assignedToId: config.preparerId,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', ticket.id);

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

  await db
    .from('support_tickets')
    .update({
      tags: [...currentTags, config.tag],
      updatedAt: new Date().toISOString(),
    })
    .eq('id', ticket.id);

  logger.info('Workflow: Added tag', {
    ticketId: ticket.id,
    tag: config.tag,
  });
}

async function handleChangeStatus(config: WorkflowActionConfig, ticket: TicketWithRelations) {
  if (!config.status) return;

  const updateData: Record<string, unknown> = {
    status: config.status,
    updatedAt: new Date().toISOString(),
  };

  if (config.status === 'RESOLVED') {
    updateData.resolvedAt = new Date().toISOString();
  }
  if (config.status === 'CLOSED') {
    updateData.closedAt = new Date().toISOString();
  }

  await db.from('support_tickets').update(updateData).eq('id', ticket.id);

  logger.info('Workflow: Changed status', {
    ticketId: ticket.id,
    newStatus: config.status,
  });
}

async function handleChangePriority(config: WorkflowActionConfig, ticket: TicketWithRelations) {
  if (!config.priority) return;

  await db
    .from('support_tickets')
    .update({
      priority: config.priority,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', ticket.id);

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
  await db
    .from('support_tickets')
    .update({
      status: 'CLOSED' as TicketStatus,
      closedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .eq('id', ticket.id);

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
    await db.from('ticket_workflow_logs').insert({
      workflowId,
      ticketId,
      action: 'execute',
      result,
      details: details || {},
      executedAt: new Date().toISOString(),
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

    // Build query for idle tickets
    let query = db
      .from('support_tickets')
      .select('*')
      .lt('lastActivityAt', cutoffDate.toISOString())
      .not('status', 'in', '("CLOSED","ARCHIVED")')
      .limit(100);

    // Exclude tickets waiting for client response
    if (settings.excludeIfClientWaiting) {
      query = query.neq('status', 'WAITING_CLIENT');
    }

    const { data: ticketsData } = await query;
    let idleTickets = (ticketsData || []) as SupportTicketRecord[];

    // Filter out tickets with excluded tags (done in JS since Supabase doesn't have hasSome equivalent)
    if (settings.excludeTags && settings.excludeTags.length > 0) {
      idleTickets = idleTickets.filter((ticket) => {
        const ticketTags = ticket.tags || [];
        return !settings.excludeTags!.some((tag) => ticketTags.includes(tag));
      });
    }

    let closedCount = 0;

    for (const ticket of idleTickets) {
      try {
        await db
          .from('support_tickets')
          .update({
            status: 'CLOSED' as TicketStatus,
            closedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .eq('id', ticket.id);

        // Add internal note
        await db.from('ticket_messages').insert({
          ticketId: ticket.id,
          senderId: ticket.assignedToId || ticket.creatorId,
          content: `Ticket automatically closed due to ${settings.inactiveDays} days of inactivity.`,
          isInternal: true,
          createdAt: new Date().toISOString(),
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
    // Build queries for counts
    const buildQuery = (resultFilter?: string) => {
      let query = db
        .from('ticket_workflow_logs')
        .select('id', { count: 'exact', head: true });

      if (workflowId) {
        query = query.eq('workflowId', workflowId);
      }
      if (resultFilter) {
        query = query.eq('result', resultFilter);
      }
      return query;
    };

    const [totalResult, successResult, failedResult] = await Promise.all([
      buildQuery(),
      buildQuery('success'),
      buildQuery('failed'),
    ]);

    const totalExecutions = totalResult.count || 0;
    const successCount = successResult.count || 0;
    const failedCount = failedResult.count || 0;

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
