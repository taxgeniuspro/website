import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, UserPermissions } from '@/lib/permissions';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Check if the current user is an admin
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can manage permissions' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { userId, profileId, role, permissions } = body as {
      userId?: string;
      profileId?: string;
      role: UserRole;
      permissions: Partial<UserPermissions>;
    };

    if (!role) {
      return NextResponse.json({ error: 'Missing required field: role' }, { status: 400 });
    }

    // Handle default permissions update (for all users of a role)
    if (userId === 'default' || profileId === 'default') {
      // Update all users with this role
      const profiles = await prisma.profile.findMany({
        where: { role },
        select: { id: true },
      });

      await prisma.profile.updateMany({
        where: { role },
        data: {
          customPermissions: permissions as any,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Updated permissions for ${profiles.length} ${role} users`,
        affectedUsers: profiles.length,
      });
    }

    // Either userId or profileId is required for individual updates
    const targetId = profileId || userId;
    if (!targetId) {
      return NextResponse.json(
        { error: 'Missing required field: userId or profileId' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: UserRole[] = [
      'admin',
      'lead',
      'tax_preparer',
      'affiliate',
      'client',
    ];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    // Find the target profile
    const targetProfile = await prisma.profile.findFirst({
      where: profileId ? { id: profileId } : { userId: targetId },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    if (!targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent admin from demoting themselves
    if (targetProfile.userId === user.id && role !== 'admin') {
      return NextResponse.json(
        { error: 'You cannot change your own role from admin' },
        { status: 400 }
      );
    }

    // Update role and permissions in database
    const updatedProfile = await prisma.profile.update({
      where: { id: targetProfile.id },
      data: {
        role,
        customPermissions: permissions as any,
      },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedProfile.id,
        userId: updatedProfile.userId,
        email: updatedProfile.user.email,
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        role: updatedProfile.role,
        permissions: updatedProfile.customPermissions,
      },
    });
  } catch (error) {
    logger.error('Error updating user permissions:', error);
    return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if the current user is an admin
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can view permissions' },
        { status: 403 }
      );
    }

    // Get userId or profileId from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const profileId = searchParams.get('profileId');

    if (!userId && !profileId) {
      return NextResponse.json({ error: 'User ID or Profile ID is required' }, { status: 400 });
    }

    // Get user profile from database
    const profile = await prisma.profile.findFirst({
      where: profileId ? { id: profileId } : { userId: userId! },
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
        id: profile.id,
        userId: profile.userId,
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
