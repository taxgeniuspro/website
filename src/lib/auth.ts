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
import { logger } from '@/lib/logger';
import { assignTrackingCodeToUser } from '@/lib/services/tracking-code.service';

// Extend NextAuth types to include our custom role field
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      email: string;
      name?: string | null;
      image?: string | null;
      isActive?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    role: UserRole;
    isActive?: boolean;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    isActive?: boolean;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
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
    newUser: '/dashboard/client', // New users go directly to client dashboard (role is auto-assigned)
  },
  providers: [
    // Google OAuth Provider (Gmail Login)
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      // Allow NextAuth to link Google accounts to existing users with same email
      // This is SAFE because Google verifies email ownership
      // Database constraint @@unique([userId, provider]) prevents duplicates
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
      // Profile callback - ensure we get the email correctly
      profile(profile) {
        return {
          id: profile.sub, // Use Google's sub (subject) as the user ID
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: 'client' as UserRole, // Default role for new OAuth users
        };
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
          where: { email: (credentials.email as string).toLowerCase() },
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

        // Check if user is deactivated
        if (user.profile?.isActive === false) {
          throw new Error('Account suspended');
        }

        // Return user with role from profile
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.profile?.role || 'client', // Default to client if no profile
          isActive: user.profile?.isActive ?? true,
        } as NextAuthUser & { role: UserRole; isActive?: boolean };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // ============================================================
      // SIMPLIFIED GOOGLE OAUTH HANDLING
      // Let NextAuth/PrismaAdapter handle user creation naturally
      // We only check for suspended accounts here
      // ============================================================
      if (account?.provider === 'google' && user?.email) {
        try {
          // Check if user exists and is suspended
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email.toLowerCase() },
            include: { profile: { select: { isActive: true, role: true } } },
          });

          if (existingUser?.profile?.isActive === false) {
            logger.warn('Suspended user attempted Google OAuth', { email: user.email });
            return '/suspended';
          }

          // If user exists, attach their role for the session
          if (existingUser?.profile?.role) {
            (user as NextAuthUser & { role: UserRole; isActive?: boolean }).role = existingUser.profile.role;
            (user as NextAuthUser & { role: UserRole; isActive?: boolean }).isActive = existingUser.profile.isActive ?? true;
          } else {
            // New user - will get client role in events.signIn
            (user as NextAuthUser & { role: UserRole; isActive?: boolean }).role = 'client';
            (user as NextAuthUser & { role: UserRole; isActive?: boolean }).isActive = true;
          }

          // Let NextAuth/PrismaAdapter handle user creation and account linking
          return true;
        } catch (error: any) {
          logger.error('Google OAuth error', {
            message: error?.message,
            code: error?.code,
            email: user?.email,
          });
          // Return true anyway - let NextAuth try to handle it
          // The events.signIn will create profile if needed
          return true;
        }
      }

      // Check if user is deactivated (for non-Google login types)
      if (user?.id && account?.provider !== 'google') {
        try {
          let profile = await prisma.profile.findUnique({
            where: { userId: user.id },
            select: { role: true, isActive: true },
          });

          // If no profile exists, create one (edge case recovery)
          if (!profile) {
            logger.warn('User without profile detected, creating default profile', { userId: user.id, email: user.email });
            profile = await prisma.profile.create({
              data: {
                userId: user.id,
                role: 'client',
                affiliateStatus: 'APPROVED',
                affiliateApprovedAt: new Date(),
              },
              select: { role: true, isActive: true },
            });
          }

          // Block deactivated users from signing in
          if (profile && profile.isActive === false) {
            logger.warn('Deactivated user attempted to sign in', { userId: user.id, email: user.email });
            return '/suspended';
          }
        } catch (error) {
          logger.error('Failed to fetch user profile during sign-in', { error, userId: user.id });
        }
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // Initial sign in - add user data to token
      if (user) {
        token.id = user.id;
        token.role = user.role || 'client'; // Default to 'client' if role not set
        token.isActive = user.isActive ?? true;
      }

      // Handle session updates (when user.update() is called)
      if (trigger === 'update' && session) {
        token.role = session.role;
        if (session.isActive !== undefined) {
          token.isActive = session.isActive;
        }
      }

      // IMPORTANT: Always refresh role from database to catch admin changes
      // This ensures users see updated permissions immediately after admin changes their role
      if (token.id) {
        try {
          // Use raw query to ensure we get the role as a plain string
          // This bypasses any Prisma enum caching issues
          const profiles = await prisma.$queryRaw<{ role: string }[]>`
            SELECT role::text as role
            FROM profiles
            WHERE "userId" = ${token.id as string}
            LIMIT 1
          `;

          const profile = profiles[0];
          if (profile?.role) {
            // Force the role to be a plain string
            token.role = profile.role as UserRole;
            logger.debug('JWT role refreshed from database', {
              userId: token.id,
              newRole: profile.role
            });
          }
        } catch (error) {
          // Keep existing token values on error
          logger.error('Failed to refresh user profile in JWT callback', { error, userId: token.id });
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Add user ID, role, and isActive status to session
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.isActive = token.isActive ?? true;
      }

      return session;
    },
  },
  events: {
    async signIn({ user, isNewUser }) {
      // Log sign in events
      logger.info('User signed in', { email: user.email, userId: user.id });

      // If new user, create a profile with default client role
      // (Note: tax_preparer and affiliate roles require manual admin upgrade)
      if (isNewUser) {
        try {
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

          // Use upsert to handle race conditions - if profile already exists, don't update
          const profile = await prisma.profile.upsert({
            where: { userId: user.id },
            update: {}, // Don't update if exists (handles race condition)
            create: {
              userId: user.id,
              role: 'client',
              firstName,
              middleName,
              lastName,
              affiliateStatus: 'APPROVED',
              affiliateApprovedAt: new Date(),
            },
          });

          logger.info('Created profile for new OAuth user', { userId: user.id, profileId: profile.id, firstName, lastName });

          // Assign tracking code and auto-generate referral links
          try {
            await assignTrackingCodeToUser(profile.id);
            logger.info('Assigned tracking code to new OAuth user', { userId: user.id, profileId: profile.id });
          } catch (trackingError) {
            // Log but don't block signup
            logger.error('Failed to assign tracking code to OAuth user', { error: trackingError, userId: user.id });
          }
        } catch (profileError) {
          // Log profile creation failure - critical issue
          logger.error('Failed to create profile for new OAuth user', { error: profileError, userId: user.id, email: user.email });
        }
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
 * Check if current user is an admin
 * Admin is the highest privilege role in the system
 * Valid roles: admin, client, tax_preparer
 * @returns True if user has 'admin' role
 */
export async function isAdmin(): Promise<boolean> {
  const userRole = await getUserRole();
  return userRole === 'admin';
}

/**
 * Alias for isAdmin() - kept for backwards compatibility
 * Note: There is no separate 'super_admin' role in the system
 * 'admin' is the highest privilege level
 * @returns True if user has 'admin' role
 * @deprecated Use isAdmin() instead - this function name is misleading
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

  // Defensive check - if role is not set, default to 'client'
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

  // Defensive check - if role is not set, default to 'client'
  const userRole = user.role || 'client';
  const normalizedUserRole = userRole.toString().toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map(r =>
    typeof r === 'string' ? r.toLowerCase() : r
  );

  if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
    throw new Error('Insufficient permissions');
  }

  // Fetch actual profile.id from database (user.id != profile.id)
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  return { user, role: userRole, profile: { id: profile?.id ?? user.id } };
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

  // Only 3 valid roles: admin, client, tax_preparer
  const dashboardUrls: Record<string, string> = {
    admin: '/dashboard/admin',
    client: '/dashboard/client',
    tax_preparer: '/dashboard/tax-preparer',
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
 * This should be called server-side only by admins
 * @param userId - User ID
 * @param role - Role to assign
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  // Verify admin permissions
  const currentUser = await requireAuth();
  if (currentUser.role !== 'admin') {
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
