import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

interface Profile {
  role: string;
}

interface Achievement {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  rarity: string;
  points: number;
  badgeColor: string | null;
  badgeImage: string | null;
  sortOrder: number;
  targetRoles: string[];
}

interface UserAchievement {
  id: string;
  achievementId: string;
  progress: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
  viewedAt: string | null;
}

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

    // Get user role with flexible lookup
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('role')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${user?.email}`)
      .limit(1);

    const profile = firstOrNull(profileData) as Profile | null;

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get all achievements for this role
    // Note: Supabase uses @> operator for array contains, but we'll filter in JS for simplicity
    const { data: allAchievements, error: achievementsError } = await db
      .from('achievements')
      .select('id, slug, title, description, category, icon, rarity, points, badgeColor, badgeImage, sortOrder, targetRoles')
      .eq('isActive', true)
      .order('category', { ascending: true })
      .order('sortOrder', { ascending: true });

    if (achievementsError) {
      throw achievementsError;
    }

    // Filter achievements by role (since Supabase array contains is complex)
    const achievements = ((allAchievements || []) as Achievement[]).filter(
      (a) => a.targetRoles && a.targetRoles.includes(profile.role)
    );

    // Get user's progress on these achievements
    const achievementIds = achievements.map((a) => a.id);

    const { data: userAchievementsData, error: userAchievementsError } = await db
      .from('user_achievements')
      .select('id, achievementId, progress, isUnlocked, unlockedAt, viewedAt')
      .eq('userId', userId)
      .in('achievementId', achievementIds);

    if (userAchievementsError) {
      throw userAchievementsError;
    }

    const userAchievements = (userAchievementsData || []) as UserAchievement[];

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
