/**
 * RestrictedSection Component
 *
 * Similar to RestrictedContent but with enhanced UX features:
 * - Loading states
 * - Custom error/forbidden messages
 * - Upgrade prompts
 * - Analytics tracking
 *
 * @example
 * <RestrictedSection
 *   allowedRoles={['tax_preparer', 'admin']}
 *   title="Tax Preparer Tools"
 *   upgradeMessage="Upgrade to Tax Preparer to access these tools"
 *   upgradeUrl="/apply-preparer"
 * >
 *   <TaxPreparerDashboard />
 * </RestrictedSection>
 */

'use client';

import { useSession } from 'next-auth/react';
import { ReactNode, useEffect, useState } from 'react';
import { UserRole } from '@/lib/permissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface RestrictedSectionProps {
  children: ReactNode;

  // Access control
  allowedRoles?: UserRole[] | string[];
  blockedRoles?: UserRole[] | string[];
  allowedUsernames?: string[];
  blockedUsernames?: string[];

  // UI customization
  title?: string;
  description?: string;
  upgradeMessage?: string;
  upgradeUrl?: string;
  upgradeButtonText?: string;

  // Custom fallbacks
  loadingFallback?: ReactNode;
  forbiddenFallback?: ReactNode; // Custom content when access denied

  // Behavior
  trackAttempts?: boolean; // Track unauthorized access attempts (default: false)
  onAccessDenied?: () => void; // Callback when access is denied
}

export function RestrictedSection({
  children,
  allowedRoles = [],
  blockedRoles = [],
  allowedUsernames = [],
  blockedUsernames = [],
  title,
  description,
  upgradeMessage,
  upgradeUrl,
  upgradeButtonText = 'Upgrade Now',
  loadingFallback,
  forbiddenFallback,
  trackAttempts = false,
  onAccessDenied,
}: RestrictedSectionProps) {
  const { data: session, status } = useSession(); const user = session?.user; const isLoaded = status !== 'loading';
  const [accessState, setAccessState] = useState<{
    allowed: boolean | null;
    reason?: string;
  }>({ allowed: null });

  useEffect(() => {
    if (!isLoaded) {
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

    setAccessState(result);

    // Track unauthorized access attempts
    if (!result.allowed && trackAttempts && user) {
      trackAccessAttempt({
        userId: user.id,
        userRole,
        username,
        reason: result.reason || 'unknown',
        sectionTitle: title,
      });
    }

    // Callback on access denied
    if (!result.allowed && onAccessDenied) {
      onAccessDenied();
    }
  }, [
    user,
    isLoaded,
    allowedRoles,
    blockedRoles,
    allowedUsernames,
    blockedUsernames,
    title,
    trackAttempts,
    onAccessDenied,
  ]);

  // Loading state
  if (!isLoaded || accessState.allowed === null) {
    if (loadingFallback) {
      return <>{loadingFallback}</>;
    }

    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Access granted
  if (accessState.allowed) {
    return <>{children}</>;
  }

  // Access denied - use custom fallback if provided
  if (forbiddenFallback) {
    return <>{forbiddenFallback}</>;
  }

  // Access denied - default UI
  return (
    <div className="p-6">
      <Alert variant="destructive">
        <Lock className="h-4 w-4" />
        <AlertTitle>{title || 'Access Restricted'}</AlertTitle>
        <AlertDescription>
          {upgradeMessage || description || 'You do not have permission to view this content.'}
        </AlertDescription>
        {upgradeUrl && (
          <div className="mt-4">
            <Link href={upgradeUrl}>
              <Button variant="default" size="sm">
                {upgradeButtonText}
              </Button>
            </Link>
          </div>
        )}
      </Alert>
    </div>
  );
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
  reason?: string;
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

// Track unauthorized access attempts
async function trackAccessAttempt(params: {
  userId: string;
  userRole?: string;
  username?: string;
  reason: string;
  sectionTitle?: string;
}): Promise<void> {
  try {
    await fetch('/api/restrictions/log-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch (error) {
    // Silently fail - don't block UI on tracking errors
    logger.error('Failed to track access attempt:', error);
  }
}
