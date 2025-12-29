/**
 * Admin Users API
 * GET: List all users with pagination and filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local interfaces
interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

interface Profile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  affiliateStatus: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const currentUser = session?.user;

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = currentUser?.role as string;
    const isAdmin = role === 'admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';

    // Build users query
    let usersQuery = db.from('users')
      .select('id, email, name, createdAt', { count: 'exact' });

    if (search) {
      usersQuery = usersQuery.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    usersQuery = usersQuery
      .order('createdAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data: users, count: total, error: usersError } = await usersQuery;

    if (usersError) {
      throw usersError;
    }

    // Get user IDs
    const userIds = (users || []).map((u: User) => u.id);

    // Fetch profiles for users
    let profilesQuery = db.from('profiles')
      .select('id, userId, firstName, lastName, role, isActive, affiliateStatus, avatarUrl, createdAt')
      .in('userId', userIds);

    if (roleFilter) {
      profilesQuery = profilesQuery.eq('role', roleFilter);
    }

    if (status === 'active') {
      profilesQuery = profilesQuery.eq('isActive', true);
    } else if (status === 'inactive') {
      profilesQuery = profilesQuery.eq('isActive', false);
    }

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      throw profilesError;
    }

    // Create profile lookup map
    const profilesByUserId = new Map<string, Profile>();
    (profiles || []).forEach((p: Profile) => {
      profilesByUserId.set(p.userId, p);
    });

    // Format response
    const formattedUsers = (users || []).map((user: User) => {
      const profile = profilesByUserId.get(user.id);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        role: profile?.role || 'client',
        isActive: profile?.isActive ?? true,
        affiliateStatus: profile?.affiliateStatus,
        avatarUrl: profile?.avatarUrl,
        createdAt: user.createdAt,
        profileCreatedAt: profile?.createdAt,
      };
    });

    // Filter by role/status after joining (since we can't do nested joins in Supabase)
    let filteredUsers = formattedUsers;
    if (roleFilter) {
      filteredUsers = filteredUsers.filter((u: any) => u.role === roleFilter);
    }
    if (status === 'active') {
      filteredUsers = filteredUsers.filter((u: any) => u.isActive === true);
    } else if (status === 'inactive') {
      filteredUsers = filteredUsers.filter((u: any) => u.isActive === false);
    }

    return NextResponse.json({
      success: true,
      users: filteredUsers,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    });
  } catch (error: any) {
    logger.error('Error fetching users:', {
      error: error?.message,
      code: error?.code,
      meta: error?.meta,
    });
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
