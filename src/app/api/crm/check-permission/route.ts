/**
 * CRM Permission Check API
 *
 * POST /api/crm/check-permission
 * Checks if the authenticated user has access to a specific CRM feature.
 *
 * @module api/crm/check-permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { checkCRMPermission, CRMFeature } from '@/lib/permissions/crm-permissions';
import { logger } from '@/lib/logger';

/**
 * POST /api/crm/check-permission
 *
 * Request body:
 * {
 *   "feature": "crmEmailAutomation" | "crmWorkflowAutomation" | etc.
 * }
 *
 * Response:
 * {
 *   "allowed": boolean,
 *   "reason": string,
 *   "feature": string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        {
          allowed: false,
          reason: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    const { feature } = await req.json();

    if (!feature || !Object.values(CRMFeature).includes(feature)) {
      return NextResponse.json(
        {
          allowed: false,
          reason: 'Invalid feature',
        },
        { status: 400 }
      );
    }

    const result = await checkCRMPermission(userId, feature as CRMFeature);

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in check-permission API:', error);
    return NextResponse.json(
      {
        allowed: false,
        reason: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
