/**
 * Lead Scoring API
 *
 * POST /api/crm/leads/[leadId]/score
 * Calculate and update lead score.
 *
 * @module api/crm/leads/[leadId]/score
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { checkCRMPermission, CRMFeature } from '@/lib/permissions/crm-permissions';
import { logger } from '@/lib/logger';
import { calculateLeadScore } from '@/lib/services/lead-scoring.service';

export async function POST(
  req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const permissionCheck = await checkCRMPermission(userId, CRMFeature.LEAD_SCORING);
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: 'You do not have permission to score leads' },
        { status: 403 }
      );
    }

    const result = await calculateLeadScore(params.leadId);

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error scoring lead:', error);
    return NextResponse.json({ error: 'Failed to score lead' }, { status: 500 });
  }
}
