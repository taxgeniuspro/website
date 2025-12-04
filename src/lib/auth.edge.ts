/**
 * Edge-compatible NextAuth configuration
 * This file exports only what's needed for middleware (session verification)
 * without importing heavy dependencies like bcrypt and prisma
 */
import NextAuth from 'next-auth';

// Minimal auth config for Edge Runtime - session verification only
export const { auth } = NextAuth({
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify',
    newUser: '/auth/select-role',
  },
  // Empty providers array - we only need session verification in Edge
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as any).role;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
});
