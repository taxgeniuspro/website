/**
 * Admin CRM Permissions Update API
 *
 * PATCH /api/admin/crm/permissions/[id]
 * Updates CRM permissions for a specific tax preparer.
 * Admin-only endpoint.
 *
 * @module api/admin/crm/permissions/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { bulkUpdateCRMPermissions, CRMFeature } from '@/lib/permissions/crm-permissions';
import { logger } from '@/lib/logger';

/**
 * PATCH /api/admin/crm/permissions/[id]
 *
 * Request body (partial update):
 * {
 *   "crmEmailAutomation": true,
 *   "crmWorkflowAutomation": false,
 *   ...
 * }
 *
 * Response:
 * {
 *   "success": true
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const preparerProfileId = params.id;
    const permissions = await req.json();

    // Validate that only CRM permission fields are being updated
    const validPermissionFields = Object.values(CRMFeature);
    const invalidFields = Object.keys(permissions).filter(
      (key) => !validPermissionFields.includes(key as CRMFeature)
    );

    if (invalidFields.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid permission fields: ${invalidFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Convert permission object to correct type
    const typedPermissions: Partial<Record<CRMFeature, boolean>> = {};
    Object.entries(permissions).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        typedPermissions[key as CRMFeature] = value;
      }
    });

    // Use the bulk update utility
    const result = await bulkUpdateCRMPermissions(
      userId,
      preparerProfileId,
      typedPermissions
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update permissions' },
        { status: 403 }
      );
    }

    logger.info(
      `Admin ${userId} updated CRM permissions for preparer ${preparerProfileId}`,
      { permissions: typedPermissions }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error updating CRM permissions:', error);
    return NextResponse.json(
      { error: 'Failed to update permissions' },
      { status: 500 }
    );
  }
}
