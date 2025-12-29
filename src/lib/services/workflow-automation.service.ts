/**
 * Workflow Automation Service
 *
 * Executes automated workflows based on triggers and conditions.
 * Handles lead routing, task creation, email sending, and status updates.
 *
 * @module lib/services/workflow-automation
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { sendEmail } from './email-automation.service';
import {
  createActivity,
  logLeadAssigned,
  logStatusChange,
} from './activity.service';

// Local type definitions (replacing @prisma/client)
type CRMWorkflowTrigger =
  | 'LEAD_CREATED'
  | 'LEAD_UPDATED'
  | 'LEAD_STATUS_CHANGED'
  | 'LEAD_ASSIGNED'
  | 'INTAKE_SUBMITTED'
  | 'INTAKE_COMPLETED'
  | 'PAYMENT_RECEIVED'
  | 'RETURN_FILED'
  | 'TICKET_CREATED'
  | 'TICKET_RESOLVED';

type CRMWorkflowActionType =
  | 'SEND_EMAIL'
  | 'CREATE_TASK'
  | 'ASSIGN_TO_PREPARER'
  | 'UPDATE_STATUS'
  | 'SEND_NOTIFICATION'
  | 'UPDATE_FIELD';

interface CRMWorkflowRecord {
  id: string;
  name: string;
  description?: string | null;
  trigger: CRMWorkflowTrigger;
  triggerConditions?: Record<string, unknown> | null;
  isActive: boolean;
  priority: number;
  createdBy: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  lastExecutedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface CRMWorkflowActionRecord {
  id: string;
  workflowId: string;
  actionType: CRMWorkflowActionType;
  actionConfig: Record<string, unknown>;
  order: number;
  conditions?: Record<string, unknown> | null;
  delayMinutes: number;
  createdAt: Date | string;
}

interface CRMWorkflowExecutionRecord {
  id: string;
  workflowId: string;
  leadId: string;
  status: string;
  completedAt?: Date | string | null;
  actionsExecuted?: number | null;
  actionsSucceeded?: number | null;
  actionsFailed?: number | null;
  executionLog?: unknown[] | null;
  createdAt: Date | string;
}

interface TaxIntakeLeadRecord {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  status?: string;
  assignedTo?: string | null;
  [key: string]: unknown;
}

interface ProfileRecord {
  id: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
}

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
 *   trigger: 'LEAD_CREATED',
 *   leadId: 'lead_123',
 *   userId: 'user_456',
 * });
 * ```
 */
export async function executeWorkflows(context: WorkflowTriggerContext) {
  try {
    // Find all active workflows for this trigger
    const { data: workflowsData } = await db
      .from('crm_workflows')
      .select('*')
      .eq('trigger', context.trigger)
      .eq('isActive', true)
      .order('priority', { ascending: false });

    const workflows = (workflowsData || []) as CRMWorkflowRecord[];

    if (workflows.length === 0) {
      logger.info(`No active workflows found for trigger: ${context.trigger}`);
      return { success: true, executedCount: 0 };
    }

    // Get actions for all workflows
    const workflowIds = workflows.map((w) => w.id);
    const { data: actionsData } = await db
      .from('crm_workflow_actions')
      .select('*')
      .in('workflowId', workflowIds)
      .order('order', { ascending: true });

    const actions = (actionsData || []) as CRMWorkflowActionRecord[];

    // Map actions to workflows
    const actionsMap = new Map<string, CRMWorkflowActionRecord[]>();
    for (const action of actions) {
      const existing = actionsMap.get(action.workflowId) || [];
      existing.push(action);
      actionsMap.set(action.workflowId, existing);
    }

    // Attach actions to workflows
    const workflowsWithActions = workflows.map((w) => ({
      ...w,
      actions: actionsMap.get(w.id) || [],
    }));

    logger.info(`Found ${workflows.length} workflows for trigger: ${context.trigger}`);

    let executedCount = 0;

    for (const workflow of workflowsWithActions) {
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
    const { data: executionData, error: executionError } = await db
      .from('crm_workflow_executions')
      .insert({
        workflowId,
        leadId,
        status: 'running',
        createdAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (executionError || !executionData) {
      throw new Error('Failed to create execution record');
    }

    const execution = executionData as CRMWorkflowExecutionRecord;

    // Get workflow
    const { data: workflowData } = await db
      .from('crm_workflows')
      .select('*')
      .eq('id', workflowId)
      .limit(1);

    const workflow = firstOrNull(workflowData) as CRMWorkflowRecord | null;

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Get actions for workflow
    const { data: actionsData } = await db
      .from('crm_workflow_actions')
      .select('*')
      .eq('workflowId', workflowId)
      .order('order', { ascending: true });

    const actions = (actionsData || []) as CRMWorkflowActionRecord[];

    // Get lead data
    const { data: leadData } = await db
      .from('tax_intake_leads')
      .select('*')
      .eq('id', leadId)
      .limit(1);

    const lead = firstOrNull(leadData) as TaxIntakeLeadRecord | null;

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Execute actions in order
    for (const action of actions) {
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
    await db
      .from('crm_workflow_executions')
      .update({
        status: 'completed',
        completedAt: new Date().toISOString(),
        actionsExecuted,
        actionsSucceeded,
        actionsFailed,
        executionLog,
      })
      .eq('id', execution.id);

    // Update workflow stats - fetch current values first
    const currentExecCount = workflow.executionCount || 0;
    const currentSuccessCount = workflow.successCount || 0;
    const currentFailureCount = workflow.failureCount || 0;

    await db
      .from('crm_workflows')
      .update({
        executionCount: currentExecCount + 1,
        successCount: actionsFailed === 0 ? currentSuccessCount + 1 : currentSuccessCount,
        failureCount: actionsFailed > 0 ? currentFailureCount + 1 : currentFailureCount,
        lastExecutedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', workflowId);

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
      case 'SEND_EMAIL':
        return await executeSendEmail(config, lead);

      case 'CREATE_TASK':
        return await executeCreateTask(config, lead, userId);

      case 'ASSIGN_TO_PREPARER':
        return await executeAssignToPreparer(config, lead);

      case 'UPDATE_STATUS':
        return await executeUpdateStatus(config, lead);

      case 'SEND_NOTIFICATION':
        return await executeSendNotification(config, lead);

      case 'UPDATE_FIELD':
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
    const { data: profileData } = await db
      .from('profiles')
      .select('firstName, lastName')
      .eq('userId', userId)
      .limit(1);

    const profile = firstOrNull(profileData) as ProfileRecord | null;
    if (profile) {
      createdByName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
    }
  }

  const { data: taskData, error } = await db
    .from('lead_tasks')
    .insert({
      leadId: lead.id,
      title,
      description,
      priority: priority || 'MEDIUM',
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      assignedTo: assignedTo || lead.assignedTo,
      createdBy: userId,
      createdByName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !taskData) {
    return { success: false, error: 'Failed to create task' };
  }

  return { success: true, result: taskData.id };
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
  const { data: preparerData } = await db
    .from('profiles')
    .select('firstName, lastName')
    .eq('id', preparerId)
    .limit(1);

  const preparer = firstOrNull(preparerData) as ProfileRecord | null;

  if (!preparer) {
    return { success: false, error: 'Preparer not found' };
  }

  const preparerName = [preparer.firstName, preparer.lastName].filter(Boolean).join(' ');

  // Update lead
  await db
    .from('tax_intake_leads')
    .update({
      assignedTo: preparerId,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', lead.id);

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

  await db
    .from('tax_intake_leads')
    .update({
      status,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', lead.id);

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

  await db
    .from('tax_intake_leads')
    .update({
      [field]: value,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', lead.id);

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
  const { data: leadData } = await db
    .from('tax_intake_leads')
    .select('*')
    .eq('id', context.leadId)
    .limit(1);

  const lead = firstOrNull(leadData) as TaxIntakeLeadRecord | null;

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
    const now = new Date().toISOString();

    // Create workflow first
    const { data: workflowData, error: workflowError } = await db
      .from('crm_workflows')
      .insert({
        name: params.name,
        description: params.description || null,
        trigger: params.trigger,
        triggerConditions: params.triggerConditions || null,
        priority: params.priority || 0,
        createdBy: params.createdBy,
        isActive: true,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (workflowError || !workflowData) {
      throw new Error('Failed to create workflow');
    }

    const workflow = workflowData as CRMWorkflowRecord;

    // Create actions for workflow
    if (params.actions.length > 0) {
      const actionsToInsert = params.actions.map((action) => ({
        workflowId: workflow.id,
        actionType: action.actionType,
        actionConfig: action.actionConfig,
        order: action.order,
        conditions: action.conditions || null,
        delayMinutes: action.delayMinutes || 0,
        createdAt: now,
      }));

      const { data: actionsData } = await db
        .from('crm_workflow_actions')
        .insert(actionsToInsert)
        .select();

      const actions = (actionsData || []) as CRMWorkflowActionRecord[];

      logger.info(`Workflow created: ${workflow.id}`, { name: workflow.name });

      return { success: true, workflow: { ...workflow, actions } };
    }

    logger.info(`Workflow created: ${workflow.id}`, { name: workflow.name });

    return { success: true, workflow: { ...workflow, actions: [] } };
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
    const { data: workflowData, error } = await db
      .from('crm_workflows')
      .update({
        isActive: true,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', workflowId)
      .select()
      .single();

    if (error || !workflowData) {
      throw new Error('Workflow not found');
    }

    const workflow = workflowData as CRMWorkflowRecord;

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
    const { data: workflowData, error } = await db
      .from('crm_workflows')
      .update({
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', workflowId)
      .select()
      .single();

    if (error || !workflowData) {
      throw new Error('Workflow not found');
    }

    const workflow = workflowData as CRMWorkflowRecord;

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
    let query = db
      .from('crm_workflows')
      .select('*')
      .order('createdAt', { ascending: false });

    if (createdBy) {
      query = query.eq('createdBy', createdBy);
    }

    const { data: workflowsData } = await query;

    const workflows = (workflowsData || []) as CRMWorkflowRecord[];

    if (workflows.length === 0) {
      return { success: true, workflows: [] };
    }

    // Get actions for all workflows
    const workflowIds = workflows.map((w) => w.id);
    const { data: actionsData } = await db
      .from('crm_workflow_actions')
      .select('*')
      .in('workflowId', workflowIds)
      .order('order', { ascending: true });

    const actions = (actionsData || []) as CRMWorkflowActionRecord[];

    // Map actions to workflows
    const actionsMap = new Map<string, CRMWorkflowActionRecord[]>();
    for (const action of actions) {
      const existing = actionsMap.get(action.workflowId) || [];
      existing.push(action);
      actionsMap.set(action.workflowId, existing);
    }

    // Attach actions to workflows
    const workflowsWithActions = workflows.map((w) => ({
      ...w,
      actions: actionsMap.get(w.id) || [],
    }));

    return { success: true, workflows: workflowsWithActions };
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
    // Delete actions first (foreign key constraint)
    await db
      .from('crm_workflow_actions')
      .delete()
      .eq('workflowId', workflowId);

    // Delete executions
    await db
      .from('crm_workflow_executions')
      .delete()
      .eq('workflowId', workflowId);

    // Delete workflow
    await db
      .from('crm_workflows')
      .delete()
      .eq('id', workflowId);

    logger.info(`Workflow deleted: ${workflowId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error deleting workflow:', error);
    return { success: false, error: 'Failed to delete workflow' };
  }
}
