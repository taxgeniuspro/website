import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole, UserPermissions } from '@/lib/permissions';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Check if the current user is a super admin
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = user?.role === 'super_admin';

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only super admins can manage permissions' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { userId, role, permissions } = body as {
      userId: string;
      role: UserRole;
      permissions: Partial<UserPermissions>;
    };

    if (!role) {
      return NextResponse.json({ error: 'Missing required field: role' }, { status: 400 });
    }

    // Handle default permissions update (for all admin users)
    if (userId === 'default') {
      // Update all admin users with the new default permissions
      const adminProfiles = await prisma.profile.findMany({
        where: { role: 'admin' },
        take: 100,
      });

      await prisma.profile.updateMany({
        where: { role: 'admin' },
        data: {
          customPermissions: permissions as any,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Updated permissions for ${adminProfiles.length} admin users`,
        affectedUsers: adminProfiles.length,
      });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Missing required field: userId' }, { status: 400 });
    }

    // Validate role
    const validRoles: UserRole[] = [
      'super_admin',
      'admin',
      'lead',
      'tax_preparer',
      'affiliate',
      'client',
    ];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    // Prevent super admin from demoting themselves
    if (userId === user.id && role !== 'super_admin') {
      return NextResponse.json(
        { error: 'You cannot change your own role from super admin' },
        { status: 400 }
      );
    }

    // Update role and permissions in Clerk
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: role,
        permissions: permissions,
      },
    });

    // Get updated user info for response
    const targetUser = await client.users.getUser(userId);

    return NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        email: targetUser.emailAddresses[0]?.emailAddress,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        role: targetUser.publicMetadata?.role,
        permissions: targetUser.publicMetadata?.permissions,
      },
    });
  } catch (error) {
    logger.error('Error updating user permissions:', error);
    return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if the current user is a super admin
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = user?.role === 'super_admin';

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only super admins can view permissions' },
        { status: 403 }
      );
    }

    // Get userId from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
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

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return user's current role and permissions
    return NextResponse.json({
      user: {
        id: userId,
        email: profile.user.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        role: profile.role,
        permissions: profile.customPermissions || {},
      },
    });
  } catch (error) {
    logger.error('Error fetching user permissions:', error);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}
