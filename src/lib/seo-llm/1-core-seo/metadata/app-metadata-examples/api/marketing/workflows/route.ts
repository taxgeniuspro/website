import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { WorkflowEngine } from '@/lib/marketing/workflow-engine'

export async function GET(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workflows = await WorkflowEngine.getWorkflows()

    return NextResponse.json(workflows)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, trigger, steps, segmentId, settings } = await request.json()

    if (!name || !trigger || !steps) {
      return NextResponse.json({ error: 'Name, trigger, and steps are required' }, { status: 400 })
    }

    const workflow = await WorkflowEngine.createWorkflow(
      name,
      description,
      trigger,
      steps,
      segmentId,
      settings
    )

    return NextResponse.json(workflow, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
