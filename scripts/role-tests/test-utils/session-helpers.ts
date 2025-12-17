/**
 * Session Helpers
 *
 * Provides utilities for simulating authenticated sessions in tests.
 * Uses direct database queries and API calls for authentication.
 */

import { prisma } from './test-data-factory';

export type UserRole = 'admin' | 'tax_preparer' | 'client';

export interface TestSession {
  userId: string;
  profileId: string;
  email: string;
  role: UserRole;
  shortLinkUsername?: string | null;
  affiliateStatus?: string;
}

/**
 * Get session for a user by email
 */
export async function getSessionByEmail(email: string): Promise<TestSession | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      profile: true,
    },
  });

  if (!user || !user.profile) {
    return null;
  }

  return {
    userId: user.id,
    profileId: user.profile.id,
    email: user.email,
    role: user.profile.role as UserRole,
    shortLinkUsername: user.profile.shortLinkUsername,
    affiliateStatus: user.profile.affiliateStatus,
  };
}

/**
 * Get session for a user by profile ID
 */
export async function getSessionByProfileId(profileId: string): Promise<TestSession | null> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      user: true,
    },
  });

  if (!profile) {
    return null;
  }

  return {
    userId: profile.userId,
    profileId: profile.id,
    email: profile.user.email,
    role: profile.role as UserRole,
    shortLinkUsername: profile.shortLinkUsername,
    affiliateStatus: profile.affiliateStatus,
  };
}

/**
 * Get session for a user by shortLinkUsername
 */
export async function getSessionByUsername(username: string): Promise<TestSession | null> {
  const profile = await prisma.profile.findFirst({
    where: { shortLinkUsername: username },
    include: {
      user: true,
    },
  });

  if (!profile) {
    return null;
  }

  return {
    userId: profile.userId,
    profileId: profile.id,
    email: profile.user.email,
    role: profile.role as UserRole,
    shortLinkUsername: profile.shortLinkUsername,
    affiliateStatus: profile.affiliateStatus,
  };
}

/**
 * Get the first user with a specific role
 */
export async function getFirstUserByRole(role: UserRole): Promise<TestSession | null> {
  const profile = await prisma.profile.findFirst({
    where: { role },
    include: {
      user: true,
    },
  });

  if (!profile) {
    return null;
  }

  return {
    userId: profile.userId,
    profileId: profile.id,
    email: profile.user.email,
    role: profile.role as UserRole,
    shortLinkUsername: profile.shortLinkUsername,
    affiliateStatus: profile.affiliateStatus,
  };
}

/**
 * Get all users with a specific role
 */
export async function getAllUsersByRole(role: UserRole): Promise<TestSession[]> {
  const profiles = await prisma.profile.findMany({
    where: { role },
    include: {
      user: true,
    },
  });

  return profiles.map((profile) => ({
    userId: profile.userId,
    profileId: profile.id,
    email: profile.user.email,
    role: profile.role as UserRole,
    shortLinkUsername: profile.shortLinkUsername,
    affiliateStatus: profile.affiliateStatus,
  }));
}

/**
 * Get an approved affiliate user
 */
export async function getApprovedAffiliate(): Promise<TestSession | null> {
  const profile = await prisma.profile.findFirst({
    where: { affiliateStatus: 'APPROVED' },
    include: {
      user: true,
    },
  });

  if (!profile) {
    return null;
  }

  return {
    userId: profile.userId,
    profileId: profile.id,
    email: profile.user.email,
    role: profile.role as UserRole,
    shortLinkUsername: profile.shortLinkUsername,
    affiliateStatus: profile.affiliateStatus,
  };
}

/**
 * Simulate making an API call as a specific user
 * In real tests, this would use actual HTTP requests with cookies
 * For these tests, we call services directly with the session context
 */
export async function simulateApiCall(
  session: TestSession,
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, unknown>
): Promise<{ status: number; data: unknown }> {
  // For direct testing, we'll import and call the route handlers
  // This is a placeholder for HTTP-based testing
  console.log(`[API Call] ${method} ${endpoint} as ${session.email} (${session.role})`);

  return {
    status: 200,
    data: { message: 'Simulated response' },
  };
}

/**
 * Check if a user has a specific permission
 * Permissions are determined by role in this system
 */
export async function checkPermission(
  session: TestSession,
  permission: string
): Promise<boolean> {
  const profile = await prisma.profile.findUnique({
    where: { id: session.profileId },
    select: {
      role: true,
    },
  });

  if (!profile) return false;

  // Admin has all permissions
  if (profile.role === 'admin') return true;

  // Default permissions by role
  const defaultPerms: Record<string, string[]> = {
    tax_preparer: [
      'canViewAssignedClients',
      'canManageLeads',
      'canUpdateTaxReturns',
      'canViewDocuments',
      'canUploadDocuments',
    ],
    client: [
      'canViewOwnProfile',
      'canViewOwnReturns',
      'canUploadDocuments',
      'canBookAppointments',
    ],
  };

  return defaultPerms[profile.role]?.includes(permission) ?? false;
}

/**
 * Get test credentials from CLAUDE.md
 */
export const testCredentials = {
  taxPreparer: {
    email: 'whitegelisa@gmail.com',
    password: 'Makiyah07@@',
    username: 'gw',
  },
  taxPreparer2: {
    email: 'iradwatkins+iw1@gmail.com',
    password: 'TaxPreparer2024!',
    username: 'iw1',
  },
};
