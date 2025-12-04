/**
 * NextAuth.js v5 Configuration
 * Complete authentication system for Tax Genius Pro
 *
 * Supports:
 * - Google OAuth (Gmail login)
 * - Magic Link (Email-based passwordless login)
 * - Credentials (Email/Password)
 */
import NextAuth, { type DefaultSession, type User as NextAuthUser } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

// Extend NextAuth types to include our custom role field
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      email: string;
      name?: string | null;
      image?: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    role: UserRole;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true, // Trust the host in production (required for NextAuth v5)
  session: {
    strategy: 'jwt', // Use JWT for faster session checks
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify', // Magic link verification page
    newUser: '/auth/select-role', // Redirect new users to select their role
  },
  providers: [
    // Google OAuth Provider (Gmail Login)
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true, // Allow linking accounts with same email
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),

    // Magic Link Provider (Email-based passwordless login)
    Resend({
      apiKey: process.env.RESEND_API_KEY || '',
      from: process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax',
    }),

    // Credentials Provider (Email/Password)
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing email or password');
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            profile: true, // Include profile to get role
          },
        });

        if (!user || !user.hashedPassword) {
          throw new Error('Invalid email or password');
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );

        if (!isValidPassword) {
          throw new Error('Invalid email or password');
        }

        // Return user with role from profile
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.profile?.role || 'lead', // Default to lead if no profile
        } as NextAuthUser & { role: UserRole };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in - add user data to token
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // Handle session updates (when user.update() is called)
      if (trigger === 'update' && session) {
        token.role = session.role;
      }

      // Note: We don't fetch role from DB on every request because JWT callback
      // runs on Edge Runtime which doesn't support Prisma. Role is set on initial
      // sign-in and can be updated using the 'update' trigger if needed.

      return token;
    },
    async session({ session, token }) {
      // Add user ID and role to session
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }

      return session;
    },
  },
  events: {
    async signIn({ user, isNewUser }) {
      // Log sign in events
      console.log(`User signed in: ${user.email} (${user.id})`);

      // If new user, create a profile with default client role
      // (Note: tax_preparer and affiliate roles require manual admin upgrade)
      if (isNewUser) {
        // Parse name into firstName, middleName, lastName
        const nameParts = user.name?.split(' ').filter(part => part.length > 0) || [];
        let firstName = '';
        let middleName: string | undefined;
        let lastName = '';

        if (nameParts.length === 1) {
          // Only first name
          firstName = nameParts[0];
        } else if (nameParts.length === 2) {
          // First and last name only
          firstName = nameParts[0];
          lastName = nameParts[1];
        } else if (nameParts.length >= 3) {
          // First, middle, and last name
          firstName = nameParts[0];
          // Take all middle parts except the last one as middle name
          middleName = nameParts.slice(1, -1).join(' ');
          lastName = nameParts[nameParts.length - 1];
        }

        await prisma.profile.create({
          data: {
            userId: user.id,
            role: 'client',
            firstName,
            middleName,
            lastName,
          },
        });
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
});

/**
 * User role types for Tax Genius platform
 * @deprecated Use UserRole from @prisma/client instead
 */
export type UserRoleType = 'SUPER_ADMIN' | 'ADMIN' | 'LEAD' | 'CLIENT' | 'TAX_PREPARER' | 'AFFILIATE';

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
 * Check if current user is a super admin
 * @returns True if user is super_admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const userRole = await getUserRole();
  return userRole === 'super_admin';
}

/**
 * Check if current user is an admin (includes super_admin)
 * @returns True if user is admin or super_admin
 */
export async function isAdmin(): Promise<boolean> {
  const userRole = await getUserRole();
  return userRole === 'admin' || userRole === 'super_admin';
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
  const normalizedUserRole = user.role.toString().toLowerCase();

  if (normalizedUserRole !== normalizedRequired) {
    throw new Error('Insufficient permissions');
  }

  return { user, role: user.role };
}

/**
 * Require one of multiple roles - throws if user doesn't have any of the specified roles
 * @param allowedRoles - Array of allowed roles
 * @returns Authenticated user with role
 */
export async function requireOneOfRoles(allowedRoles: (UserRole | string)[]) {
  const user = await requireAuth();
  const normalizedUserRole = user.role.toString().toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map(r =>
    typeof r === 'string' ? r.toLowerCase() : r
  );

  if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
    throw new Error('Insufficient permissions');
  }

  return { user, role: user.role, profile: { id: user.id } };
}

/**
 * Validate request and return user (for backward compatibility with old Clerk code)
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
    super_admin: '/dashboard/admin',
    admin: '/dashboard/admin',
    lead: '/dashboard/lead',
    client: '/dashboard/client',
    tax_preparer: '/dashboard/tax-preparer',
    affiliate: '/dashboard/affiliate',
  };

  return dashboardUrls[normalizedRole] || '/dashboard/lead';
}

/**
 * Check if user has access to the store
 * Tax preparers, affiliates, admins, and super admins can access the store
 * @returns True if user has store access
 */
export async function hasStoreAccess(): Promise<boolean> {
  const userRole = await getUserRole();
  return (
    userRole === 'tax_preparer' ||
    userRole === 'affiliate' ||
    userRole === 'admin' ||
    userRole === 'super_admin'
  );
}

/**
 * Update user role (admin only)
 * This should be called server-side only by admins
 * @param userId - User ID
 * @param role - Role to assign
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  // Verify admin permissions
  const currentUser = await requireAuth();
  if (currentUser.role !== 'super_admin' && currentUser.role !== 'admin') {
    throw new Error('Only admins can update user roles');
  }

  // Update role in profile
  await prisma.profile.update({
    where: { userId },
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
