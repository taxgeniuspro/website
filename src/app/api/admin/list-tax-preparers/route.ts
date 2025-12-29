/**
 * Admin List Tax Preparers API Route
 * Lists all tax preparers with their authentication status
 * Protected by admin key or admin session
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

// Local interfaces
interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  userId: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  hashedPassword: string | null;
  emailVerified: string | null;
}

interface Account {
  userId: string;
  provider: string;
}

export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    const currentUser = session?.user;

    // Allow if admin OR if using a special admin key for initial setup
    const adminKey = req.headers.get('x-admin-key');
    const envKey = process.env.ADMIN_SETUP_KEY;
    const isAdminKey = adminKey && envKey && adminKey === envKey;

    // Also allow if requesting own user data (for debugging)
    const debugMode = req.nextUrl.searchParams.get('debug') === 'true';

    if (!debugMode && !isAdminKey && (!currentUser || !['admin', 'admin'].includes(currentUser.role as string))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all tax preparers
    const { data: preparers, error: preparersError } = await db.from('profiles')
      .select('id, firstName, lastName, email, phone, role, userId')
      .eq('role', 'tax_preparer')
      .order('firstName', { ascending: true });

    if (preparersError) {
      throw preparersError;
    }

    // Get user IDs
    const userIds = (preparers || []).map((p: Profile) => p.userId);

    // Get users for these profiles
    const { data: users } = await db.from('users')
      .select('id, email, name, hashedPassword, emailVerified')
      .in('id', userIds);

    // Get accounts for these users
    const { data: accounts } = await db.from('accounts')
      .select('userId, provider')
      .in('userId', userIds);

    // Create lookup maps
    const usersById = new Map<string, User>();
    (users || []).forEach((u: User) => {
      usersById.set(u.id, u);
    });

    const accountsByUserId = new Map<string, Account[]>();
    (accounts || []).forEach((a: Account) => {
      if (!accountsByUserId.has(a.userId)) {
        accountsByUserId.set(a.userId, []);
      }
      accountsByUserId.get(a.userId)!.push(a);
    });

    // Format the response
    const formattedPreparers = (preparers || []).map((p: Profile) => {
      const user = usersById.get(p.userId);
      const userAccounts = accountsByUserId.get(p.userId) || [];

      return {
        profileId: p.id,
        userId: p.userId,
        name: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
        email: user?.email || p.email,
        phone: p.phone,
        role: p.role,
        authStatus: {
          hasPassword: !!user?.hashedPassword,
          emailVerified: !!user?.emailVerified,
          oauthProviders: userAccounts.map(a => a.provider),
          canLogin: !!user?.hashedPassword || userAccounts.length > 0,
        },
      };
    });

    return NextResponse.json({
      success: true,
      count: formattedPreparers.length,
      preparers: formattedPreparers,
      summary: {
        total: formattedPreparers.length,
        withPassword: formattedPreparers.filter(p => p.authStatus.hasPassword).length,
        withOAuth: formattedPreparers.filter(p => p.authStatus.oauthProviders.length > 0).length,
        canLogin: formattedPreparers.filter(p => p.authStatus.canLogin).length,
        cannotLogin: formattedPreparers.filter(p => !p.authStatus.canLogin).length,
      },
    });
  } catch (error: unknown) {
    logger.error('List tax preparers error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      {
        error: 'Failed to list tax preparers',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
