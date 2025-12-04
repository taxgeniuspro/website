/**
 * Email Campaigns API
 *
 * GET /api/crm/email/campaigns
 * Fetches all email campaigns for the current user.
 *
 * POST /api/crm/email/campaigns
 * Creates a new email campaign.
 *
 * @module api/crm/email/campaigns
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { checkCRMPermission, CRMFeature } from '@/lib/permissions/crm-permissions';
import { logger } from '@/lib/logger';
import {
  getAllCampaigns,
  createEmailCampaign,
} from '@/lib/services/email-automation.service';

/**
 * GET /api/crm/email/campaigns
 */
export async function GET(req: NextRequest) {
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

    const result = await getAllCampaigns(userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ campaigns: result.campaigns });
  } catch (error) {
    logger.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

/**
 * POST /api/crm/email/campaigns
 *
 * Request body:
 * {
 *   "name": "Welcome Campaign",
 *   "subject": "Welcome to Tax Genius",
 *   "htmlBody": "<p>Welcome!</p>",
 *   "plainTextBody": "Welcome!",
 *   "fromName": "Tax Genius Pro",
 *   "fromEmail": "noreply@taxgeniuspro.tax",
 *   "scheduledAt": "2025-01-15T10:00:00Z"
 * }
 */
export async function POST(req: NextRequest) {
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
        { error: 'You do not have permission to create email campaigns' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Validate required fields
    if (!body.name || !body.subject || !body.htmlBody) {
      return NextResponse.json(
        { error: 'Name, subject, and htmlBody are required' },
        { status: 400 }
      );
    }

    const result = await createEmailCampaign({
      ...body,
      createdBy: userId,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, campaign: result.campaign });
  } catch (error) {
    logger.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
