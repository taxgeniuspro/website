import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

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
    await prisma.userAchievement.updateMany({
      where: {
        userId,
        achievementId: {
          in: achievementIds,
        },
        viewedAt: null,
      },
      data: {
        viewedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error marking achievements as viewed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
