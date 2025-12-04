/**
 * Send Campaign API
 *
 * POST /api/crm/email/campaigns/[id]/send
 * Sends an email campaign to all recipients.
 *
 * @module api/crm/email/campaigns/[id]/send
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { checkCRMPermission, CRMFeature } from '@/lib/permissions/crm-permissions';
import { logger } from '@/lib/logger';
import { sendCampaign } from '@/lib/services/email-automation.service';

/**
 * POST /api/crm/email/campaigns/[id]/send
 */
export async function POST(
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
        { error: 'You do not have permission to send email campaigns' },
        { status: 403 }
      );
    }

    const result = await sendCampaign(params.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      total: result.total,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error) {
    logger.error('Error sending campaign:', error);
    return NextResponse.json({ error: 'Failed to send campaign' }, { status: 500 });
  }
}
