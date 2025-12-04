import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { UserRole } from '@prisma/client';

/**
 * RESTRICTED ENDPOINT: Set current user's role
 * SUPER_ADMIN ONLY
 *
 * This endpoint is restricted to super_admin for testing purposes only.
 */
export async function POST(request: Request) {
  try {
    // Get current authenticated user
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is super admin
    const currentRole = session?.user?.role;

    // Only SUPER_ADMIN can use this endpoint
    if (currentRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Only super admins can use this endpoint' },
        { status: 403 }
      );
    }

    // Get the role to set from request body
    const body = await request.json();
    const roleInput = body.role?.toUpperCase() || 'ADMIN'; // Default to ADMIN

    // Validate role
    const validRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'LEAD', 'CLIENT', 'TAX_PREPARER', 'AFFILIATE'];
    if (!validRoles.includes(roleInput as UserRole)) {
      return NextResponse.json(
        {
          error:
            'Invalid role. Must be: SUPER_ADMIN, ADMIN, LEAD, CLIENT, TAX_PREPARER, or AFFILIATE',
        },
        { status: 400 }
      );
    }

    const role = roleInput as UserRole;

    // Update user profile in database
    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        role,
        firstName: session.user.name?.split(' ')[0] || '',
        lastName: session.user.name?.split(' ').slice(1).join(' ') || '',
      },
      update: {
        role,
      },
    });

    logger.info(`✅ Role set to ${role} for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: `Role set to '${role}' for user ${userId}`,
      userId: userId,
      role: role,
      note: 'You must sign out and sign back in for changes to take effect.',
    });
  } catch (error) {
    logger.error('Error setting user role:', error);
    return NextResponse.json(
      {
        error: 'Failed to update user role',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Check current user's role
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user profile from database
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    const currentRole = profile?.role || 'LEAD';

    return NextResponse.json({
      userId: userId,
      email: profile?.user.email || session.user.email,
      name: profile?.user.name || session.user.name,
      currentRole: currentRole,
      profile: {
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        trackingCode: profile?.trackingCode,
      },
    });
  } catch (error) {
    logger.error('Error getting user role:', error);
    return NextResponse.json({ error: 'Failed to get user role' }, { status: 500 });
  }
}
