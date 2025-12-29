/**
 * Unlink Account API Endpoint
 *
 * DELETE /api/auth/linked-accounts/:provider
 *
 * Unlinks an OAuth provider from the current user's account.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local TypeScript interfaces (replaces @prisma/client types)
interface User {
  id: string;
  email: string | null;
  hashedPassword: string | null;
}

interface Account {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const session = await auth();
  const { provider } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;

  // Validate provider
  const validProviders = ['google', 'resend'];
  if (!validProviders.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  try {
    // Check if user has a password or other auth methods
    const { data: usersData } = await db
      .from('users')
      .select('id, email, hashedPassword')
      .eq('id', userId)
      .limit(1);

    const user = firstOrNull<User>(usersData);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's linked accounts
    const { data: accountsData } = await db
      .from('accounts')
      .select('*')
      .eq('userId', userId);

    const accounts = (accountsData || []) as Account[];

    // Check if the account to unlink exists
    const accountToUnlink = accounts.find((a) => a.provider === provider);
    if (!accountToUnlink) {
      return NextResponse.json(
        { error: `No ${provider} account linked` },
        { status: 400 }
      );
    }

    // Prevent unlinking if it's the only auth method
    const hasPassword = !!user.hashedPassword;
    const otherProviders = accounts.filter((a) => a.provider !== provider);

    if (!hasPassword && otherProviders.length === 0) {
      return NextResponse.json(
        {
          error:
            'Cannot unlink. This is your only sign-in method. Please set a password first.',
        },
        { status: 400 }
      );
    }

    // Delete the account link
    const { error: deleteError } = await db
      .from('accounts')
      .delete()
      .eq('userId', userId)
      .eq('provider', provider);

    if (deleteError) {
      logger.error('Error unlinking account', { error: deleteError.message, userId, provider });
      return NextResponse.json(
        { error: 'Failed to unlink account' },
        { status: 500 }
      );
    }

    logger.info('Account unlinked successfully', { userId, provider });

    return NextResponse.json({
      success: true,
      message: `${provider} account unlinked successfully`,
    });
  } catch (error) {
    logger.error('Error unlinking account', { error, userId, provider });
    return NextResponse.json(
      { error: 'Failed to unlink account' },
      { status: 500 }
    );
  }
}
