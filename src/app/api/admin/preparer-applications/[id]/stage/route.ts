import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// Local interfaces
interface PreparerApplication {
  id: string;
  stage: string;
  interviewScheduled: string | null;
  interviewNotes: string | null;
}

// Valid pipeline stages
const VALID_STAGES = ['NEW', 'CONTACTED', 'INTERVIEWED', 'DECISION'] as const;
type Stage = (typeof VALID_STAGES)[number];

/**
 * PATCH /api/admin/preparer-applications/[id]/stage
 * Update the pipeline stage and interview details for an application
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or super_admin
    if (session.user.role !== 'admin' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { stage, interviewScheduled, interviewNotes } = body;

    // Validate stage if provided
    if (stage && !VALID_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if application exists
    const { data: applicationData, error: findError } = await db.from('preparer_applications')
      .select('id, stage, interviewScheduled, interviewNotes')
      .eq('id', id)
      .limit(1);

    if (findError) {
      throw findError;
    }

    const application = firstOrNull<PreparerApplication>(applicationData);

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, any> = {};

    if (stage) {
      updateData.stage = stage;
    }

    if (interviewScheduled !== undefined) {
      updateData.interviewScheduled = interviewScheduled ? new Date(interviewScheduled).toISOString() : null;
    }

    if (interviewNotes !== undefined) {
      updateData.interviewNotes = interviewNotes;
    }

    const { data: updatedApplication, error: updateError } = await db.from('preparer_applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    logger.info('Preparer application stage updated', {
      applicationId: id,
      previousStage: application.stage,
      newStage: stage || application.stage,
      interviewScheduled: updateData.interviewScheduled,
    });

    return NextResponse.json({
      success: true,
      message: 'Application updated successfully',
      application: updatedApplication,
    });
  } catch (error) {
    logger.error('Error updating preparer application stage:', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}
