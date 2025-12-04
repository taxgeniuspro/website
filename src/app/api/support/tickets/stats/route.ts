/**
 * Support Ticket Statistics API
 * GET /api/support/tickets/stats - Get ticket statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTicketStats } from '@/lib/services/support-ticket.service';
import { UserRole } from '@prisma/client';
import { logger } from '@/lib/logger';

/**
 * GET /api/support/tickets/stats
 * Get ticket statistics for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with role
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, role: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Determine role for filtering
    let role: 'client' | 'preparer' | 'admin' = 'client';
    if (profile.role === UserRole.TAX_PREPARER) {
      role = 'preparer';
    } else if (profile.role === UserRole.SUPER_ADMIN || profile.role === UserRole.ADMIN) {
      role = 'admin';
    } else if (profile.role === UserRole.CLIENT || profile.role === UserRole.LEAD) {
      role = 'client';
    }

    // Get statistics
    const stats = await getTicketStats(profile.id, role);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get ticket stats', { error });

    // Return empty stats instead of error to prevent UI crashes
    return NextResponse.json({
      success: true,
      data: {
        total: 0,
        open: 0,
        inProgress: 0,
        waitingClient: 0,
        waitingPreparer: 0,
        resolved: 0,
        closed: 0,
        byPriority: {
          LOW: 0,
          NORMAL: 0,
          HIGH: 0,
          URGENT: 0,
        },
        averageResponseTime: 0,
        averageResolutionTime: 0,
      },
    });
  }
}
