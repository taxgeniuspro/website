import { db, firstOrNull } from '@/lib/db';
import { cache, cacheKeys } from '@/lib/redis';

// Local type definitions (replacing @prisma/client)
interface Contest {
  id: string;
  name: string;
  description?: string | null;
  startDate: Date | string;
  endDate: Date | string;
  isActive: boolean;
  createdAt: Date | string;
}

interface MarketingMaterial {
  id: string;
  name: string;
  type: string;
  url?: string | null;
  thumbnailUrl?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: Date | string;
}

interface Notification {
  id: string;
  profileId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  isActioned?: boolean;
  readAt?: Date | string | null;
  actionedAt?: Date | string | null;
  createdAt: Date | string;
}

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
    const { count: totalReferrals } = await db
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrerId', referrerId);

    // Get completed returns count
    const { count: completedReturns } = await db
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrerId', referrerId)
      .eq('status', 'COMPLETED');

    // Get total earnings
    const { data: earningsData } = await db
      .from('referrals')
      .select('commissionEarned')
      .eq('referrerId', referrerId);

    const totalEarnings = (earningsData || []).reduce((sum: number, r: { commissionEarned: number }) => sum + Number(r.commissionEarned || 0), 0);

    // Get referrals this month
    const { count: referralsThisMonth } = await db
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrerId', referrerId)
      .gte('signupDate', startOfMonth.toISOString());

    // Get earnings this month
    const { data: monthlyEarningsData } = await db
      .from('referrals')
      .select('commissionEarned')
      .eq('referrerId', referrerId)
      .gte('signupDate', startOfMonth.toISOString());

    const earningsThisMonth = (monthlyEarningsData || []).reduce(
      (sum: number, r: { commissionEarned: number }) => sum + Number(r.commissionEarned || 0),
      0
    );

    // Get contest rank - first get active contest
    const { data: activeContestData } = await db
      .from('contests')
      .select('id')
      .eq('isActive', true)
      .limit(1);

    const activeContest = firstOrNull(activeContestData) as { id: string } | null;
    let contestRank: number | undefined;

    if (activeContest) {
      const { data: participantData } = await db
        .from('contest_participants')
        .select('rank')
        .eq('contestId', activeContest.id)
        .eq('profileId', referrerId)
        .limit(1);

      const participant = firstOrNull(participantData) as { rank: number } | null;
      contestRank = participant?.rank;
    }

    const stats = {
      total_referrals: totalReferrals || 0,
      completed_returns: completedReturns || 0,
      total_earnings: totalEarnings,
      contest_rank: contestRank,
      referrals_this_month: referralsThisMonth || 0,
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
    // Get referrals with client info
    const { data: referrals } = await db
      .from('referrals')
      .select('id, status, signupDate, returnFiledDate, commissionEarned, clientId')
      .eq('referrerId', referrerId)
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (!referrals || referrals.length === 0) return [];

    // Get client profiles for these referrals
    const clientIds = referrals.map((r: any) => r.clientId).filter(Boolean);
    const { data: clients } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .in('id', clientIds);

    const clientMap = new Map((clients || []).map((c: any) => [c.id, c]));

    return referrals.map((referral: any) => {
      const client = clientMap.get(referral.clientId) || {};
      const clientName =
        `${client.firstName || ''} ${client.lastName || ''}`.trim() ||
        'Anonymous';

      let action = 'Signed up';
      let date = referral.signupDate;
      let amount = 50; // Base signup bonus

      if (referral.status === 'COMPLETED' && referral.returnFiledDate) {
        action = 'Return filed';
        date = referral.returnFiledDate;
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

    // Get active contest
    const { data: contestData } = await db
      .from('contests')
      .select('id')
      .eq('isActive', true)
      .limit(1);

    const activeContest = firstOrNull(contestData) as { id: string } | null;
    if (!activeContest) return [];

    // Get leaderboard entries
    const { data: leaderboardData } = await db
      .from('contest_leaderboard')
      .select('id, contestId, profileId, rank, score, lastCalculated')
      .eq('contestId', activeContest.id)
      .order('rank', { ascending: true })
      .limit(limit);

    if (!leaderboardData || leaderboardData.length === 0) return [];

    // Get profile info for leaderboard entries
    const profileIds = leaderboardData.map((e: any) => e.profileId);
    const { data: profiles } = await db
      .from('profiles')
      .select('id, firstName, lastName, vanitySlug')
      .in('id', profileIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const leaderboard = leaderboardData.map((entry: any) => {
      const profile = profileMap.get(entry.profileId) || {};
      return {
        id: entry.id,
        contest_id: entry.contestId,
        referrer_id: entry.profileId,
        rank: entry.rank,
        score: Number(entry.score),
        last_calculated: entry.lastCalculated,
        referrer: {
          first_name: profile.firstName,
          last_name: profile.lastName,
          vanity_slug: profile.vanitySlug,
        },
      };
    });

    // Cache for 30 seconds
    await cache.set(cacheKey, leaderboard, 30);

    return leaderboard;
  }

  /**
   * Get active contests
   */
  static async getActiveContests(): Promise<Contest[]> {
    const { data } = await db
      .from('contests')
      .select('*')
      .eq('isActive', true)
      .order('createdAt', { ascending: false });

    return (data || []) as Contest[];
  }

  /**
   * Get marketing materials
   */
  static async getMarketingMaterials(): Promise<MarketingMaterial[]> {
    const { data } = await db
      .from('marketing_materials')
      .select('*')
      .eq('isActive', true)
      .order('createdAt', { ascending: false });

    return (data || []) as MarketingMaterial[];
  }

  /**
   * Get user notifications
   */
  static async getNotifications(profileId: string): Promise<Notification[]> {
    const { data } = await db
      .from('notifications')
      .select('*')
      .eq('profileId', profileId)
      .order('createdAt', { ascending: false });

    return (data || []) as Notification[];
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    await db
      .from('notifications')
      .update({
        isRead: true,
        readAt: new Date().toISOString(),
      })
      .eq('id', notificationId);
  }

  /**
   * Mark notification as actioned
   */
  static async markNotificationAsActioned(notificationId: string): Promise<void> {
    await db
      .from('notifications')
      .update({
        isActioned: true,
        actionedAt: new Date().toISOString(),
      })
      .eq('id', notificationId);
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
    const { data: profileData } = await db
      .from('profiles')
      .select('vanitySlug')
      .eq('id', referrerId)
      .limit(1);

    const profile = firstOrNull(profileData) as { vanitySlug?: string } | null;
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
      const { error } = await db
        .from('profiles')
        .update({ vanitySlug: slug })
        .eq('id', referrerId);

      if (error) throw error;

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
    const { data: existing } = await db
      .from('profiles')
      .select('id')
      .eq('vanitySlug', slug)
      .limit(1);

    return !existing || existing.length === 0;
  }
}
