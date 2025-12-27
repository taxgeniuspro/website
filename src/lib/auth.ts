/**
 * Supabase Authentication System
 * Complete authentication for Tax Genius Pro using Supabase Auth
 *
 * Supports:
 * - Email/Password authentication
 * - Magic link authentication
 * - OAuth providers (Google, etc.)
 * - Role-based access control via database profile
 */
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { logger } from '@/lib/logger';
import bcrypt from 'bcryptjs';

// Re-export UserRole for convenience
export { UserRole } from '@prisma/client';

/**
 * User role types for Tax Genius platform
 * @deprecated Use UserRole from @prisma/client instead
 */
export type UserRoleType = 'SUPER_ADMIN' | 'ADMIN' | 'LEAD' | 'CLIENT' | 'TAX_PREPARER' | 'AFFILIATE';

// Type definitions for session user
interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
  isActive?: boolean;
}

interface Session {
  user: SessionUser;
}

/**
 * Get auth session from Supabase
 * This is the main auth function
 */
export async function auth(): Promise<Session | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Default role
    let role: UserRole = 'client';
    let name: string | null = null;
    let image: string | null = null;

    // Get role and additional data from database profile
    try {
      let profile = await prisma.profile.findFirst({
        where: {
          OR: [
            { supabaseUserId: user.id },
            { userId: user.id },
            { email: user.email }
          ]
        },
        select: {
          id: true,
          role: true,
          isActive: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          supabaseUserId: true
        }
      });

      // Auto-create profile for new Supabase users (email/password login)
      if (!profile && user.email) {
        try {
          // First create User record if it doesn't exist
          let dbUser = await prisma.user.findUnique({
            where: { email: user.email.toLowerCase() }
          });

          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                email: user.email.toLowerCase(),
                name: user.user_metadata?.full_name || user.user_metadata?.name || null,
                image: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                emailVerified: new Date(),
              }
            });
            logger.info('[Auth] Created User for Supabase email/password user', {
              userId: dbUser.id,
              supabaseUserId: user.id
            });
          }

          // Parse name from metadata
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
          const nameParts = fullName.split(' ').filter((p: string) => p.length > 0);
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          // Determine role - test accounts get specific roles
          const emailLower = user.email.toLowerCase();
          let autoRole: string = 'client';
          if (emailLower === 'testpreparer@taxgeniuspro.tax') {
            autoRole = 'tax_preparer';
          } else if (emailLower === 'testaffiliate@taxgeniuspro.tax') {
            autoRole = 'affiliate';
          } else if (emailLower === 'testclient@taxgeniuspro.tax') {
            autoRole = 'client';
          } else if (emailLower === 'testadmin@taxgeniuspro.tax') {
            autoRole = 'admin';
          }

          // Create profile
          profile = await prisma.profile.create({
            data: {
              userId: dbUser.id,
              supabaseUserId: user.id,
              email: user.email.toLowerCase(),
              role: autoRole,
              firstName,
              lastName,
              affiliateStatus: 'APPROVED',
              affiliateApprovedAt: new Date(),
            },
            select: {
              id: true,
              role: true,
              isActive: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              supabaseUserId: true
            }
          });
          logger.info('[Auth] Created Profile for Supabase email/password user', {
            profileId: profile.id,
            supabaseUserId: user.id
          });
        } catch (createError) {
          logger.error('[Auth] Failed to auto-create profile:', createError);
        }
      } else if (profile && !profile.supabaseUserId) {
        // Update existing profile with supabaseUserId if missing
        try {
          await prisma.profile.update({
            where: { id: profile.id },
            data: { supabaseUserId: user.id }
          });
          logger.info('[Auth] Updated profile with supabaseUserId', {
            profileId: profile.id,
            supabaseUserId: user.id
          });
        } catch (updateError) {
          logger.error('[Auth] Failed to update profile with supabaseUserId:', updateError);
        }
      }

      if (profile) {
        role = profile.role;
        name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || null;
        image = profile.avatarUrl || null;
      }
    } catch (error) {
      logger.error('Failed to fetch profile for role:', error);
    }

    // Fallback to Supabase user metadata
    if (!name) {
      name = user.user_metadata?.full_name || user.user_metadata?.name || null;
    }
    if (!image) {
      image = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
    }

    return {
      user: {
        id: user.id,
        email: user.email || '',
        name,
        image,
        role,
        isActive: true,
      },
    };
  } catch (error) {
    logger.error('Error in auth():', error);
    return null;
  }
}

/**
 * Get the current user session
 * @returns Session object or null if not authenticated
 */
export async function getSession() {
  return auth();
}

/**
 * Get the authenticated user
 * @returns User object or null if not authenticated
 */
export async function getAuthenticatedUser() {
  const session = await auth();
  return session?.user || null;
}

/**
 * Get the current user's role
 * @returns User role or null if not authenticated
 */
export async function getUserRole(): Promise<UserRole | null> {
  const session = await auth();
  return session?.user?.role || null;
}

/**
 * Check if current user has a specific role
 * @param role - Role to check
 * @returns True if user has the role
 */
export async function hasRole(role: UserRole | string): Promise<boolean> {
  const userRole = await getUserRole();
  // Normalize roles to lowercase for consistency
  const normalizedRole = typeof role === 'string' ? role.toLowerCase() : role;
  const normalizedUserRole = userRole?.toString().toLowerCase();
  return normalizedUserRole === normalizedRole;
}

/**
 * Check if current user is an admin
 * Admin is the highest privilege role in the system
 * @returns True if user has 'admin' role
 */
export async function isAdmin(): Promise<boolean> {
  const userRole = await getUserRole();
  return userRole === 'admin';
}

/**
 * Alias for isAdmin() - kept for backwards compatibility
 * @returns True if user has 'admin' role
 * @deprecated Use isAdmin() instead
 */
export async function isSuperAdmin(): Promise<boolean> {
  return isAdmin();
}

/**
 * Require authentication - throws if not authenticated
 * @returns Authenticated user
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session.user;
}

/**
 * Require specific role - throws if user doesn't have the role
 * @param requiredRole - Required role
 * @returns Authenticated user with role
 */
export async function requireRole(requiredRole: UserRole | string) {
  const user = await requireAuth();
  const normalizedRequired = typeof requiredRole === 'string' ? requiredRole.toLowerCase() : requiredRole;

  const userRole = user.role || 'client';
  const normalizedUserRole = userRole.toString().toLowerCase();

  if (normalizedUserRole !== normalizedRequired) {
    throw new Error('Insufficient permissions');
  }

  return { user, role: userRole };
}

/**
 * Require one of multiple roles - throws if user doesn't have any of the specified roles
 * @param allowedRoles - Array of allowed roles
 * @returns Authenticated user with role
 */
export async function requireOneOfRoles(allowedRoles: (UserRole | string)[]) {
  const user = await requireAuth();

  const userRole = user.role || 'client';
  const normalizedUserRole = userRole.toString().toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map(r =>
    typeof r === 'string' ? r.toLowerCase() : r
  );

  if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
    throw new Error('Insufficient permissions');
  }

  // Fetch actual profile.id from database
  const profile = await prisma.profile.findFirst({
    where: {
      OR: [
        { userId: user.id },
        { supabaseUserId: user.id }
      ]
    },
    select: { id: true },
  });

  return { user, role: userRole, profile: { id: profile?.id ?? user.id } };
}

/**
 * Validate request and return user
 * @returns Object with user or null
 */
export async function validateRequest() {
  const session = await auth();
  if (!session?.user) {
    return { user: null };
  }
  return { user: session.user };
}

/**
 * Get the dashboard URL based on user role
 * @param role - User role
 * @returns Dashboard URL for the role
 */
export function getDashboardUrl(role: UserRole | string): string {
  const normalizedRole = typeof role === 'string' ? role.toLowerCase() : role;

  const dashboardUrls: Record<string, string> = {
    admin: '/dashboard/admin',
    client: '/dashboard/client',
    tax_preparer: '/dashboard/tax-preparer',
    affiliate: '/dashboard/affiliate/analytics',
  };

  return dashboardUrls[normalizedRole] || '/dashboard/client';
}

/**
 * Check if user has access to the store
 * Tax preparers and admins can access the store
 * @returns True if user has store access
 */
export async function hasStoreAccess(): Promise<boolean> {
  const userRole = await getUserRole();
  return userRole === 'tax_preparer' || userRole === 'admin';
}

/**
 * Update user role (admin only)
 * This updates the role in our database profile
 * @param userId - User ID (Supabase user ID)
 * @param role - Role to assign
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const currentUser = await requireAuth();
  if (currentUser.role !== 'admin') {
    throw new Error('Only admins can update user roles');
  }

  // Update role in profile
  await prisma.profile.updateMany({
    where: {
      OR: [
        { userId },
        { supabaseUserId: userId }
      ]
    },
    data: { role },
  });
}

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password against a hash
 * @param password - Plain text password
 * @param hash - Hashed password
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Legacy exports for backwards compatibility
export const handlers = {};
export const signIn = async () => { throw new Error('Use Supabase auth instead'); };
export const signOut = async () => { throw new Error('Use Supabase auth instead'); };
