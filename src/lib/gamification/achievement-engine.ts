import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

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
      const profile = await prisma.profile.findUnique({
        where: { userId: userId },
        select: { role: true },
      });

      if (!profile) {
        logger.warn(`Profile not found for user ${userId}`);
        return [];
      }

      // Get all active achievements for this user's role
      const achievements = await prisma.achievement.findMany({
        where: {
          isActive: true,
          targetRoles: {
            has: profile.role,
          },
        },
      });

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
    achievement: any,
    eventType: string,
    eventData: any
  ): Promise<AchievementCheckResult | null> {
    try {
      // Get or create user achievement record
      let userAchievement = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id,
          },
        },
      });

      // Skip if already unlocked
      if (userAchievement?.isUnlocked) {
        return null;
      }

      // Create if doesn't exist
      if (!userAchievement) {
        userAchievement = await prisma.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id,
            progress: 0,
          },
        });
      }

      // Check criteria based on achievement type
      const criteria = achievement.criteria as any;
      const checkResult = await this.evaluateCriteria(userId, criteria, eventType, eventData);

      if (!checkResult) {
        return null;
      }

      // Update progress
      const shouldUnlock = checkResult.progress >= 100 || checkResult.achieved;

      const updated = await prisma.userAchievement.update({
        where: { id: userAchievement.id },
        data: {
          progress: checkResult.progress,
          isUnlocked: shouldUnlock,
          unlockedAt: shouldUnlock ? new Date() : undefined,
        },
      });

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
      let userStats = await prisma.userStats.findUnique({
        where: { userId },
      });

      if (!userStats) {
        userStats = await prisma.userStats.create({
          data: {
            userId,
            totalXP: 0,
            level: 1,
            currentLevelXP: 0,
            nextLevelXP: 100,
          },
        });
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
      await prisma.userStats.update({
        where: { userId },
        data: {
          totalXP: newTotalXP,
          level: newLevel,
          currentLevelXP: newCurrentLevelXP,
          nextLevelXP: newNextLevelXP,
        },
      });

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
      let userStats = await prisma.userStats.findUnique({
        where: { userId },
      });

      if (!userStats) {
        userStats = await prisma.userStats.create({
          data: {
            userId,
            loginStreak: 1,
            longestLoginStreak: 1,
            lastLoginDate: new Date(),
          },
        });
        return;
      }

      const now = new Date();
      const lastLogin = userStats.lastLoginDate;

      if (!lastLogin) {
        await prisma.userStats.update({
          where: { userId },
          data: {
            loginStreak: 1,
            longestLoginStreak: 1,
            lastLoginDate: now,
          },
        });
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

      let newStreak = isConsecutive ? userStats.loginStreak + 1 : 1;
      let newLongest = Math.max(newStreak, userStats.longestLoginStreak);

      await prisma.userStats.update({
        where: { userId },
        data: {
          loginStreak: newStreak,
          longestLoginStreak: newLongest,
          lastLoginDate: now,
        },
      });

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
      const userStats = await prisma.userStats.findUnique({
        where: { userId },
      });

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
    const count = await prisma.taxReturn.count({
      where: {
        profile: {
          preparerClients: {
            some: {
              preparerId: userId,
            },
          },
        },
        status: {
          in: ['FILED', 'ACCEPTED'],
        },
      },
    });

    return {
      achieved: count >= threshold,
      progress: Math.min((count / threshold) * 100, 100),
    };
  }

  private async getReturnsFiledToday(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await prisma.taxReturn.count({
      where: {
        profile: {
          preparerClients: {
            some: {
              preparerId: userId,
            },
          },
        },
        updatedAt: {
          gte: today,
        },
        status: {
          in: ['FILED', 'ACCEPTED'],
        },
      },
    });
  }

  private async checkActiveClients(userId: string, threshold: number) {
    const count = await prisma.clientPreparer.count({
      where: {
        preparerId: userId,
        // Could add additional filters for "active" definition
      },
    });

    return {
      achieved: count >= threshold,
      progress: Math.min((count / threshold) * 100, 100),
    };
  }

  private async checkDocumentsProcessed(userId: string, threshold: number) {
    const userStats = await prisma.userStats.findUnique({
      where: { userId },
    });

    const count = userStats?.documentsProcessed || 0;

    return {
      achieved: count >= threshold,
      progress: Math.min((count / threshold) * 100, 100),
    };
  }

  private async checkSatisfactionRating(userId: string, threshold: number) {
    const userStats = await prisma.userStats.findUnique({
      where: { userId },
    });

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
    const total = await prisma.commission.aggregate({
      where: { userId },
      _sum: { amount: true },
    });

    const earnings = Number(total._sum.amount || 0);

    return {
      achieved: earnings >= threshold,
      progress: Math.min((earnings / threshold) * 100, 100),
    };
  }

  private async checkReferralCount(userId: string, threshold: number) {
    const count = await prisma.referral.count({
      where: { referrerId: userId },
    });

    return {
      achieved: count >= threshold,
      progress: Math.min((count / threshold) * 100, 100),
    };
  }

  private async checkLinksCreated(userId: string, threshold: number) {
    const userStats = await prisma.userStats.findUnique({
      where: { userId },
    });

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
    const totalReferrals = await prisma.referral.count({
      where: { referrerId: userId },
    });

    if (totalReferrals < minReferrals) {
      return {
        achieved: false,
        progress: 0,
      };
    }

    const convertedReferrals = await prisma.referral.count({
      where: {
        referrerId: userId,
        status: 'COMPLETED',
      },
    });

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
    const userStats = await prisma.userStats.findUnique({
      where: { userId },
    });

    const streak = userStats?.loginStreak || 0;

    return {
      achieved: streak >= days,
      progress: Math.min((streak / days) * 100, 100),
    };
  }

  private async checkMessagesSent(userId: string, threshold: number) {
    const userStats = await prisma.userStats.findUnique({
      where: { userId },
    });

    const count = userStats?.messagesSent || 0;

    return {
      achieved: count >= threshold,
      progress: Math.min((count / threshold) * 100, 100),
    };
  }

  private async checkProfileComplete(userId: string, fields: string[]) {
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile) {
      return {
        achieved: false,
        progress: 0,
      };
    }

    const completedFields = fields.filter((field) => {
      const value = (profile as any)[field];
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

    const count = await prisma.taxReturn.count({
      where: {
        profile: {
          preparerClients: {
            some: {
              preparerId: userId,
            },
          },
        },
        updatedAt: {
          gte: peakStart,
          lte: peakEnd,
        },
        status: {
          in: ['FILED', 'ACCEPTED'],
        },
      },
    });

    return {
      achieved: count >= threshold,
      progress: Math.min((count / threshold) * 100, 100),
    };
  }

  private async checkSignupDate(userId: string, before: string) {
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: { createdAt: true },
    });

    if (!profile) {
      return {
        achieved: false,
        progress: 0,
      };
    }

    const beforeDate = new Date(before);
    const achieved = profile.createdAt < beforeDate;

    return {
      achieved,
      progress: achieved ? 100 : 0,
    };
  }
}

// Export singleton instance
export const achievementEngine = new AchievementEngine();
