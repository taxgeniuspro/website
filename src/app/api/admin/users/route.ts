/**
 * Admin Users API
 * GET: List all users with pagination and filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { profile: { firstName: { contains: search, mode: 'insensitive' } } },
        { profile: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (roleFilter) {
      where.profile = {
        ...where.profile,
        role: roleFilter,
      };
    }

    if (status === 'active') {
      where.profile = {
        ...where.profile,
        isActive: true,
      };
    } else if (status === 'inactive') {
      where.profile = {
        ...where.profile,
        isActive: false,
      };
    }

    // Fetch users with profiles
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              isActive: true,
              affiliateStatus: true,
              avatarUrl: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Format response
    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.profile?.firstName,
      lastName: user.profile?.lastName,
      role: user.profile?.role || 'client',
      isActive: user.profile?.isActive ?? true,
      affiliateStatus: user.profile?.affiliateStatus,
      avatarUrl: user.profile?.avatarUrl,
      createdAt: user.createdAt,
      profileCreatedAt: user.profile?.createdAt,
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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
