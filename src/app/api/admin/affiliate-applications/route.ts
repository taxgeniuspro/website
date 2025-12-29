import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// GET: List all affiliate applications (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or super_admin
    if (session.user.role !== 'admin' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // Build query
    let query = db.from('leads').select('*', { count: 'exact' }).eq('type', 'affiliate');

    if (status) {
      query = query.eq('status', status);
    }

    const { data: applications, error, count } = await query
      .order('createdAt', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      throw error;
    }

    const total = count || 0;

    return NextResponse.json({
      applications: applications || [],
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.error('Error fetching affiliate applications:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}
