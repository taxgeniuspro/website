/**
 * CRM Permission Utilities
 *
 * Admin-controlled permission system for CRM features.
 * Allows granular control over which tax preparers can access which features.
 *
 * @module lib/permissions/crm-permissions
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Available CRM features that can be enabled/disabled per tax preparer
 */
export enum CRMFeature {
  EMAIL_AUTOMATION = 'crmEmailAutomation',
  WORKFLOW_AUTOMATION = 'crmWorkflowAutomation',
  ACTIVITY_TRACKING = 'crmActivityTracking',
  ADVANCED_ANALYTICS = 'crmAdvancedAnalytics',
  TASK_MANAGEMENT = 'crmTaskManagement',
  LEAD_SCORING = 'crmLeadScoring',
  BULK_ACTIONS = 'crmBulkActions',
}

/**
 * Permission check result with reason
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  feature: CRMFeature;
}

/**
 * Check if a user has access to a specific CRM feature
 *
 * @param userId - The user's ID (from NextAuth session)
 * @param feature - The CRM feature to check
 * @returns Permission check result
 *
 * @example
 * ```typescript
 * const { allowed } = await checkCRMPermission(userId, CRMFeature.EMAIL_AUTOMATION);
 * if (!allowed) {
 *   return NextResponse.json({ error: 'Access denied' }, { status: 403 });
 * }
 * ```
 */
export async function checkCRMPermission(
  userId: string,
  feature: CRMFeature
): Promise<PermissionCheckResult> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        role: true,
        crmEmailAutomation: true,
        crmWorkflowAutomation: true,
        crmActivityTracking: true,
        crmAdvancedAnalytics: true,
        crmTaskManagement: true,
        crmLeadScoring: true,
        crmBulkActions: true,
      },
    });

    if (!profile) {
      return {
        allowed: false,
        reason: 'Profile not found',
        feature,
      };
    }

    // Admins always have access to all features
    if (profile.role === 'admin' || profile.role === 'super_admin') {
      return {
        allowed: true,
        reason: 'Admin access',
        feature,
      };
    }

    // Tax preparers need explicit permission
    if (profile.role === 'tax_preparer') {
      const hasPermission = profile[feature as keyof typeof profile] === true;

      return {
        allowed: hasPermission,
        reason: hasPermission ? 'Permission granted' : 'Permission not enabled by admin',
        feature,
      };
    }

    // Other roles don't have CRM access
    return {
      allowed: false,
      reason: 'CRM features only available for tax preparers and admins',
      feature,
    };
  } catch (error) {
    logger.error('Error checking CRM permission:', error);
    return {
      allowed: false,
      reason: 'Permission check failed',
      feature,
    };
  }
}

/**
 * Check multiple CRM permissions at once
 *
 * @param userId - The user's ID
 * @param features - Array of features to check
 * @returns Map of feature to permission result
 *
 * @example
 * ```typescript
 * const permissions = await checkMultipleCRMPermissions(userId, [
 *   CRMFeature.EMAIL_AUTOMATION,
 *   CRMFeature.TASK_MANAGEMENT
 * ]);
 *
 * if (permissions.get(CRMFeature.EMAIL_AUTOMATION)?.allowed) {
 *   // User can access email automation
 * }
 * ```
 */
export async function checkMultipleCRMPermissions(
  userId: string,
  features: CRMFeature[]
): Promise<Map<CRMFeature, PermissionCheckResult>> {
  const results = new Map<CRMFeature, PermissionCheckResult>();

  // Batch check - fetch profile once
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        role: true,
        crmEmailAutomation: true,
        crmWorkflowAutomation: true,
        crmActivityTracking: true,
        crmAdvancedAnalytics: true,
        crmTaskManagement: true,
        crmLeadScoring: true,
        crmBulkActions: true,
      },
    });

    if (!profile) {
      features.forEach((feature) => {
        results.set(feature, {
          allowed: false,
          reason: 'Profile not found',
          feature,
        });
      });
      return results;
    }

    // Check each feature
    features.forEach((feature) => {
      // Admins always have access
      if (profile.role === 'admin' || profile.role === 'super_admin') {
        results.set(feature, {
          allowed: true,
          reason: 'Admin access',
          feature,
        });
        return;
      }

      // Tax preparers need explicit permission
      if (profile.role === 'tax_preparer') {
        const hasPermission = profile[feature as keyof typeof profile] === true;
        results.set(feature, {
          allowed: hasPermission,
          reason: hasPermission ? 'Permission granted' : 'Permission not enabled',
          feature,
        });
        return;
      }

      // Other roles don't have access
      results.set(feature, {
        allowed: false,
        reason: 'CRM features only for tax preparers and admins',
        feature,
      });
    });

    return results;
  } catch (error) {
    logger.error('Error checking multiple CRM permissions:', error);
    features.forEach((feature) => {
      results.set(feature, {
        allowed: false,
        reason: 'Permission check failed',
        feature,
      });
    });
    return results;
  }
}

/**
 * Get all enabled CRM features for a user
 *
 * @param userId - The user's ID
 * @returns Array of enabled CRM features
 *
 * @example
 * ```typescript
 * const enabledFeatures = await getEnabledCRMFeatures(userId);
 * // Returns: [CRMFeature.EMAIL_AUTOMATION, CRMFeature.TASK_MANAGEMENT]
 * ```
 */
export async function getEnabledCRMFeatures(userId: string): Promise<CRMFeature[]> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        role: true,
        crmEmailAutomation: true,
        crmWorkflowAutomation: true,
        crmActivityTracking: true,
        crmAdvancedAnalytics: true,
        crmTaskManagement: true,
        crmLeadScoring: true,
        crmBulkActions: true,
      },
    });

    if (!profile) {
      return [];
    }

    // Admins have access to everything
    if (profile.role === 'admin' || profile.role === 'super_admin') {
      return Object.values(CRMFeature);
    }

    // For tax preparers, return only enabled features
    if (profile.role === 'tax_preparer') {
      const enabledFeatures: CRMFeature[] = [];

      if (profile.crmEmailAutomation) enabledFeatures.push(CRMFeature.EMAIL_AUTOMATION);
      if (profile.crmWorkflowAutomation)
        enabledFeatures.push(CRMFeature.WORKFLOW_AUTOMATION);
      if (profile.crmActivityTracking) enabledFeatures.push(CRMFeature.ACTIVITY_TRACKING);
      if (profile.crmAdvancedAnalytics) enabledFeatures.push(CRMFeature.ADVANCED_ANALYTICS);
      if (profile.crmTaskManagement) enabledFeatures.push(CRMFeature.TASK_MANAGEMENT);
      if (profile.crmLeadScoring) enabledFeatures.push(CRMFeature.LEAD_SCORING);
      if (profile.crmBulkActions) enabledFeatures.push(CRMFeature.BULK_ACTIONS);

      return enabledFeatures;
    }

    return [];
  } catch (error) {
    logger.error('Error getting enabled CRM features:', error);
    return [];
  }
}

/**
 * Grant CRM permission to a tax preparer (admin only)
 *
 * @param adminUserId - The admin's user ID
 * @param preparerProfileId - The preparer's profile ID
 * @param feature - The feature to enable
 * @returns Success status
 */
export async function grantCRMPermission(
  adminUserId: string,
  preparerProfileId: string,
  feature: CRMFeature
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify admin permission
    const admin = await prisma.profile.findUnique({
      where: { userId: adminUserId },
      select: { role: true },
    });

    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      return {
        success: false,
        error: 'Only admins can grant CRM permissions',
      };
    }

    // Verify preparer exists and is a tax preparer
    const preparer = await prisma.profile.findUnique({
      where: { id: preparerProfileId },
      select: { role: true },
    });

    if (!preparer) {
      return {
        success: false,
        error: 'Preparer profile not found',
      };
    }

    if (preparer.role !== 'tax_preparer') {
      return {
        success: false,
        error: 'CRM permissions can only be granted to tax preparers',
      };
    }

    // Grant permission
    await prisma.profile.update({
      where: { id: preparerProfileId },
      data: {
        [feature]: true,
      },
    });

    logger.info(`Admin ${adminUserId} granted ${feature} to preparer ${preparerProfileId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error granting CRM permission:', error);
    return {
      success: false,
      error: 'Failed to grant permission',
    };
  }
}

/**
 * Revoke CRM permission from a tax preparer (admin only)
 *
 * @param adminUserId - The admin's user ID
 * @param preparerProfileId - The preparer's profile ID
 * @param feature - The feature to disable
 * @returns Success status
 */
export async function revokeCRMPermission(
  adminUserId: string,
  preparerProfileId: string,
  feature: CRMFeature
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify admin permission
    const admin = await prisma.profile.findUnique({
      where: { userId: adminUserId },
      select: { role: true },
    });

    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      return {
        success: false,
        error: 'Only admins can revoke CRM permissions',
      };
    }

    // Revoke permission
    await prisma.profile.update({
      where: { id: preparerProfileId },
      data: {
        [feature]: false,
      },
    });

    logger.info(`Admin ${adminUserId} revoked ${feature} from preparer ${preparerProfileId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error revoking CRM permission:', error);
    return {
      success: false,
      error: 'Failed to revoke permission',
    };
  }
}

/**
 * Bulk update CRM permissions for a tax preparer (admin only)
 *
 * @param adminUserId - The admin's user ID
 * @param preparerProfileId - The preparer's profile ID
 * @param permissions - Object with feature permissions
 * @returns Success status
 */
export async function bulkUpdateCRMPermissions(
  adminUserId: string,
  preparerProfileId: string,
  permissions: Partial<Record<CRMFeature, boolean>>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify admin permission
    const admin = await prisma.profile.findUnique({
      where: { userId: adminUserId },
      select: { role: true },
    });

    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      return {
        success: false,
        error: 'Only admins can update CRM permissions',
      };
    }

    // Bulk update
    await prisma.profile.update({
      where: { id: preparerProfileId },
      data: permissions,
    });

    logger.info(
      `Admin ${adminUserId} bulk updated CRM permissions for preparer ${preparerProfileId}`
    );

    return { success: true };
  } catch (error) {
    logger.error('Error bulk updating CRM permissions:', error);
    return {
      success: false,
      error: 'Failed to update permissions',
    };
  }
}
