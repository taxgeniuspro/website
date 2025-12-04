/**
 * Single Campaign Management API
 *
 * GET /api/crm/email/campaigns/[id]
 * Get campaign details and statistics.
 *
 * DELETE /api/crm/email/campaigns/[id]
 * Delete a campaign.
 *
 * @module api/crm/email/campaigns/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { checkCRMPermission, CRMFeature } from '@/lib/permissions/crm-permissions';
import { logger } from '@/lib/logger';
import {
  getCampaignStats,
  deleteCampaign,
} from '@/lib/services/email-automation.service';

/**
 * GET /api/crm/email/campaigns/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check permission
    const permissionCheck = await checkCRMPermission(userId, CRMFeature.EMAIL_AUTOMATION);
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: 'You do not have permission to view email campaigns' },
        { status: 403 }
      );
    }

    const result = await getCampaignStats(params.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.stats);
  } catch (error) {
    logger.error('Error fetching campaign stats:', error);
    return NextResponse.json({ error: 'Failed to fetch campaign stats' }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/email/campaigns/[id]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check permission
    const permissionCheck = await checkCRMPermission(userId, CRMFeature.EMAIL_AUTOMATION);
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: 'You do not have permission to delete email campaigns' },
        { status: 403 }
      );
    }

    const result = await deleteCampaign(params.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting campaign:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
