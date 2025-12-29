/**
 * Linked Accounts API Endpoint
 *
 * GET /api/auth/linked-accounts
 *
 * Returns list of OAuth providers linked to the current user's account.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';

// Local TypeScript interfaces (replaces @prisma/client types)
interface Account {
  provider: string;
  providerAccountId: string;
  createdAt: Date;
}

interface User {
  hashedPassword: string | null;
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: accountsData } = await db
    .from('accounts')
    .select('provider, providerAccountId, createdAt')
    .eq('userId', session.user.id);

  const accounts = (accountsData || []) as Account[];

  // Check if user has a password set (for determining if unlinking is safe)
  const { data: usersData } = await db
    .from('users')
    .select('hashedPassword')
    .eq('id', session.user.id)
    .limit(1);

  const user = firstOrNull<User>(usersData);

  return NextResponse.json({
    accounts,
    hasPassword: !!user?.hashedPassword,
  });
}
