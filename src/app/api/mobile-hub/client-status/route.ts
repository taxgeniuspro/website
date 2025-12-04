/**
 * Client Status API
 *
 * GET /api/mobile-hub/client-status - Get client's tax return status
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get client's documents count
    const documentsCount = await prisma.document.count({
      where: { userId: userId },
    });

    // Get latest tax return (if exists)
    const latestReturn = await prisma.taxReturn.findFirst({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
    });

    const status = {
      returnStatus: latestReturn?.status || 'not_started',
      documentsCount,
      lastUpdated: latestReturn?.updatedAt || null,
    };

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Error fetching client status', { error });
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
