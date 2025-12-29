import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { UserRole, UserPermissions } from '@/lib/permissions';

// Local interfaces
interface User {
  id: string;
  email: string;
  name: string | null;
}

interface Profile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  affiliateStatus: string | null;
  deactivatedAt: string | null;
  deactivatedBy: string | null;
  customPermissions: any;
}

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
    const { email, firstName, lastName, role: newRole, permissions, isActive, affiliateStatus } = body;

    // Check if user exists
    const { data: existingUserData, error: userError } = await db.from('users')
      .select('id, email, name')
      .eq('id', userId)
      .limit(1);

    if (userError) {
      throw userError;
    }

    const existingUser = firstOrNull<User>(existingUserData);

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's profile
    const { data: profileData } = await db.from('profiles')
      .select('*')
      .eq('userId', userId)
      .limit(1);

    const existingProfile = firstOrNull<Profile>(profileData);

    // Prevent non-super-admins from editing super admins or creating super admins
    if (!isSuperAdmin) {
      if (existingProfile?.role === 'admin') {
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
    if (currentUser.id === userId && existingProfile?.role === 'admin' && newRole && newRole !== 'admin') {
      return NextResponse.json(
        { error: 'You cannot demote yourself from admin. Ask another admin to do this.' },
        { status: 400 }
      );
    }

    // Update user email if provided
    if (email && email !== existingUser.email) {
      // Check if email is already taken
      const { data: emailExists } = await db.from('users')
        .select('id')
        .eq('email', email)
        .limit(1);

      if (emailExists && emailExists.length > 0 && emailExists[0].id !== userId) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }

      await db.from('users')
        .update({ email })
        .eq('id', userId);
    }

    // Update profile information
    // Note: permissions are role-based (from RolePermissionTemplate), not stored per-user
    const updateProfileData: Record<string, any> = {};

    if (firstName !== undefined) updateProfileData.firstName = firstName;
    if (lastName !== undefined) updateProfileData.lastName = lastName;
    if (newRole !== undefined) updateProfileData.role = newRole;
    if (affiliateStatus !== undefined) updateProfileData.affiliateStatus = affiliateStatus;
    // Permissions are not stored in Profile - they come from the role's default permissions

    // Handle user activation/deactivation
    if (isActive !== undefined) {
      const wasActive = existingProfile?.isActive ?? true;

      if (isActive !== wasActive) {
        updateProfileData.isActive = isActive;

        if (!isActive) {
          // Deactivating user
          updateProfileData.deactivatedAt = new Date().toISOString();
          updateProfileData.deactivatedBy = currentUser.id;
          logger.info('User deactivated', {
            userId,
            deactivatedBy: currentUser.id,
          });
        } else {
          // Reactivating user
          updateProfileData.deactivatedAt = null;
          updateProfileData.deactivatedBy = null;
          logger.info('User reactivated', {
            userId,
            reactivatedBy: currentUser.id,
          });
        }
      }
    }

    // Use upsert to handle cases where profile might not exist
    let updatedProfile: Profile | null = null;

    if (existingProfile) {
      // Update existing profile
      const { data: updated, error: updateError } = await db.from('profiles')
        .update(updateProfileData)
        .eq('userId', userId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }
      updatedProfile = updated;
    } else {
      // Create new profile
      const { data: created, error: createError } = await db.from('profiles')
        .insert({
          userId,
          role: newRole || 'client',
          firstName: firstName || '',
          lastName: lastName || '',
          isActive: isActive ?? true,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }
      updatedProfile = created;
    }

    // Fetch updated user
    const { data: updatedUserData } = await db.from('users')
      .select('id, email, name')
      .eq('id', userId)
      .limit(1);

    const updatedUser = firstOrNull<User>(updatedUserData);

    logger.info('User updated', {
      userId,
      updatedBy: currentUser.id,
      changes: { email, firstName, lastName, role: newRole, isActive, affiliateStatus },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        firstName: updatedProfile?.firstName,
        lastName: updatedProfile?.lastName,
        role: updatedProfile?.role,
        // Permissions are derived from role, not stored per-user
        isActive: updatedProfile?.isActive ?? true,
        deactivatedAt: updatedProfile?.deactivatedAt,
        deactivatedBy: updatedProfile?.deactivatedBy,
        affiliateStatus: updatedProfile?.affiliateStatus,
      },
    });
  } catch (error: any) {
    logger.error('Error updating user:', {
      error: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
