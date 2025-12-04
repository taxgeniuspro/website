import { prisma } from '@/lib/db';
import { cache, cacheKeys } from '@/lib/redis';
import type { Contest, MarketingMaterial, Notification } from '@prisma/client';

export interface ReferrerStats {
  total_referrals: number;
  completed_returns: number;
  total_earnings: number;
  contest_rank?: number;
  referrals_this_month: number;
  earnings_this_month: number;
}

export interface ReferralActivity {
  client_name: string;
  action: string;
  date: string;
  amount: number;
}

export class ReferrerService {
  /**
   * Get comprehensive stats for a referrer dashboard
   */
  static async getReferrerStats(referrerId: string): Promise<ReferrerStats> {
    // Try to get from cache first
    const cacheKey = cacheKeys.referrerStats(referrerId);
    const cached = await cache.get<ReferrerStats>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get total referrals count
    const totalReferrals = await prisma.referral.count({
      where: { referrerId },
    });

    // Get completed returns count
    const completedReturns = await prisma.referral.count({
      where: {
        referrerId,
        status: 'COMPLETED',
      },
    });

    // Get total earnings
    const earningsData = await prisma.referral.findMany({
      where: { referrerId },
      select: { commissionEarned: true },
    });

    const totalEarnings = earningsData.reduce((sum, r) => sum + Number(r.commissionEarned || 0), 0);

    // Get referrals this month
    const referralsThisMonth = await prisma.referral.count({
      where: {
        referrerId,
        signupDate: { gte: startOfMonth },
      },
    });

    // Get earnings this month
    const monthlyEarningsData = await prisma.referral.findMany({
      where: {
        referrerId,
        signupDate: { gte: startOfMonth },
      },
      select: { commissionEarned: true },
    });

    const earningsThisMonth = monthlyEarningsData.reduce(
      (sum, r) => sum + Number(r.commissionEarned || 0),
      0
    );

    // Get contest rank
    const activeContest = await prisma.contest.findFirst({
      where: { isActive: true },
      include: {
        participants: {
          where: { profileId: referrerId },
          select: { rank: true },
        },
      },
    });

    const contestRank = activeContest?.participants[0]?.rank;

    const stats = {
      total_referrals: totalReferrals,
      completed_returns: completedReturns,
      total_earnings: totalEarnings,
      contest_rank: contestRank,
      referrals_this_month: referralsThisMonth,
      earnings_this_month: earningsThisMonth,
    };

    // Cache for 60 seconds
    await cache.set(cacheKey, stats, 60);

    return stats;
  }

  /**
   * Get recent referral activity for dashboard
   */
  static async getRecentActivity(
    referrerId: string,
    limit: number = 10
  ): Promise<ReferralActivity[]> {
    const referrals = await prisma.referral.findMany({
      where: { referrerId },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return referrals.map((referral) => {
      const clientName =
        `${referral.client.firstName || ''} ${referral.client.lastName || ''}`.trim() ||
        'Anonymous';

      let action = 'Signed up';
      let date = referral.signupDate.toISOString();
      let amount = 50; // Base signup bonus

      if (referral.status === 'COMPLETED' && referral.returnFiledDate) {
        action = 'Return filed';
        date = referral.returnFiledDate.toISOString();
        amount = Number(referral.commissionEarned) || 100;
      }

      return {
        client_name: clientName,
        action,
        date,
        amount,
      };
    });
  }

  /**
   * Get current contest leaderboard
   */
  static async getContestLeaderboard(limit: number = 10) {
    // Try cache first
    const cacheKey = cacheKeys.contestLeaderboard(limit);
    const cached = await cache.get<unknown[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const activeContest = await prisma.contest.findFirst({
      where: { isActive: true },
      include: {
        leaderboard: {
          orderBy: { rank: 'asc' },
          take: limit,
          include: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                vanitySlug: true,
              },
            },
          },
        },
      },
    });

    if (!activeContest) return [];

    const leaderboard = activeContest.leaderboard.map((entry) => ({
      id: entry.id,
      contest_id: entry.contestId,
      referrer_id: entry.profileId,
      rank: entry.rank,
      score: Number(entry.score),
      last_calculated: entry.lastCalculated.toISOString(),
      referrer: {
        first_name: entry.profile?.firstName,
        last_name: entry.profile?.lastName,
        vanity_slug: entry.profile?.vanitySlug,
      },
    }));

    // Cache for 30 seconds
    await cache.set(cacheKey, leaderboard, 30);

    return leaderboard;
  }

  /**
   * Get active contests
   */
  static async getActiveContests(): Promise<Contest[]> {
    return await prisma.contest.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get marketing materials
   */
  static async getMarketingMaterials(): Promise<MarketingMaterial[]> {
    return await prisma.marketingMaterial.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get user notifications
   */
  static async getNotifications(profileId: string): Promise<Notification[]> {
    return await prisma.notification.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark notification as actioned
   */
  static async markNotificationAsActioned(notificationId: string): Promise<void> {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isActioned: true,
        actionedAt: new Date(),
      },
    });
  }

  /**
   * Generate referral code for user
   */
  static generateReferralCode(userName: string): string {
    const cleanName = userName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${cleanName}${randomSuffix}`;
  }

  /**
   * Get referrer's vanity URL
   */
  static async getVanityUrl(referrerId: string): Promise<string | null> {
    const profile = await prisma.profile.findUnique({
      where: { id: referrerId },
      select: { vanitySlug: true },
    });

    return profile?.vanitySlug || null;
  }

  /**
   * Set referrer's vanity slug
   */
  static async setVanitySlug(
    referrerId: string,
    slug: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await prisma.profile.update({
        where: { id: referrerId },
        data: { vanitySlug: slug },
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check if vanity slug is available
   */
  static async isVanitySlugAvailable(slug: string): Promise<boolean> {
    const existing = await prisma.profile.findUnique({
      where: { vanitySlug: slug },
    });

    return !existing;
  }
}
