import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * POST /api/gamification/achievements/mark-viewed
 *
 * Mark achievements as viewed (removes "new" badge)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const body = await request.json();
    const { achievementIds } = body;

    if (!achievementIds || !Array.isArray(achievementIds)) {
      return NextResponse.json(
        { error: 'achievementIds array is required' },
        { status: 400 }
      );
    }

    // Mark as viewed
    const { error } = await db
      .from('user_achievements')
      .update({ viewedAt: new Date().toISOString() })
      .eq('userId', userId)
      .in('achievementId', achievementIds)
      .is('viewedAt', null);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error marking achievements as viewed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
