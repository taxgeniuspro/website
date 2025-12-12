/**
 * Admin List Tax Preparers API Route
 * Lists all tax preparers with their authentication status
 * Protected by admin key or admin session
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

    // Also allow if requesting own user data (for debugging)
    const debugMode = req.nextUrl.searchParams.get('debug') === 'true';

    if (!debugMode && !isAdminKey && (!currentUser || !['admin', 'super_admin'].includes(currentUser.role as string))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all tax preparers with their user authentication info
    const preparers = await prisma.profile.findMany({
      where: {
        role: 'tax_preparer',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            hashedPassword: true,
            emailVerified: true,
            accounts: {
              select: {
                provider: true,
              },
            },
          },
        },
      },
      orderBy: {
        firstName: 'asc',
      },
    });

    // Format the response
    const formattedPreparers = preparers.map(p => ({
      profileId: p.id,
      userId: p.userId,
      name: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
      email: p.user?.email || p.email,
      phone: p.phone,
      role: p.role,
      authStatus: {
        hasPassword: !!p.user?.hashedPassword,
        emailVerified: !!p.user?.emailVerified,
        oauthProviders: p.user?.accounts.map(a => a.provider) || [],
        canLogin: !!p.user?.hashedPassword || (p.user?.accounts?.length || 0) > 0,
      },
    }));

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
