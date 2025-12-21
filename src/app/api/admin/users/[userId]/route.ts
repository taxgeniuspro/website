import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { UserRole, UserPermissions } from '@/lib/permissions';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    const currentUser = session?.user;

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = currentUser?.role as string;
    const isSuperAdmin = role === 'admin';
    const isAdmin = role === 'admin' || isSuperAdmin;

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { userId } = await params;
    const body = await req.json();
    const { email, firstName, lastName, role: newRole, permissions, isActive } = body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent non-super-admins from editing super admins or creating super admins
    if (!isSuperAdmin) {
      if (existingUser.profile?.role === 'admin') {
        return NextResponse.json(
          { error: 'Only super admins can edit super admin accounts' },
          { status: 403 }
        );
      }
      if (newRole === 'admin') {
        return NextResponse.json(
          { error: 'Only super admins can create super admin accounts' },
          { status: 403 }
        );
      }
    }

    // Prevent admin from demoting themselves (would lock them out)
    if (currentUser.id === userId && existingUser.profile?.role === 'admin' && newRole && newRole !== 'admin') {
      return NextResponse.json(
        { error: 'You cannot demote yourself from admin. Ask another admin to do this.' },
        { status: 400 }
      );
    }

    // Update user email if provided
    if (email && email !== existingUser.email) {
      // Check if email is already taken
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists && emailExists.id !== userId) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { email },
      });
    }

    // Update profile information
    const profileData: any = {};

    if (firstName !== undefined) profileData.firstName = firstName;
    if (lastName !== undefined) profileData.lastName = lastName;
    if (newRole !== undefined) profileData.role = newRole;
    if (permissions !== undefined) profileData.customPermissions = permissions;

    // Handle user activation/deactivation
    if (isActive !== undefined) {
      const wasActive = existingUser.profile?.isActive ?? true;

      if (isActive !== wasActive) {
        profileData.isActive = isActive;

        if (!isActive) {
          // Deactivating user
          profileData.deactivatedAt = new Date();
          profileData.deactivatedBy = currentUser.id;
          logger.info('User deactivated', {
            userId,
            deactivatedBy: currentUser.id,
          });
        } else {
          // Reactivating user
          profileData.deactivatedAt = null;
          profileData.deactivatedBy = null;
          logger.info('User reactivated', {
            userId,
            reactivatedBy: currentUser.id,
          });
        }
      }
    }

    // Use upsert to handle cases where profile might not exist
    const updatedProfile = await prisma.profile.upsert({
      where: { userId },
      update: profileData,
      create: {
        userId,
        role: newRole || 'client',
        firstName: firstName || '',
        lastName: lastName || '',
        isActive: isActive ?? true,
        ...profileData,
      },
    });

    // Fetch updated user with profile
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    logger.info('User updated', {
      userId,
      updatedBy: currentUser.id,
      changes: { email, firstName, lastName, role: newRole, isActive },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        firstName: updatedUser!.profile?.firstName,
        lastName: updatedUser!.profile?.lastName,
        role: updatedUser!.profile?.role,
        permissions: updatedUser!.profile?.customPermissions,
        isActive: updatedUser!.profile?.isActive ?? true,
        deactivatedAt: updatedUser!.profile?.deactivatedAt,
        deactivatedBy: updatedUser!.profile?.deactivatedBy,
      },
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
