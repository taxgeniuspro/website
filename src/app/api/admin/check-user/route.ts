/**
 * Admin User Check API Route
 * Checks if a user exists and their credential status
 * Admin only endpoint
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

// Local interfaces
interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: string | null;
  hashedPassword: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Profile {
  id: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
}

interface Account {
  provider: string;
  providerAccountId: string;
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

    if (!isAdminKey && (!currentUser || !['admin', 'admin'].includes(currentUser.role as string))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Find user (case-insensitive)
    const { data: userData, error: userError } = await db.from('users')
      .select('id, email, name, emailVerified, hashedPassword, createdAt, updatedAt')
      .ilike('email', email)
      .limit(1);

    if (userError) {
      throw userError;
    }

    const user = firstOrNull<User>(userData);

    if (!user) {
      return NextResponse.json({
        found: false,
        message: 'User not found with this email',
      });
    }

    // Get profile for this user
    const { data: profileData } = await db.from('profiles')
      .select('id, role, firstName, lastName, phone')
      .eq('userId', user.id)
      .limit(1);

    const profile = firstOrNull<Profile>(profileData);

    // Get accounts for this user
    const { data: accountsData } = await db.from('accounts')
      .select('provider, providerAccountId')
      .eq('userId', user.id);

    const accounts = (accountsData || []) as Account[];

    return NextResponse.json({
      found: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        hasPassword: !!user.hashedPassword,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile: profile,
        oauthProviders: accounts.map(a => a.provider),
      },
    });
  } catch (error) {
    logger.error('User check error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Failed to check user' },
      { status: 500 }
    );
  }
}
