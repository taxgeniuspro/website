/**
 * Admin User Check API Route
 * Checks if a user exists and their credential status
 * Admin only endpoint
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    const currentUser = session?.user;

    // Allow if admin OR if using a special admin key for initial setup
    const adminKey = req.headers.get('x-admin-key');
    const envKey = process.env.ADMIN_SETUP_KEY;
    const isAdminKey = adminKey && envKey && adminKey === envKey;

    if (!isAdminKey && (!currentUser || !['admin', 'super_admin'].includes(currentUser.role as string))) {
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
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        hashedPassword: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            id: true,
            role: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        accounts: {
          select: {
            provider: true,
            providerAccountId: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({
        found: false,
        message: 'User not found with this email',
      });
    }

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
        profile: user.profile,
        oauthProviders: user.accounts.map(a => a.provider),
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
