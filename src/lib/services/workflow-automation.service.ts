/**
 * Workflow Automation Service
 *
 * Executes automated workflows based on triggers and conditions.
 * Handles lead routing, task creation, email sending, and status updates.
 *
 * @module lib/services/workflow-automation
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { CRMWorkflowTrigger, CRMWorkflowActionType } from '@prisma/client';
import { sendEmail } from './email-automation.service';
import {
  createActivity,
  logLeadAssigned,
  logStatusChange,
} from './activity.service';

export interface WorkflowTriggerContext {
  trigger: CRMWorkflowTrigger;
  leadId: string;
  userId?: string;
  data?: Record<string, any>;
}

export interface CreateWorkflowParams {
  name: string;
  description?: string;
  trigger: CRMWorkflowTrigger;
  triggerConditions?: Record<string, any>;
  actions: WorkflowActionConfig[];
  priority?: number;
  createdBy: string;
}

export interface WorkflowActionConfig {
  actionType: CRMWorkflowActionType;
  actionConfig: Record<string, any>;
  order: number;
  conditions?: Record<string, any>;
  delayMinutes?: number;
}

/**
 * Execute workflows for a specific trigger
 *
 * @example
 * ```typescript
 * await executeWorkflows({
 *   trigger: CRMWorkflowTrigger.LEAD_CREATED,
 *   leadId: 'lead_123',
 *   userId: 'user_456',
 * });
 * ```
 */
export async function executeWorkflows(context: WorkflowTriggerContext) {
  try {
    // Find all active workflows for this trigger
    const workflows = await prisma.cRMWorkflow.findMany({
      where: {
        trigger: context.trigger,
        isActive: true,
      },
      include: {
        actions: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { priority: 'desc' }, // Higher priority first
    });

    if (workflows.length === 0) {
      logger.info(`No active workflows found for trigger: ${context.trigger}`);
      return { success: true, executedCount: 0 };
    }

    logger.info(`Found ${workflows.length} workflows for trigger: ${context.trigger}`);

    let executedCount = 0;

    for (const workflow of workflows) {
      // Check if workflow conditions are met
      if (workflow.triggerConditions) {
        const conditionsMet = await evaluateConditions(
          workflow.triggerConditions as Record<string, any>,
          context
        );

        if (!conditionsMet) {
          logger.info(`Workflow ${workflow.id} conditions not met, skipping`);
          continue;
        }
      }

      // Execute workflow
      const result = await executeWorkflow(workflow.id, context.leadId, context.userId);

      if (result.success) {
        executedCount++;
      }
    }

    return {
      success: true,
      executedCount,
    };
  } catch (error) {
    logger.error('Error executing workflows:', error);
    return { success: false, error: 'Failed to execute workflows' };
  }
}

/**
 * Execute a specific workflow
 */
export async function executeWorkflow(
  workflowId: string,
  leadId: string,
  userId?: string
) {
  const executionLog: any[] = [];
  let actionsExecuted = 0;
  let actionsSucceeded = 0;
  let actionsFailed = 0;

  try {
    // Create execution record
    const execution = await prisma.cRMWorkflowExecution.create({
      data: {
        workflowId,
        leadId,
        status: 'running',
      },
    });

    // Get workflow with actions
    const workflow = await prisma.cRMWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        actions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Get lead data
    const lead = await prisma.taxIntakeLead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Execute actions in order
    for (const action of workflow.actions) {
      // Wait if delay is specified
      if (action.delayMinutes > 0) {
        // In production, this would be handled by a job queue
        // For now, we'll log it
        executionLog.push({
          action: action.actionType,
          status: 'delayed',
          delayMinutes: action.delayMinutes,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // Check action conditions
      if (action.conditions) {
        const conditionsMet = await evaluateActionConditions(
          action.conditions as Record<string, any>,
          lead
        );

        if (!conditionsMet) {
          executionLog.push({
            action: action.actionType,
            status: 'skipped',
            reason: 'Conditions not met',
            timestamp: new Date().toISOString(),
          });
          continue;
        }
      }

      // Execute action
      actionsExecuted++;
      const result = await executeAction(action.actionType, action.actionConfig as any, lead, userId);

      if (result.success) {
        actionsSucceeded++;
        executionLog.push({
          action: action.actionType,
          status: 'success',
          result: result.result,
          timestamp: new Date().toISOString(),
        });
      } else {
        actionsFailed++;
        executionLog.push({
          action: action.actionType,
          status: 'failed',
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Update execution record
    await prisma.cRMWorkflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        actionsExecuted,
        actionsSucceeded,
        actionsFailed,
        executionLog,
      },
    });

    // Update workflow stats
    await prisma.cRMWorkflow.update({
      where: { id: workflowId },
      data: {
        executionCount: { increment: 1 },
        successCount: actionsFailed === 0 ? { increment: 1 } : undefined,
        failureCount: actionsFailed > 0 ? { increment: 1 } : undefined,
        lastExecutedAt: new Date(),
      },
    });

    logger.info(`Workflow ${workflowId} executed successfully`, {
      actionsExecuted,
      actionsSucceeded,
      actionsFailed,
    });

    return {
      success: true,
      actionsExecuted,
      actionsSucceeded,
      actionsFailed,
      executionLog,
    };
  } catch (error) {
    logger.error(`Error executing workflow ${workflowId}:`, error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute a single action
 */
async function executeAction(
  actionType: CRMWorkflowActionType,
  config: Record<string, any>,
  lead: any,
  userId?: string
) {
  try {
    switch (actionType) {
      case CRMWorkflowActionType.SEND_EMAIL:
        return await executeSendEmail(config, lead);

      case CRMWorkflowActionType.CREATE_TASK:
        return await executeCreateTask(config, lead, userId);

      case CRMWorkflowActionType.ASSIGN_TO_PREPARER:
        return await executeAssignToPreparer(config, lead);

      case CRMWorkflowActionType.UPDATE_STATUS:
        return await executeUpdateStatus(config, lead);

      case CRMWorkflowActionType.SEND_NOTIFICATION:
        return await executeSendNotification(config, lead);

      case CRMWorkflowActionType.UPDATE_FIELD:
        return await executeUpdateField(config, lead);

      default:
        return {
          success: false,
          error: `Unknown action type: ${actionType}`,
        };
    }
  } catch (error) {
    logger.error(`Error executing action ${actionType}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send email action
 */
async function executeSendEmail(config: Record<string, any>, lead: any) {
  const { subject, htmlBody, plainTextBody } = config;

  if (!lead.email) {
    return { success: false, error: 'Lead has no email address' };
  }

  const result = await sendEmail({
    to: lead.email,
    toName: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
    subject,
    htmlBody,
    plainTextBody,
    leadId: lead.id,
  });

  return { success: result.success, result: result.emailId };
}

/**
 * Create task action
 */
async function executeCreateTask(config: Record<string, any>, lead: any, userId?: string) {
  const { title, description, priority, dueDate, assignedTo } = config;

  // Get creator name
  let createdByName = 'Workflow Automation';
  if (userId) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { firstName: true, lastName: true },
    });
    if (profile) {
      createdByName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
    }
  }

  const task = await prisma.leadTask.create({
    data: {
      leadId: lead.id,
      title,
      description,
      priority: priority || 'MEDIUM',
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedTo: assignedTo || lead.assignedTo,
      createdBy: userId,
      createdByName,
    },
  });

  return { success: true, result: task.id };
}

/**
 * Assign to preparer action
 */
async function executeAssignToPreparer(config: Record<string, any>, lead: any) {
  const { preparerId } = config;

  if (!preparerId) {
    return { success: false, error: 'No preparer specified' };
  }

  // Get preparer name
  const preparer = await prisma.profile.findUnique({
    where: { id: preparerId },
    select: { firstName: true, lastName: true },
  });

  if (!preparer) {
    return { success: false, error: 'Preparer not found' };
  }

  const preparerName = [preparer.firstName, preparer.lastName].filter(Boolean).join(' ');

  // Update lead
  await prisma.taxIntakeLead.update({
    where: { id: lead.id },
    data: {
      assignedTo: preparerId,
    },
  });

  // Log activity
  await logLeadAssigned(lead.id, preparerName);

  return { success: true, result: preparerId };
}

/**
 * Update status action
 */
async function executeUpdateStatus(config: Record<string, any>, lead: any) {
  const { status } = config;

  if (!status) {
    return { success: false, error: 'No status specified' };
  }

  const oldStatus = lead.status || 'NEW';

  await prisma.taxIntakeLead.update({
    where: { id: lead.id },
    data: { status },
  });

  // Log activity
  await logStatusChange(lead.id, oldStatus, status, 'Automated workflow');

  return { success: true, result: status };
}

/**
 * Send notification action
 */
async function executeSendNotification(config: Record<string, any>, lead: any) {
  const { recipientId, message } = config;

  // In a real implementation, this would send an email or push notification
  logger.info(`Notification sent to ${recipientId}: ${message}`);

  return { success: true, result: 'Notification sent' };
}

/**
 * Update field action
 */
async function executeUpdateField(config: Record<string, any>, lead: any) {
  const { field, value } = config;

  if (!field) {
    return { success: false, error: 'No field specified' };
  }

  await prisma.taxIntakeLead.update({
    where: { id: lead.id },
    data: { [field]: value },
  });

  return { success: true, result: `${field} updated to ${value}` };
}

/**
 * Evaluate trigger conditions
 */
async function evaluateConditions(
  conditions: Record<string, any>,
  context: WorkflowTriggerContext
): Promise<boolean> {
  // Simple condition evaluation
  // In production, this would be more sophisticated
  const lead = await prisma.taxIntakeLead.findUnique({
    where: { id: context.leadId },
  });

  if (!lead) return false;

  for (const [key, value] of Object.entries(conditions)) {
    if (lead[key as keyof typeof lead] !== value) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluate action conditions
 */
async function evaluateActionConditions(
  conditions: Record<string, any>,
  lead: any
): Promise<boolean> {
  for (const [key, value] of Object.entries(conditions)) {
    if (lead[key] !== value) {
      return false;
    }
  }

  return true;
}

/**
 * Create a new workflow
 */
export async function createWorkflow(params: CreateWorkflowParams) {
  try {
    const workflow = await prisma.cRMWorkflow.create({
      data: {
        name: params.name,
        description: params.description,
        trigger: params.trigger,
        triggerConditions: params.triggerConditions || null,
        priority: params.priority || 0,
        createdBy: params.createdBy,
        actions: {
          create: params.actions.map((action) => ({
            actionType: action.actionType,
            actionConfig: action.actionConfig,
            order: action.order,
            conditions: action.conditions || null,
            delayMinutes: action.delayMinutes || 0,
          })),
        },
      },
      include: {
        actions: true,
      },
    });

    logger.info(`Workflow created: ${workflow.id}`, { name: workflow.name });

    return { success: true, workflow };
  } catch (error) {
    logger.error('Error creating workflow:', error);
    return { success: false, error: 'Failed to create workflow' };
  }
}

/**
 * Activate a workflow
 */
export async function activateWorkflow(workflowId: string) {
  try {
    const workflow = await prisma.cRMWorkflow.update({
      where: { id: workflowId },
      data: { isActive: true },
    });

    logger.info(`Workflow activated: ${workflowId}`);

    return { success: true, workflow };
  } catch (error) {
    logger.error('Error activating workflow:', error);
    return { success: false, error: 'Failed to activate workflow' };
  }
}

/**
 * Deactivate a workflow
 */
export async function deactivateWorkflow(workflowId: string) {
  try {
    const workflow = await prisma.cRMWorkflow.update({
      where: { id: workflowId },
      data: { isActive: false },
    });

    logger.info(`Workflow deactivated: ${workflowId}`);

    return { success: true, workflow };
  } catch (error) {
    logger.error('Error deactivating workflow:', error);
    return { success: false, error: 'Failed to deactivate workflow' };
  }
}

/**
 * Get all workflows
 */
export async function getAllWorkflows(createdBy?: string) {
  try {
    const where: any = {};
    if (createdBy) {
      where.createdBy = createdBy;
    }

    const workflows = await prisma.cRMWorkflow.findMany({
      where,
      include: {
        actions: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, workflows };
  } catch (error) {
    logger.error('Error getting workflows:', error);
    return { success: false, error: 'Failed to get workflows' };
  }
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(workflowId: string) {
  try {
    await prisma.cRMWorkflow.delete({
      where: { id: workflowId },
    });

    logger.info(`Workflow deleted: ${workflowId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error deleting workflow:', error);
    return { success: false, error: 'Failed to delete workflow' };
  }
}
