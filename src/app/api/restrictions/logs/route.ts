/**
 * Access Logs API
 *
 * GET /api/restrictions/logs - Get access attempt logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interface (replacing Prisma types)
interface AccessAttemptLog {
  id: string;
  timestamp: Date;
  wasBlocked: boolean;
  routePath?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
  reason?: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const blockedOnly = searchParams.get('blockedOnly') === 'true';

    let query = db
      .from('access_attempt_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(Math.min(limit, 500)); // Max 500

    if (blockedOnly) {
      query = query.eq('wasBlocked', true);
    }

    const { data: logs, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json(logs || []);
  } catch (error) {
    logger.error('Error fetching logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
