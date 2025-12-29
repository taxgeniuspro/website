import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { UserRole, UserPermissions } from '@/lib/permissions';
import { logger } from '@/lib/logger';

// Local interfaces
interface Profile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  customPermissions: any;
}

interface User {
  email: string;
  name: string | null;
}

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
      const { data: profiles } = await db.from('profiles')
        .select('id')
        .eq('role', role);

      await db.from('profiles')
        .update({ customPermissions: permissions })
        .eq('role', role);

      return NextResponse.json({
        success: true,
        message: `Updated permissions for ${(profiles || []).length} ${role} users`,
        affectedUsers: (profiles || []).length,
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
    let targetProfileQuery = db.from('profiles').select('*');
    if (profileId) {
      targetProfileQuery = targetProfileQuery.eq('id', profileId);
    } else {
      targetProfileQuery = targetProfileQuery.eq('userId', targetId);
    }

    const { data: profileData, error: profileError } = await targetProfileQuery.limit(1);

    if (profileError) {
      throw profileError;
    }

    const targetProfile = firstOrNull<Profile>(profileData);

    if (!targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user email
    const { data: userData } = await db.from('users')
      .select('email')
      .eq('id', targetProfile.userId)
      .limit(1);

    const targetUser = firstOrNull<User>(userData);

    // Prevent admin from demoting themselves
    if (targetProfile.userId === user.id && role !== 'admin') {
      return NextResponse.json(
        { error: 'You cannot change your own role from admin' },
        { status: 400 }
      );
    }

    // Update role and permissions in database
    const { data: updatedProfile, error: updateError } = await db.from('profiles')
      .update({
        role,
        customPermissions: permissions,
      })
      .eq('id', targetProfile.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedProfile.id,
        userId: updatedProfile.userId,
        email: targetUser?.email,
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
    let query = db.from('profiles').select('*');
    if (profileId) {
      query = query.eq('id', profileId);
    } else {
      query = query.eq('userId', userId!);
    }

    const { data: profileData, error: profileError } = await query.limit(1);

    if (profileError) {
      throw profileError;
    }

    const profile = firstOrNull<Profile>(profileData);

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user info
    const { data: userData } = await db.from('users')
      .select('email, name')
      .eq('id', profile.userId)
      .limit(1);

    const profileUser = firstOrNull<User>(userData);

    // Return user's current role and permissions
    return NextResponse.json({
      user: {
        id: profile.id,
        userId: profile.userId,
        email: profileUser?.email,
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
