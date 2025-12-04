/**
 * Admin Role Switcher API
 *
 * Allows super_admin and admin users to switch their viewing role
 * to preview the application from other roles' perspectives
 */

import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import {
  setViewingRoleCookie,
  clearViewingRoleCookie,
  canSwitchToRole,
  formatRoleName,
} from '@/lib/utils/role-switcher';

/**
 * POST /api/admin/switch-view-role
 * Switch to viewing as another role
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get actual role from user metadata
    const actualRole = user?.role as UserRole | undefined;

    // Verify user is admin or super_admin
    if (actualRole !== 'super_admin' && actualRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Only admins can switch viewing roles' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { role: targetRole } = body;

    // Validate target role
    const validRoles: UserRole[] = [
      'super_admin',
      'admin',
      'lead',
      'tax_preparer',
      'affiliate',
      'client',
    ];

    if (!targetRole || !validRoles.includes(targetRole)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    // Check if user can switch to target role
    if (!canSwitchToRole(actualRole, targetRole)) {
      return NextResponse.json(
        {
          error: 'Cannot switch to this role. Regular admins cannot view as super_admin.',
        },
        { status: 403 }
      );
    }

    // If switching back to own role, clear the viewing role cookie
    if (targetRole === actualRole) {
      await clearViewingRoleCookie();

      logger.info(
        `✅ Admin ${user.id} cleared viewing role (returned to ${formatRoleName(actualRole)})`
      );

      return NextResponse.json({
        success: true,
        effectiveRole: actualRole,
        message: `Returned to ${formatRoleName(actualRole)} view`,
      });
    }

    // Set viewing role cookie
    await setViewingRoleCookie(targetRole, user.id);

    logger.info(
      `✅ Admin ${user.id} (${actualRole}) switched to viewing as ${formatRoleName(
        targetRole
      )} (${targetRole})`
    );

    // TODO: Add audit log entry here (Phase 8)
    // await logRoleSwitch(user.id, actualRole, targetRole, request)

    return NextResponse.json({
      success: true,
      effectiveRole: targetRole,
      message: `Now viewing as ${formatRoleName(targetRole)}`,
    });
  } catch (error) {
    logger.error('Error switching viewing role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/switch-view-role
 * Clear viewing role and return to actual admin role
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get actual role from user metadata
    const actualRole = user?.role as UserRole | undefined;

    // Verify user is admin or super_admin
    if (actualRole !== 'super_admin' && actualRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Only admins can clear viewing roles' },
        { status: 403 }
      );
    }

    // Clear viewing role cookie
    await clearViewingRoleCookie();

    logger.info(
      `✅ Admin ${user.id} cleared viewing role (returned to ${formatRoleName(actualRole)})`
    );

    // TODO: Add audit log entry here (Phase 8)
    // await logRoleSwitch(user.id, viewingRole, actualRole, request)

    return NextResponse.json({
      success: true,
      effectiveRole: actualRole,
      message: `Returned to ${formatRoleName(actualRole)} view`,
    });
  } catch (error) {
    logger.error('Error clearing viewing role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/switch-view-role
 * Get current viewing role state
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get actual role from user metadata
    const actualRole = user?.role as UserRole | undefined;

    // Verify user is admin or super_admin
    if (actualRole !== 'super_admin' && actualRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Import getEffectiveRole dynamically to avoid circular dependency
    const { getEffectiveRole } = await import('@/lib/utils/role-switcher');
    const roleInfo = await getEffectiveRole(actualRole, user.id);

    return NextResponse.json({
      success: true,
      actualRole: roleInfo.actualRole,
      effectiveRole: roleInfo.effectiveRole,
      isViewingAsOtherRole: roleInfo.isViewingAsOtherRole,
      viewingRoleName: roleInfo.viewingRoleName,
    });
  } catch (error) {
    logger.error('Error getting viewing role state:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
