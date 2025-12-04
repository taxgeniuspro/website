import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

/**
 * GET /api/gamification/achievements
 *
 * Get all achievements with user's progress
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Get user role
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: { role: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get all achievements for this role
    const achievements = await prisma.achievement.findMany({
      where: {
        isActive: true,
        targetRoles: {
          has: profile.role,
        },
      },
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
      ],
    });

    // Get user's progress on these achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: {
        userId,
        achievementId: {
          in: achievements.map((a) => a.id),
        },
      },
    });

    // Combine achievement data with user progress
    const achievementsWithProgress = achievements.map((achievement) => {
      const userAchievement = userAchievements.find(
        (ua) => ua.achievementId === achievement.id
      );

      return {
        id: achievement.id,
        slug: achievement.slug,
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
        icon: achievement.icon,
        rarity: achievement.rarity,
        points: achievement.points,
        badgeColor: achievement.badgeColor,
        badgeImage: achievement.badgeImage,
        progress: userAchievement?.progress || 0,
        isUnlocked: userAchievement?.isUnlocked || false,
        unlockedAt: userAchievement?.unlockedAt,
        viewed: userAchievement?.viewedAt !== null,
      };
    });

    // Group by category
    const groupedAchievements = achievementsWithProgress.reduce(
      (acc, achievement) => {
        const category = achievement.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(achievement);
        return acc;
      },
      {} as Record<string, typeof achievementsWithProgress>
    );

    return NextResponse.json({
      achievements: achievementsWithProgress,
      grouped: groupedAchievements,
      summary: {
        total: achievements.length,
        unlocked: achievementsWithProgress.filter((a) => a.isUnlocked).length,
        inProgress: achievementsWithProgress.filter(
          (a) => !a.isUnlocked && a.progress > 0
        ).length,
      },
    });
  } catch (error) {
    logger.error('Error fetching achievements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
