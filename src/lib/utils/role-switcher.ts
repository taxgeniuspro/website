/**
 * Role Switcher Utility
 *
 * Manages the "View As" functionality for admins
 * Allows admins to preview the application from other roles' perspectives
 */

import { cookies } from 'next/headers';
import { UserRole } from '@/lib/permissions';
import type { ViewingRoleState, EffectiveRoleInfo } from '@/types/role-switcher';
import { logger } from '@/lib/logger';

// Cookie configuration
export const VIEWING_ROLE_COOKIE_NAME = '__tgp_view_role';
export const VIEWING_ROLE_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Set viewing role cookie (server-side)
 * Only admins should be able to call this
 */
export async function setViewingRoleCookie(
  viewingRole: UserRole,
  adminUserId: string
): Promise<void> {
  const cookieStore = await cookies();

  const state: ViewingRoleState = {
    viewingRole,
    viewingRoleName: formatRoleName(viewingRole),
    timestamp: Date.now(),
    adminUserId,
  };

  cookieStore.set(VIEWING_ROLE_COOKIE_NAME, JSON.stringify(state), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: VIEWING_ROLE_COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Get viewing role from cookie (server-side)
 */
export async function getViewingRoleCookie(): Promise<ViewingRoleState | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(VIEWING_ROLE_COOKIE_NAME);

  if (!cookie?.value) {
    return null;
  }

  try {
    const state = JSON.parse(cookie.value) as ViewingRoleState;

    // Validate required fields
    if (!state.viewingRole || !state.adminUserId || !state.timestamp) {
      return null;
    }

    // Check if expired (7-day window)
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    if (now - state.timestamp > sevenDaysInMs) {
      // Cookie expired, clear it
      await clearViewingRoleCookie();
      return null;
    }

    return state;
  } catch (error) {
    logger.error('Failed to parse viewing role cookie:', error);
    return null;
  }
}

/**
 * Clear viewing role cookie (server-side)
 */
export async function clearViewingRoleCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(VIEWING_ROLE_COOKIE_NAME);
}

/**
 * Get effective role for the current user
 * Returns viewing role if admin is viewing as another role, otherwise actual role
 */
export async function getEffectiveRole(
  actualRole: UserRole,
  userId: string
): Promise<EffectiveRoleInfo> {
  // Only admins can have a different viewing role
  if (actualRole !== 'super_admin' && actualRole !== 'admin') {
    return {
      actualRole,
      effectiveRole: actualRole,
      isViewingAsOtherRole: false,
    };
  }

  // Check for viewing role cookie
  const viewingState = await getViewingRoleCookie();

  if (!viewingState) {
    return {
      actualRole,
      effectiveRole: actualRole,
      isViewingAsOtherRole: false,
    };
  }

  // Verify the viewing role is for this admin
  if (viewingState.adminUserId !== userId) {
    // Cookie is for a different admin, clear it
    await clearViewingRoleCookie();
    return {
      actualRole,
      effectiveRole: actualRole,
      isViewingAsOtherRole: false,
    };
  }

  // Return effective role info
  return {
    actualRole,
    effectiveRole: viewingState.viewingRole,
    isViewingAsOtherRole: true,
    viewingRoleName: viewingState.viewingRoleName,
  };
}

/**
 * Check if user can switch to a target role
 * Admins can view as any role except super_admin (for security)
 */
export function canSwitchToRole(actualRole: UserRole, targetRole: UserRole): boolean {
  // Only admins can switch roles
  if (actualRole !== 'super_admin' && actualRole !== 'admin') {
    return false;
  }

  // Super admins can view as any role including admin
  if (actualRole === 'super_admin') {
    return true;
  }

  // Regular admins cannot view as super_admin (privilege escalation prevention)
  if (actualRole === 'admin' && targetRole === 'super_admin') {
    return false;
  }

  return true;
}

/**
 * Format role name for display
 */
export function formatRoleName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    tax_preparer: 'Tax Preparer',
    affiliate: 'Affiliate',
    lead: 'Lead',
    client: 'Client',
  };

  return roleNames[role] || role;
}

/**
 * Get role color for UI display
 */
export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    super_admin: 'red',
    admin: 'orange',
    tax_preparer: 'blue',
    affiliate: 'purple',
    lead: 'green',
    client: 'gray',
  };

  return colors[role] || 'gray';
}

/**
 * Get role badge classes for UI
 */
export function getRoleBadgeClasses(role: UserRole): string {
  const classes: Record<UserRole, string> = {
    super_admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    admin: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    tax_preparer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    affiliate: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    lead: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    client: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
  };

  return classes[role] || classes.client;
}

/**
 * Client-side: Get viewing role from document.cookie
 */
export function getViewingRoleCookieClient(): ViewingRoleState | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');
  const viewingCookie = cookies.find((c) => c.trim().startsWith(`${VIEWING_ROLE_COOKIE_NAME}=`));

  if (!viewingCookie) {
    return null;
  }

  try {
    const value = viewingCookie.split('=')[1];
    const state = JSON.parse(decodeURIComponent(value)) as ViewingRoleState;

    // Validate required fields
    if (!state.viewingRole || !state.adminUserId || !state.timestamp) {
      return null;
    }

    // Check if expired (7-day window)
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    if (now - state.timestamp > sevenDaysInMs) {
      return null;
    }

    return state;
  } catch (error) {
    logger.error('Failed to parse viewing role cookie (client):', error);
    return null;
  }
}

/**
 * Client-side: Call API to set viewing role
 */
export async function setViewingRoleClient(role: UserRole): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/switch-view-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role }),
    });

    return response.ok;
  } catch (error) {
    logger.error('Failed to set viewing role via API:', error);
    return false;
  }
}

/**
 * Client-side: Call API to clear viewing role
 */
export async function clearViewingRoleClient(): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/switch-view-role', {
      method: 'DELETE',
    });

    return response.ok;
  } catch (error) {
    logger.error('Failed to clear viewing role via API:', error);
    return false;
  }
}
