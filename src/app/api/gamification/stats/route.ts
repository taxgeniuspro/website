import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

/**
 * GET /api/gamification/stats
 *
 * Get user's gamification stats (XP, level, achievements count, streaks)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Get user stats
    const userStats = await prisma.userStats.findUnique({
      where: { userId },
    });

    // Get achievement counts
    const achievementCounts = await prisma.userAchievement.groupBy({
      by: ['isUnlocked'],
      where: { userId },
      _count: true,
    });

    const unlockedCount =
      achievementCounts.find((c) => c.isUnlocked)?._count || 0;
    const totalCount = achievementCounts.reduce((sum, c) => sum + c._count, 0);

    // Get recently unlocked achievements (last 5)
    const recentAchievements = await prisma.userAchievement.findMany({
      where: {
        userId,
        isUnlocked: true,
      },
      include: {
        achievement: true,
      },
      orderBy: {
        unlockedAt: 'desc',
      },
      take: 5,
    });

    // Get new achievements (unlocked but not viewed)
    const newAchievements = await prisma.userAchievement.count({
      where: {
        userId,
        isUnlocked: true,
        viewedAt: null,
      },
    });

    return NextResponse.json({
      stats: userStats || {
        totalXP: 0,
        level: 1,
        currentLevelXP: 0,
        nextLevelXP: 100,
        loginStreak: 0,
        longestLoginStreak: 0,
      },
      achievements: {
        unlocked: unlockedCount,
        total: totalCount,
        new: newAchievements,
        recent: recentAchievements.map((ua) => ({
          id: ua.id,
          slug: ua.achievement.slug,
          title: ua.achievement.title,
          description: ua.achievement.description,
          icon: ua.achievement.icon,
          rarity: ua.achievement.rarity,
          points: ua.achievement.points,
          badgeColor: ua.achievement.badgeColor,
          unlockedAt: ua.unlockedAt,
          viewed: ua.viewedAt !== null,
        })),
      },
    });
  } catch (error) {
    logger.error('Error fetching gamification stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
