/**
 * Access Logs API
 *
 * GET /api/restrictions/logs - Get access attempt logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const blockedOnly = searchParams.get('blockedOnly') === 'true';

    const logs = await prisma.accessAttemptLog.findMany({
      where: blockedOnly ? { wasBlocked: true } : undefined,
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 500), // Max 500
    });

    return NextResponse.json(logs);
  } catch (error) {
    logger.error('Error fetching logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
