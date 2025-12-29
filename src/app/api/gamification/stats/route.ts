import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

interface UserStats {
  totalXP: number;
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  loginStreak: number;
  longestLoginStreak: number;
}

interface UserAchievementWithDetails {
  id: string;
  achievementId: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
  viewedAt: string | null;
  achievements: {
    slug: string;
    title: string;
    description: string;
    icon: string;
    rarity: string;
    points: number;
    badgeColor: string | null;
  };
}

interface UserAchievementCount {
  isUnlocked: boolean;
}

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
    const { data: userStatsData, error: statsError } = await db
      .from('user_stats')
      .select('totalXP, level, currentLevelXP, nextLevelXP, loginStreak, longestLoginStreak')
      .eq('userId', userId)
      .limit(1);

    const userStats = firstOrNull(userStatsData) as UserStats | null;

    // Get all user achievements for counting
    const { data: allUserAchievements, error: countError } = await db
      .from('user_achievements')
      .select('isUnlocked')
      .eq('userId', userId);

    if (countError) {
      throw countError;
    }

    const achievementsList = (allUserAchievements || []) as UserAchievementCount[];
    const unlockedCount = achievementsList.filter((a) => a.isUnlocked).length;
    const totalCount = achievementsList.length;

    // Get recently unlocked achievements (last 5) with achievement details
    const { data: recentAchievementsData, error: recentError } = await db
      .from('user_achievements')
      .select(`
        id,
        achievementId,
        isUnlocked,
        unlockedAt,
        viewedAt,
        achievements (
          slug,
          title,
          description,
          icon,
          rarity,
          points,
          badgeColor
        )
      `)
      .eq('userId', userId)
      .eq('isUnlocked', true)
      .order('unlockedAt', { ascending: false })
      .limit(5);

    if (recentError) {
      throw recentError;
    }

    const recentAchievements = (recentAchievementsData || []) as UserAchievementWithDetails[];

    // Get new achievements count (unlocked but not viewed)
    const { count: newAchievements, error: newError } = await db
      .from('user_achievements')
      .select('id', { count: 'exact', head: true })
      .eq('userId', userId)
      .eq('isUnlocked', true)
      .is('viewedAt', null);

    if (newError) {
      throw newError;
    }

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
        new: newAchievements || 0,
        recent: recentAchievements.map((ua) => ({
          id: ua.id,
          slug: ua.achievements?.slug,
          title: ua.achievements?.title,
          description: ua.achievements?.description,
          icon: ua.achievements?.icon,
          rarity: ua.achievements?.rarity,
          points: ua.achievements?.points,
          badgeColor: ua.achievements?.badgeColor,
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
