/**
 * Linked Accounts API Endpoint
 *
 * GET /api/auth/linked-accounts
 *
 * Returns list of OAuth providers linked to the current user's account.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    select: {
      provider: true,
      providerAccountId: true,
      createdAt: true,
    },
  });

  // Check if user has a password set (for determining if unlinking is safe)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hashedPassword: true },
  });

  return NextResponse.json({
    accounts,
    hasPassword: !!user?.hashedPassword,
  });
}
