/**
 * RestrictedContent Component
 *
 * Conditionally renders children based on user role and access permissions.
 * Can be used to hide/show entire sections of a page.
 *
 * @example
 * <RestrictedContent allowedRoles={['admin', 'super_admin']}>
 *   <AdminDashboard />
 * </RestrictedContent>
 *
 * @example
 * <RestrictedContent
 *   allowedRoles={['tax_preparer']}
 *   blockedUsernames={['suspended_user']}
 *   fallback={<UpgradePrompt />}
 * >
 *   <PreparerTools />
 * </RestrictedContent>
 */

'use client';

import { useSession } from 'next-auth/react';
import { ReactNode, useEffect, useState } from 'react';
import { UserRole } from '@/lib/permissions';
import { logger } from '@/lib/logger';

interface RestrictedContentProps {
  children: ReactNode;

  // Role-based restrictions
  allowedRoles?: UserRole[] | string[];
  blockedRoles?: UserRole[] | string[];

  // Username-based restrictions (highest priority)
  allowedUsernames?: string[];
  blockedUsernames?: string[];

  // Behavior
  requireAuth?: boolean; // Require authentication (default: true)
  fallback?: ReactNode; // What to show when access denied (default: null)
  loadingFallback?: ReactNode; // What to show while checking (default: null)

  // Debug
  debug?: boolean; // Log access decisions to console
}

export function RestrictedContent({
  children,
  allowedRoles = [],
  blockedRoles = [],
  allowedUsernames = [],
  blockedUsernames = [],
  requireAuth = true,
  fallback = null,
  loadingFallback = null,
  debug = false,
}: RestrictedContentProps) {
  const { data: session, status } = useSession(); const user = session?.user; const isLoaded = status !== 'loading';
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    // Get user context
    const userRole = user?.publicMetadata?.role as string | undefined;
    const username = user?.username || user?.primaryEmailAddress?.emailAddress;

    // Check access
    const accessResult = checkAccess({
      userRole,
      username,
      isAuthenticated: !!user,
      allowedRoles,
      blockedRoles,
      allowedUsernames,
      blockedUsernames,
      requireAuth,
    });

    setHasAccess(accessResult.allowed);

    if (debug) {
      logger.info('RestrictedContent access check:', {
        allowed: accessResult.allowed,
        reason: accessResult.reason,
        userRole,
        username,
      });
    }
  }, [
    user,
    isLoaded,
    allowedRoles,
    blockedRoles,
    allowedUsernames,
    blockedUsernames,
    requireAuth,
    debug,
  ]);

  // Still loading
  if (!isLoaded || hasAccess === null) {
    return <>{loadingFallback}</>;
  }

  // Access granted
  if (hasAccess) {
    return <>{children}</>;
  }

  // Access denied
  return <>{fallback}</>;
}

// ============ Helper Functions ============

interface AccessCheckParams {
  userRole?: string;
  username?: string;
  isAuthenticated: boolean;
  allowedRoles: (UserRole | string)[];
  blockedRoles: (UserRole | string)[];
  allowedUsernames: string[];
  blockedUsernames: string[];
  requireAuth: boolean;
}

interface AccessCheckResult {
  allowed: boolean;
  reason: string;
}

function normalizeUsername(username: string): string {
  return username.toLowerCase().trim();
}

function isUsernameInList(username: string, usernameList: string[]): boolean {
  const normalized = normalizeUsername(username);
  return usernameList.some((u) => normalizeUsername(u) === normalized);
}

function checkAccess(params: AccessCheckParams): AccessCheckResult {
  const {
    userRole,
    username,
    isAuthenticated,
    allowedRoles,
    blockedRoles,
    allowedUsernames,
    blockedUsernames,
    requireAuth,
  } = params;

  // STEP 1: Check username-based BLOCKS (highest priority)
  if (username && isUsernameInList(username, blockedUsernames)) {
    return {
      allowed: false,
      reason: 'blocked_username',
    };
  }

  // STEP 2: Check username-based ALLOWS
  if (username && isUsernameInList(username, allowedUsernames)) {
    return {
      allowed: true,
      reason: 'allowed_username',
    };
  }

  // STEP 3: Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    return {
      allowed: false,
      reason: 'not_authenticated',
    };
  }

  // If no auth required and user not authenticated, check if we should allow
  if (!requireAuth && !isAuthenticated) {
    // If there are no role restrictions, allow
    if (allowedRoles.length === 0 && blockedRoles.length === 0) {
      return {
        allowed: true,
        reason: 'public_access',
      };
    }
    // If there are role restrictions, deny (can't check role without auth)
    return {
      allowed: false,
      reason: 'roles_require_auth',
    };
  }

  // STEP 4: Check role-based BLOCKS
  if (userRole && blockedRoles.includes(userRole)) {
    return {
      allowed: false,
      reason: 'blocked_role',
    };
  }

  // STEP 5: Check role-based ALLOWS
  // Empty allowedRoles = allow all (no role restriction)
  if (allowedRoles.length === 0) {
    return {
      allowed: true,
      reason: isAuthenticated ? 'authenticated' : 'no_restrictions',
    };
  }

  // Check if user's role is in allowed list
  if (userRole && allowedRoles.includes(userRole)) {
    return {
      allowed: true,
      reason: 'allowed_role',
    };
  }

  // Default: deny access
  return {
    allowed: false,
    reason: 'no_permission',
  };
}
