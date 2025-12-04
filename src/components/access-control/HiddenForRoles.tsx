/**
 * HiddenForRoles Component
 *
 * Hides content from specific user roles.
 * Inverse of RestrictedContent - defaults to showing content unless role is blocked.
 *
 * @example
 * <HiddenForRoles blockedRoles={['client', 'lead']}>
 *   <InternalAdminTools />
 * </HiddenForRoles>
 *
 * @example
 * <HiddenForRoles
 *   blockedRoles={['affiliate']}
 *   blockedUsernames={['test_user']}
 * >
 *   <SensitiveData />
 * </HiddenForRoles>
 */

'use client';

import { useSession } from 'next-auth/react';
import { ReactNode, useEffect, useState } from 'react';
import { UserRole } from '@/lib/permissions';

interface HiddenForRolesProps {
  children: ReactNode;

  // Roles that should NOT see this content
  blockedRoles?: UserRole[] | string[];

  // Usernames that should NOT see this content (highest priority)
  blockedUsernames?: string[];

  // Alternative: roles that SHOULD see this (if provided, inverts logic)
  visibleToRoles?: UserRole[] | string[];

  // What to show while loading (default: null)
  loadingFallback?: ReactNode;
}

export function HiddenForRoles({
  children,
  blockedRoles = [],
  blockedUsernames = [],
  visibleToRoles,
  loadingFallback = null,
}: HiddenForRolesProps) {
  const { data: session, status } = useSession(); const user = session?.user; const isLoaded = status !== 'loading';
  const [shouldShow, setShouldShow] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const userRole = user?.publicMetadata?.role as string | undefined;
    const username = user?.username || user?.primaryEmailAddress?.emailAddress;

    // Check if should hide
    const hidden = checkIfHidden({
      userRole,
      username,
      blockedRoles,
      blockedUsernames,
      visibleToRoles,
    });

    setShouldShow(!hidden);
  }, [user, isLoaded, blockedRoles, blockedUsernames, visibleToRoles]);

  // Still loading
  if (!isLoaded || shouldShow === null) {
    return <>{loadingFallback}</>;
  }

  // Show content if not hidden
  if (shouldShow) {
    return <>{children}</>;
  }

  // Hidden
  return null;
}

// ============ Helper Functions ============

function normalizeUsername(username: string): string {
  return username.toLowerCase().trim();
}

function isUsernameInList(username: string, usernameList: string[]): boolean {
  const normalized = normalizeUsername(username);
  return usernameList.some((u) => normalizeUsername(u) === normalized);
}

function checkIfHidden(params: {
  userRole?: string;
  username?: string;
  blockedRoles: (UserRole | string)[];
  blockedUsernames: string[];
  visibleToRoles?: (UserRole | string)[];
}): boolean {
  const { userRole, username, blockedRoles, blockedUsernames, visibleToRoles } = params;

  // Check username blocks (highest priority)
  if (username && isUsernameInList(username, blockedUsernames)) {
    return true; // Hidden
  }

  // If visibleToRoles is provided, use that instead of blockedRoles
  if (visibleToRoles && visibleToRoles.length > 0) {
    // Show only to specified roles
    if (!userRole || !visibleToRoles.includes(userRole)) {
      return true; // Hidden (not in visible list)
    }
    return false; // Visible
  }

  // Check role blocks
  if (userRole && blockedRoles.includes(userRole)) {
    return true; // Hidden
  }

  return false; // Not hidden
}
