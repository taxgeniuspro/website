/**
 * CRM Workflows API
 *
 * GET /api/crm/workflows
 * Fetches all workflows for the current user.
 *
 * POST /api/crm/workflows
 * Creates a new workflow.
 *
 * @module api/crm/workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { checkCRMPermission, CRMFeature } from '@/lib/permissions/crm-permissions';
import { logger } from '@/lib/logger';
import { getAllWorkflows, createWorkflow } from '@/lib/services/workflow-automation.service';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const permissionCheck = await checkCRMPermission(userId, CRMFeature.WORKFLOW_AUTOMATION);
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: 'You do not have permission to view workflows' },
        { status: 403 }
      );
    }

    const result = await getAllWorkflows(userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ workflows: result.workflows });
  } catch (error) {
    logger.error('Error fetching workflows:', error);
    return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const permissionCheck = await checkCRMPermission(userId, CRMFeature.WORKFLOW_AUTOMATION);
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: 'You do not have permission to create workflows' },
        { status: 403 }
      );
    }

    const body = await req.json();

    if (!body.name || !body.trigger || !body.actions || body.actions.length === 0) {
      return NextResponse.json(
        { error: 'Name, trigger, and actions are required' },
        { status: 400 }
      );
    }

    const result = await createWorkflow({
      ...body,
      createdBy: userId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, workflow: result.workflow });
  } catch (error) {
    logger.error('Error creating workflow:', error);
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 });
  }
}
