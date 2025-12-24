/**
 * Clerk Authentication Helpers
 *
 * Provides authentication utilities for Tax Genius Pro using Clerk.
 * Replaces NextAuth.js configuration.
 *
 * Features:
 * - Google OAuth (Gmail login)
 * - Email/Password authentication
 * - Role-based access control
 * - Profile sync with database
 */
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { logger } from '@/lib/logger';

// Define user role types that match our database
export type { UserRole } from '@prisma/client';

export interface ClerkUserData {
  id: string;
  clerkUserId: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
}

/**
 * Get the current authenticated user from Clerk
 * Returns null if not authenticated
 */
export async function getClerkUser(): Promise<ClerkUserData | null> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return null;
    }

    const user = await currentUser();
    if (!user) {
      return null;
    }

    // Get role from Clerk public metadata or default to 'client'
    const role = (user.publicMetadata?.role as UserRole) || 'client';

    return {
      id: userId,
      clerkUserId: userId,
      email: user.emailAddresses[0]?.emailAddress || '',
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
      image: user.imageUrl,
      role,
    };
  } catch (error) {
    logger.error('Error getting Clerk user:', error);
    return null;
  }
}

/**
 * Get the current user's session data (for server components)
 */
export async function getSession() {
  const user = await getClerkUser();
  if (!user) {
    return null;
  }

  return {
    user,
  };
}

/**
 * Auth helper for API routes - returns user data from Clerk
 * Compatible with existing code that uses auth()
 */
export async function clerkAuth() {
  return getSession();
}

/**
 * Check if the current user has a specific role
 */
export async function hasRole(allowedRoles: UserRole | UserRole[]): Promise<boolean> {
  const user = await getClerkUser();
  if (!user) {
    return false;
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return roles.includes(user.role);
}

/**
 * Get user profile from database based on Clerk user ID
 */
export async function getUserProfile(clerkUserId: string) {
  try {
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { clerkUserId },
          { userId: clerkUserId }
        ]
      },
    });
    return profile;
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Get user with role from Clerk and database
 * This combines Clerk auth with our Profile table for complete user data
 */
export async function getUserWithRole() {
  const user = await getClerkUser();
  if (!user) {
    return { user: null, role: null, profile: null };
  }

  // Get profile from database
  const profile = await getUserProfile(user.clerkUserId);

  // Use role from profile if available, otherwise use Clerk metadata
  const role = profile?.role || user.role;

  return {
    user,
    role,
    profile: profile ? { id: profile.id } : { id: user.id },
  };
}

/**
 * Validate request and return user (for backward compatibility)
 * @returns Object with user or null
 */
export async function validateRequest() {
  const user = await getClerkUser();
  if (!user) {
    return { user: null };
  }
  return { user };
}

/**
 * Get the dashboard URL based on user role
 * @param role - User role
 * @returns Dashboard URL for the role
 */
export function getDashboardUrl(role: UserRole | string): string {
  const normalizedRole = typeof role === 'string' ? role.toLowerCase() : role;

  // Dashboard URLs by role
  const dashboardUrls: Record<string, string> = {
    admin: '/admin',
    tax_preparer: '/dashboard/tax-preparer',
    client: '/dashboard/client',
    affiliate: '/dashboard/affiliate/analytics',
    referrer: '/dashboard/affiliate/analytics',
  };

  return dashboardUrls[normalizedRole] || '/dashboard/client';
}

/**
 * Require authentication for a route
 * Throws an error if not authenticated
 */
export async function requireAuth() {
  const user = await getClerkUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

/**
 * Require specific role(s) for a route
 * Throws an error if user doesn't have required role
 */
export async function requireRole(allowedRoles: UserRole | UserRole[]) {
  const user = await requireAuth();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(user.role)) {
    throw new Error('Forbidden: Insufficient permissions');
  }

  return user;
}
