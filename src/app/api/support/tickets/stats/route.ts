/**
 * Support Ticket Statistics API
 * GET /api/support/tickets/stats - Get ticket statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { getTicketStats } from '@/lib/services/support-ticket.service';
import { logger } from '@/lib/logger';

// TypeScript interface to replace @prisma/client type
type UserRole = 'CLIENT' | 'LEAD' | 'TAX_PREPARER' | 'ADMIN' | 'SUPER_ADMIN';

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
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id, role')
      .eq('user_id', userId)
      .limit(1);

    const profile = firstOrNull(profileData);

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Determine role for filtering
    const profileRole = (profile.role || '').toUpperCase();
    let role: 'client' | 'preparer' | 'admin' = 'client';
    if (profileRole === 'TAX_PREPARER') {
      role = 'preparer';
    } else if (profileRole === 'SUPER_ADMIN' || profileRole === 'ADMIN') {
      role = 'admin';
    } else if (profileRole === 'CLIENT' || profileRole === 'LEAD') {
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
