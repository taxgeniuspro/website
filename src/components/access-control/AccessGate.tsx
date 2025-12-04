/**
 * AccessGate Component
 *
 * Higher-level component that checks access and redirects if denied.
 * Useful for page-level protection with automatic redirects.
 *
 * @example
 * <AccessGate
 *   allowedRoles={['super_admin', 'admin']}
 *   redirectTo="/forbidden"
 *   loadingPage={<LoadingSpinner />}
 * >
 *   <AdminPanel />
 * </AccessGate>
 */

'use client';

import { useSession } from 'next-auth/react';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/lib/permissions';

interface AccessGateProps {
  children: ReactNode;

  // Access control
  allowedRoles?: UserRole[] | string[];
  blockedRoles?: UserRole[] | string[];
  allowedUsernames?: string[];
  blockedUsernames?: string[];

  // Redirect behavior
  redirectTo?: string; // Where to redirect on access denied (default: '/forbidden')
  redirectOnLoading?: boolean; // Redirect while loading (default: false)

  // UI
  loadingPage?: ReactNode; // Custom loading page

  // Callbacks
  onAccessGranted?: () => void;
  onAccessDenied?: (reason: string) => void;
}

export function AccessGate({
  children,
  allowedRoles = [],
  blockedRoles = [],
  allowedUsernames = [],
  blockedUsernames = [],
  redirectTo = '/forbidden',
  redirectOnLoading = false,
  loadingPage,
  onAccessGranted,
  onAccessDenied,
}: AccessGateProps) {
  const { data: session, status } = useSession(); const user = session?.user; const isLoaded = status !== 'loading';
  const router = useRouter();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      if (redirectOnLoading && redirectTo) {
        router.push(redirectTo);
      }
      return;
    }

    if (hasChecked) {
      return;
    }

    const userRole = user?.publicMetadata?.role as string | undefined;
    const username = user?.username || user?.primaryEmailAddress?.emailAddress;

    const result = checkAccess({
      userRole,
      username,
      isAuthenticated: !!user,
      allowedRoles,
      blockedRoles,
      allowedUsernames,
      blockedUsernames,
    });

    setHasChecked(true);

    if (result.allowed) {
      if (onAccessGranted) {
        onAccessGranted();
      }
    } else {
      if (onAccessDenied) {
        onAccessDenied(result.reason);
      }
      if (redirectTo) {
        router.push(redirectTo);
      }
    }
  }, [
    user,
    isLoaded,
    hasChecked,
    allowedRoles,
    blockedRoles,
    allowedUsernames,
    blockedUsernames,
    redirectTo,
    redirectOnLoading,
    onAccessGranted,
    onAccessDenied,
    router,
  ]);

  // Still loading
  if (!isLoaded || !hasChecked) {
    if (loadingPage) {
      return <>{loadingPage}</>;
    }

    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Checking access...</div>
      </div>
    );
  }

  // Access granted (render children)
  return <>{children}</>;
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
  } = params;

  // Username-based blocks (highest priority)
  if (username && isUsernameInList(username, blockedUsernames)) {
    return { allowed: false, reason: 'blocked_username' };
  }

  // Username-based allows
  if (username && isUsernameInList(username, allowedUsernames)) {
    return { allowed: true, reason: 'allowed_username' };
  }

  // Authentication check
  if (!isAuthenticated) {
    return { allowed: false, reason: 'not_authenticated' };
  }

  // Role-based blocks
  if (userRole && blockedRoles.includes(userRole)) {
    return { allowed: false, reason: 'blocked_role' };
  }

  // Role-based allows
  if (allowedRoles.length === 0) {
    return { allowed: true, reason: 'authenticated' };
  }

  if (userRole && allowedRoles.includes(userRole)) {
    return { allowed: true, reason: 'allowed_role' };
  }

  return { allowed: false, reason: 'no_permission' };
}
