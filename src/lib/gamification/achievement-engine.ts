import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
interface ProfileRecord {
  id: string;
  userId: string;
  role: string;
  createdAt: Date | string;
}

interface AchievementRecord {
  id: string;
  slug: string;
  title: string;
  description?: string;
  points: number;
  targetRoles: string[];
  criteria: Record<string, unknown>;
  isActive: boolean;
}

interface UserAchievementRecord {
  id: string;
  userId: string;
  achievementId: string;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: Date | string | null;
}

interface UserStatsRecord {
  id: string;
  userId: string;
  totalXP: number;
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  loginStreak: number;
  longestLoginStreak: number;
  lastLoginDate?: Date | string | null;
  documentsProcessed?: number;
  clientSatisfaction?: number;
  linksCreated?: number;
  messagesSent?: number;
}

/**
 * Achievement Engine - Core logic for gamification system
 *
 * Responsibilities:
 * - Check if user meets achievement criteria
 * - Unlock achievements
 * - Award XP
 * - Update user stats
 * - Track progress toward achievements
 */

export interface AchievementCheckResult {
  achieved: boolean;
  progress: number; // 0-100 or actual count
  achievement?: any;
  xpAwarded?: number;
}

export class AchievementEngine {
  /**
   * Check and unlock achievements for a user based on event
   */
  async checkAndUnlockAchievements(
    userId: string,
    eventType: string,
    eventData: any
  ): Promise<AchievementCheckResult[]> {
    try {
      logger.info(`🎮 Checking achievements for user ${userId}, event: ${eventType}`);

      // Get user profile to check role
      const { data: profileData } = await db
        .from('profiles')
        .select('role')
        .eq('userId', userId)
        .limit(1);

      const profile = firstOrNull(profileData) as { role: string } | null;

      if (!profile) {
        logger.warn(`Profile not found for user ${userId}`);
        return [];
      }

      // Get all active achievements for this user's role
      // Note: Supabase array contains check uses @> or cs (contains)
      const { data: achievementData } = await db
        .from('achievements')
        .select('*')
        .eq('isActive', true)
        .contains('targetRoles', [profile.role]);

      const achievements = (achievementData || []) as AchievementRecord[];

      const results: AchievementCheckResult[] = [];

      // Check each achievement
      for (const achievement of achievements) {
        const result = await this.checkSingleAchievement(userId, achievement, eventType, eventData);
        if (result) {
          results.push(result);
        }
      }

      return results;
    } catch (error) {
      logger.error('Error checking achievements:', error);
      return [];
    }
  }

  /**
   * Check a single achievement for a user
   */
  private async checkSingleAchievement(
    userId: string,
    achievement: AchievementRecord,
    eventType: string,
    eventData: any
  ): Promise<AchievementCheckResult | null> {
    try {
      // Get or create user achievement record (composite key: userId + achievementId)
      const { data: userAchievementData } = await db
        .from('user_achievements')
        .select('*')
        .eq('userId', userId)
        .eq('achievementId', achievement.id)
        .limit(1);

      let userAchievement = firstOrNull(userAchievementData) as UserAchievementRecord | null;

      // Skip if already unlocked
      if (userAchievement?.isUnlocked) {
        return null;
      }

      // Create if doesn't exist
      if (!userAchievement) {
        const { data: newData } = await db
          .from('user_achievements')
          .insert({
            userId,
            achievementId: achievement.id,
            progress: 0,
            isUnlocked: false,
          })
          .select()
          .single();

        userAchievement = newData as UserAchievementRecord;
      }

      // Check criteria based on achievement type
      const criteria = achievement.criteria as any;
      const checkResult = await this.evaluateCriteria(userId, criteria, eventType, eventData);

      if (!checkResult) {
        return null;
      }

      // Update progress
      const shouldUnlock = checkResult.progress >= 100 || checkResult.achieved;

      await db
        .from('user_achievements')
        .update({
          progress: checkResult.progress,
          isUnlocked: shouldUnlock,
          unlockedAt: shouldUnlock ? new Date().toISOString() : null,
        })
        .eq('id', userAchievement.id);

      // Award XP if unlocked
      if (shouldUnlock && !userAchievement.isUnlocked) {
        await this.awardXP(userId, achievement.points);

        logger.info(`🏆 Achievement unlocked: ${achievement.title} for user ${userId}`);

        return {
          achieved: true,
          progress: checkResult.progress,
          achievement,
          xpAwarded: achievement.points,
        };
      }

      return {
        achieved: false,
        progress: checkResult.progress,
        achievement,
      };
    } catch (error) {
      logger.error(`Error checking achievement ${achievement.slug}:`, error);
      return null;
    }
  }

  /**
   * Evaluate achievement criteria
   */
  private async evaluateCriteria(
    userId: string,
    criteria: any,
    eventType: string,
    eventData: any
  ): Promise<{ achieved: boolean; progress: number } | null> {
    const type = criteria.type;

    try {
      switch (type) {
        case 'client_count':
          return await this.checkClientCount(userId, criteria.threshold);

        case 'filing_speed':
          if (eventType === 'TAX_RETURN_FILED' && eventData.filingTime) {
            const hours = eventData.filingTime / 3600000; // ms to hours
            return {
              achieved: hours <= criteria.maxHours,
              progress: hours <= criteria.maxHours ? 100 : 0,
            };
          }
          return null;

        case 'early_filing':
          if (eventType === 'TAX_RETURN_FILED' && eventData.daysBeforeDeadline) {
            return {
              achieved: eventData.daysBeforeDeadline >= criteria.daysBefore,
              progress: eventData.daysBeforeDeadline >= criteria.daysBefore ? 100 : 0,
            };
          }
          return null;

        case 'returns_per_day':
          if (eventType === 'TAX_RETURN_FILED') {
            const count = await this.getReturnsFiledToday(userId);
            return {
              achieved: count >= criteria.count,
              progress: Math.min((count / criteria.count) * 100, 100),
            };
          }
          return null;

        case 'active_clients':
          return await this.checkActiveClients(userId, criteria.threshold);

        case 'documents_processed':
          return await this.checkDocumentsProcessed(userId, criteria.threshold);

        case 'satisfaction_rating':
          return await this.checkSatisfactionRating(userId, criteria.threshold);

        case 'rating_with_reviews':
          return await this.checkRatingWithReviews(
            userId,
            criteria.rating,
            criteria.reviews
          );

        case 'error_free_returns':
          return await this.checkErrorFreeReturns(userId, criteria.threshold);

        case 'filing_streak':
          return await this.checkFilingStreak(userId, criteria.days);

        case 'earnings':
          return await this.checkEarnings(userId, criteria.threshold);

        case 'referral_count':
          return await this.checkReferralCount(userId, criteria.threshold);

        case 'links_created':
          return await this.checkLinksCreated(userId, criteria.threshold);

        case 'materials_shared':
          return await this.checkMaterialsShared(userId, criteria.threshold);

        case 'conversion_rate':
          return await this.checkConversionRate(
            userId,
            criteria.threshold,
            criteria.minReferrals
          );

        case 'marketing_channels':
          return await this.checkMarketingChannels(userId, criteria.count);

        case 'contest_winner':
          if (eventType === 'CONTEST_ENDED' && eventData.position) {
            return {
              achieved: eventData.position <= criteria.position,
              progress: eventData.position <= criteria.position ? 100 : 0,
            };
          }
          return null;

        case 'login_streak':
          return await this.checkLoginStreak(userId, criteria.days);

        case 'early_login':
          if (eventType === 'USER_LOGIN' && eventData.loginHour !== undefined) {
            return {
              achieved: eventData.loginHour < criteria.hour,
              progress: eventData.loginHour < criteria.hour ? 100 : 0,
            };
          }
          return null;

        case 'late_login':
          if (eventType === 'USER_LOGIN' && eventData.loginHour !== undefined) {
            return {
              achieved: eventData.loginHour >= criteria.hour,
              progress: eventData.loginHour >= criteria.hour ? 100 : 0,
            };
          }
          return null;

        case 'messages_sent':
          return await this.checkMessagesSent(userId, criteria.threshold);

        case 'profile_complete':
          return await this.checkProfileComplete(userId, criteria.fields);

        case 'seasonal_filing':
          if (eventType === 'TAX_RETURN_FILED') {
            return await this.checkSeasonalFiling(userId, criteria.season, criteria.threshold);
          }
          return null;

        case 'signup_date':
          return await this.checkSignupDate(userId, criteria.before);

        default:
          logger.warn(`Unknown achievement criteria type: ${type}`);
          return null;
      }
    } catch (error) {
      logger.error(`Error evaluating criteria ${type}:`, error);
      return null;
    }
  }

  /**
   * Award XP to a user and handle level-ups
   */
  async awardXP(userId: string, amount: number): Promise<void> {
    try {
      // Get or create user stats
      const { data: statsData } = await db
        .from('user_stats')
        .select('*')
        .eq('userId', userId)
        .limit(1);

      let userStats = firstOrNull(statsData) as UserStatsRecord | null;

      if (!userStats) {
        const { data: newStats } = await db
          .from('user_stats')
          .insert({
            userId,
            totalXP: 0,
            level: 1,
            currentLevelXP: 0,
            nextLevelXP: 100,
            loginStreak: 0,
            longestLoginStreak: 0,
          })
          .select()
          .single();

        userStats = newStats as UserStatsRecord;
      }

      // Add XP
      const newTotalXP = userStats.totalXP + amount;
      let newCurrentLevelXP = userStats.currentLevelXP + amount;
      let newLevel = userStats.level;
      let newNextLevelXP = userStats.nextLevelXP;

      // Check for level up
      while (newCurrentLevelXP >= newNextLevelXP) {
        newCurrentLevelXP -= newNextLevelXP;
        newLevel++;
        newNextLevelXP = this.calculateXPForLevel(newLevel + 1);
      }

      // Update stats
      await db
        .from('user_stats')
        .update({
          totalXP: newTotalXP,
          level: newLevel,
          currentLevelXP: newCurrentLevelXP,
          nextLevelXP: newNextLevelXP,
        })
        .eq('userId', userId);

      // If leveled up, could trigger notification here
      if (newLevel > userStats.level) {
        logger.info(`🎊 User ${userId} leveled up to level ${newLevel}!`);
      }

      logger.info(`✨ Awarded ${amount} XP to user ${userId}. Total: ${newTotalXP}`);
    } catch (error) {
      logger.error('Error awarding XP:', error);
    }
  }

  /**
   * Calculate XP required for a specific level
   * Formula: level * 100 (can be adjusted for balance)
   */
  private calculateXPForLevel(level: number): number {
    // Progressive XP curve: level^1.5 * 100
    return Math.floor(Math.pow(level, 1.5) * 100);
  }

  /**
   * Update user streak (called on login)
   */
  async updateStreak(userId: string): Promise<void> {
    try {
      const { data: statsData } = await db
        .from('user_stats')
        .select('*')
        .eq('userId', userId)
        .limit(1);

      let userStats = firstOrNull(statsData) as UserStatsRecord | null;

      if (!userStats) {
        await db
          .from('user_stats')
          .insert({
            userId,
            loginStreak: 1,
            longestLoginStreak: 1,
            lastLoginDate: new Date().toISOString(),
            totalXP: 0,
            level: 1,
            currentLevelXP: 0,
            nextLevelXP: 100,
          });
        return;
      }

      const now = new Date();
      const lastLogin = userStats.lastLoginDate ? new Date(userStats.lastLoginDate) : null;

      if (!lastLogin) {
        await db
          .from('user_stats')
          .update({
            loginStreak: 1,
            longestLoginStreak: 1,
            lastLoginDate: now.toISOString(),
          })
          .eq('userId', userId);
        return;
      }

      // Check if same day
      const isSameDay =
        now.toDateString() === lastLogin.toDateString();

      if (isSameDay) {
        return; // Don't update streak on same day
      }

      // Check if consecutive day
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isConsecutive =
        yesterday.toDateString() === lastLogin.toDateString();

      const newStreak = isConsecutive ? userStats.loginStreak + 1 : 1;
      const newLongest = Math.max(newStreak, userStats.longestLoginStreak);

      await db
        .from('user_stats')
        .update({
          loginStreak: newStreak,
          longestLoginStreak: newLongest,
          lastLoginDate: now.toISOString(),
        })
        .eq('userId', userId);

      logger.info(`🔥 User ${userId} login streak: ${newStreak} days`);
    } catch (error) {
      logger.error('Error updating streak:', error);
    }
  }

  /**
   * Get user's progress to next level
   */
  async getProgressToNextLevel(userId: string): Promise<{
    level: number;
    currentXP: number;
    nextLevelXP: number;
    progress: number;
  } | null> {
    try {
      const { data: statsData } = await db
        .from('user_stats')
        .select('level, currentLevelXP, nextLevelXP')
        .eq('userId', userId)
        .limit(1);

      const userStats = firstOrNull(statsData) as Pick<UserStatsRecord, 'level' | 'currentLevelXP' | 'nextLevelXP'> | null;

      if (!userStats) {
        return null;
      }

      return {
        level: userStats.level,
        currentXP: userStats.currentLevelXP,
        nextLevelXP: userStats.nextLevelXP,
        progress: (userStats.currentLevelXP / userStats.nextLevelXP) * 100,
      };
    } catch (error) {
      logger.error('Error getting level progress:', error);
      return null;
    }
  }

  // ========================================
  // Helper methods for specific criteria checks
  // ========================================

  private async checkClientCount(userId: string, threshold: number) {
    // Get client IDs for this preparer
    const { data: clientPreparers } = await db
      .from('client_preparers')
      .select('clientId')
      .eq('preparerId', userId);

    const clientIds = (clientPreparers || []).map((cp: { clientId: string }) => cp.clientId);

    if (clientIds.length === 0) {
      return { achieved: false, progress: 0 };
    }

    // Count filed returns for those clients
    const { count } = await db
      .from('tax_returns')
      .select('id', { count: 'exact', head: true })
      .in('profileId', clientIds)
      .in('status', ['FILED', 'ACCEPTED']);

    const returnCount = count || 0;

    return {
      achieved: returnCount >= threshold,
      progress: Math.min((returnCount / threshold) * 100, 100),
    };
  }

  private async getReturnsFiledToday(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get client IDs for this preparer
    const { data: clientPreparers } = await db
      .from('client_preparers')
      .select('clientId')
      .eq('preparerId', userId);

    const clientIds = (clientPreparers || []).map((cp: { clientId: string }) => cp.clientId);

    if (clientIds.length === 0) {
      return 0;
    }

    // Count filed returns for those clients today
    const { count } = await db
      .from('tax_returns')
      .select('id', { count: 'exact', head: true })
      .in('profileId', clientIds)
      .gte('updatedAt', today.toISOString())
      .in('status', ['FILED', 'ACCEPTED']);

    return count || 0;
  }

  private async checkActiveClients(userId: string, threshold: number) {
    const { count } = await db
      .from('client_preparers')
      .select('id', { count: 'exact', head: true })
      .eq('preparerId', userId);

    const clientCount = count || 0;

    return {
      achieved: clientCount >= threshold,
      progress: Math.min((clientCount / threshold) * 100, 100),
    };
  }

  private async checkDocumentsProcessed(userId: string, threshold: number) {
    const { data: statsData } = await db
      .from('user_stats')
      .select('documentsProcessed')
      .eq('userId', userId)
      .limit(1);

    const userStats = firstOrNull(statsData) as { documentsProcessed?: number } | null;
    const count = userStats?.documentsProcessed || 0;

    return {
      achieved: count >= threshold,
      progress: Math.min((count / threshold) * 100, 100),
    };
  }

  private async checkSatisfactionRating(userId: string, threshold: number) {
    const { data: statsData } = await db
      .from('user_stats')
      .select('clientSatisfaction')
      .eq('userId', userId)
      .limit(1);

    const userStats = firstOrNull(statsData) as { clientSatisfaction?: number } | null;
    const rating = userStats?.clientSatisfaction || 0;

    return {
      achieved: rating >= threshold,
      progress: rating >= threshold ? 100 : 0,
    };
  }

  private async checkRatingWithReviews(userId: string, rating: number, reviews: number) {
    // This would need to integrate with a review system
    // Placeholder implementation
    return {
      achieved: false,
      progress: 0,
    };
  }

  private async checkErrorFreeReturns(userId: string, threshold: number) {
    // This would track returns with zero corrections
    // Placeholder implementation
    return {
      achieved: false,
      progress: 0,
    };
  }

  private async checkFilingStreak(userId: string, days: number) {
    // This would track consecutive days with filings
    // Placeholder implementation
    return {
      achieved: false,
      progress: 0,
    };
  }

  private async checkEarnings(userId: string, threshold: number) {
    // Supabase doesn't have aggregate like Prisma, so we fetch and sum
    const { data: commissions } = await db
      .from('commissions')
      .select('amount')
      .eq('userId', userId);

    const earnings = (commissions || []).reduce((sum: number, c: { amount: number }) => sum + Number(c.amount || 0), 0);

    return {
      achieved: earnings >= threshold,
      progress: Math.min((earnings / threshold) * 100, 100),
    };
  }

  private async checkReferralCount(userId: string, threshold: number) {
    const { count } = await db
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrerId', userId);

    const referralCount = count || 0;

    return {
      achieved: referralCount >= threshold,
      progress: Math.min((referralCount / threshold) * 100, 100),
    };
  }

  private async checkLinksCreated(userId: string, threshold: number) {
    const { data: statsData } = await db
      .from('user_stats')
      .select('linksCreated')
      .eq('userId', userId)
      .limit(1);

    const userStats = firstOrNull(statsData) as { linksCreated?: number } | null;
    const count = userStats?.linksCreated || 0;

    return {
      achieved: count >= threshold,
      progress: Math.min((count / threshold) * 100, 100),
    };
  }

  private async checkMaterialsShared(userId: string, threshold: number) {
    // This would track shared marketing materials
    // Placeholder implementation
    return {
      achieved: false,
      progress: 0,
    };
  }

  private async checkConversionRate(userId: string, threshold: number, minReferrals: number) {
    const { count: totalCount } = await db
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrerId', userId);

    const totalReferrals = totalCount || 0;

    if (totalReferrals < minReferrals) {
      return {
        achieved: false,
        progress: 0,
      };
    }

    const { count: convertedCount } = await db
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrerId', userId)
      .eq('status', 'COMPLETED');

    const convertedReferrals = convertedCount || 0;
    const rate = convertedReferrals / totalReferrals;

    return {
      achieved: rate >= threshold,
      progress: rate >= threshold ? 100 : (rate / threshold) * 100,
    };
  }

  private async checkMarketingChannels(userId: string, count: number) {
    // This would track unique marketing channels used
    // Placeholder implementation
    return {
      achieved: false,
      progress: 0,
    };
  }

  private async checkLoginStreak(userId: string, days: number) {
    const { data: statsData } = await db
      .from('user_stats')
      .select('loginStreak')
      .eq('userId', userId)
      .limit(1);

    const userStats = firstOrNull(statsData) as { loginStreak?: number } | null;
    const streak = userStats?.loginStreak || 0;

    return {
      achieved: streak >= days,
      progress: Math.min((streak / days) * 100, 100),
    };
  }

  private async checkMessagesSent(userId: string, threshold: number) {
    const { data: statsData } = await db
      .from('user_stats')
      .select('messagesSent')
      .eq('userId', userId)
      .limit(1);

    const userStats = firstOrNull(statsData) as { messagesSent?: number } | null;
    const count = userStats?.messagesSent || 0;

    return {
      achieved: count >= threshold,
      progress: Math.min((count / threshold) * 100, 100),
    };
  }

  private async checkProfileComplete(userId: string, fields: string[]) {
    const { data: profileData } = await db
      .from('profiles')
      .select('*')
      .eq('userId', userId)
      .limit(1);

    const profile = firstOrNull(profileData) as Record<string, unknown> | null;

    if (!profile) {
      return {
        achieved: false,
        progress: 0,
      };
    }

    const completedFields = fields.filter((field) => {
      const value = profile[field];
      return value !== null && value !== undefined && value !== '';
    });

    const progress = (completedFields.length / fields.length) * 100;

    return {
      achieved: completedFields.length === fields.length,
      progress,
    };
  }

  private async checkSeasonalFiling(userId: string, season: string, threshold: number) {
    // Define peak season (March-April)
    const now = new Date();
    const year = now.getFullYear();
    const peakStart = new Date(year, 2, 1); // March 1
    const peakEnd = new Date(year, 4, 15); // April 15

    // Get client IDs for this preparer
    const { data: clientPreparers } = await db
      .from('client_preparers')
      .select('clientId')
      .eq('preparerId', userId);

    const clientIds = (clientPreparers || []).map((cp: { clientId: string }) => cp.clientId);

    if (clientIds.length === 0) {
      return { achieved: false, progress: 0 };
    }

    // Count filed returns during peak season
    const { count } = await db
      .from('tax_returns')
      .select('id', { count: 'exact', head: true })
      .in('profileId', clientIds)
      .gte('updatedAt', peakStart.toISOString())
      .lte('updatedAt', peakEnd.toISOString())
      .in('status', ['FILED', 'ACCEPTED']);

    const returnCount = count || 0;

    return {
      achieved: returnCount >= threshold,
      progress: Math.min((returnCount / threshold) * 100, 100),
    };
  }

  private async checkSignupDate(userId: string, before: string) {
    const { data: profileData } = await db
      .from('profiles')
      .select('createdAt')
      .eq('userId', userId)
      .limit(1);

    const profile = firstOrNull(profileData) as { createdAt: string } | null;

    if (!profile) {
      return {
        achieved: false,
        progress: 0,
      };
    }

    const beforeDate = new Date(before);
    const createdAt = new Date(profile.createdAt);
    const achieved = createdAt < beforeDate;

    return {
      achieved,
      progress: achieved ? 100 : 0,
    };
  }
}

// Export singleton instance
export const achievementEngine = new AchievementEngine();
