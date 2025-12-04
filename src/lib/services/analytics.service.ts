/**
 * Analytics Service
 *
 * Provides real-time analytics aggregation from database
 * Used by admin dashboard and analytics pages
 */

import { prisma } from '@/lib/prisma';
// Clerk client removed - using NextAuth;
import { logger } from '@/lib/logger';
import { UserRole } from '@prisma/client';

export interface DashboardStats {
  totalUsers: number;
  totalRevenue: number;
  returnsFiled: number;
  activeSessions: number;
  revenueGrowth: number;
  usersGrowth: number;
  returnsGrowth: number;
}

export interface RecentActivity {
  user: string;
  action: string;
  time: string;
  badge: 'success' | 'info' | 'warning';
}

export interface RevenueData {
  month: string;
  value: number;
  height: string;
}

export interface UserGrowthData {
  month: string;
  value: number;
  height: string;
}

export interface TopService {
  name: string;
  revenue: string;
  growth: string;
  color: string;
}

export interface UserActivityData {
  role: string;
  count: number;
  percentage: number;
  active: number;
  color: string;
}

export interface ConversionStage {
  stage: string;
  count: number;
  percentage: number;
  color: string;
}

/**
 * Get dashboard statistics with real data
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get current date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total users from Clerk
    const { totalCount: totalUsers } = await clerk.users.getUserList({ limit: 1 });

    // Users last month
    const usersLastMonth = await clerk.users.getUserList({
      limit: 1,
      createdAt: {
        $lt: startOfMonth.getTime(),
      },
    });

    // Total revenue (completed payments)
    const revenueResult = await prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
      },
    });
    const totalRevenue = Number(revenueResult._sum.amount || 0);

    // Revenue this month
    const revenueThisMonth = await prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });

    // Revenue last month
    const revenueLastMonth = await prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { amount: true },
    });

    // Returns filed
    const returnsFiled = await prisma.taxReturn.count({
      where: {
        status: { in: ['FILED', 'ACCEPTED'] },
      },
    });

    // Returns this month
    const returnsThisMonth = await prisma.taxReturn.count({
      where: {
        status: { in: ['FILED', 'ACCEPTED'] },
        filedDate: { gte: startOfMonth },
      },
    });

    // Returns last month
    const returnsLastMonth = await prisma.taxReturn.count({
      where: {
        status: { in: ['FILED', 'ACCEPTED'] },
        filedDate: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    });

    // Active sessions (users created in last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const activeSessions = await prisma.profile.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Calculate growth percentages
    const revenueGrowth =
      Number(revenueLastMonth._sum.amount || 0) > 0
        ? ((Number(revenueThisMonth._sum.amount || 0) - Number(revenueLastMonth._sum.amount || 0)) /
            Number(revenueLastMonth._sum.amount || 0)) *
          100
        : 0;

    const usersGrowth =
      usersLastMonth.totalCount > 0
        ? ((totalUsers - usersLastMonth.totalCount) / usersLastMonth.totalCount) * 100
        : 0;

    const returnsGrowth =
      returnsLastMonth > 0 ? ((returnsThisMonth - returnsLastMonth) / returnsLastMonth) * 100 : 0;

    return {
      totalUsers,
      totalRevenue,
      returnsFiled,
      activeSessions,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      usersGrowth: Math.round(usersGrowth * 10) / 10,
      returnsGrowth: Math.round(returnsGrowth * 10) / 10,
    };
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    // Return safe defaults
    return {
      totalUsers: 0,
      totalRevenue: 0,
      returnsFiled: 0,
      activeSessions: 0,
      revenueGrowth: 0,
      usersGrowth: 0,
      returnsGrowth: 0,
    };
  }
}

/**
 * Get recent activity feed (last 20 events)
 */
export async function getRecentActivity(): Promise<RecentActivity[]> {
  try {
    const activities: RecentActivity[] = [];

    // Get recent payments
    const recentPayments = await prisma.payment.findMany({
      where: { status: 'COMPLETED' },
      include: { profile: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    recentPayments.forEach((payment) => {
      const timeDiff = Date.now() - payment.createdAt.getTime();
      const minutesAgo = Math.floor(timeDiff / 60000);
      const hoursAgo = Math.floor(minutesAgo / 60);
      const timeStr =
        hoursAgo > 0
          ? `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`
          : `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;

      activities.push({
        user: `${payment.profile.firstName || 'User'} ${payment.profile.lastName || ''}`.trim(),
        action: 'Made a payment',
        time: timeStr,
        badge: 'success',
      });
    });

    // Get recent returns filed
    const recentReturns = await prisma.taxReturn.findMany({
      where: { status: { in: ['FILED', 'ACCEPTED'] } },
      include: { profile: true },
      orderBy: { filedDate: 'desc' },
      take: 5,
    });

    recentReturns.forEach((taxReturn) => {
      if (taxReturn.filedDate) {
        const timeDiff = Date.now() - taxReturn.filedDate.getTime();
        const minutesAgo = Math.floor(timeDiff / 60000);
        const hoursAgo = Math.floor(minutesAgo / 60);
        const daysAgo = Math.floor(hoursAgo / 24);
        const timeStr =
          daysAgo > 0
            ? `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`
            : hoursAgo > 0
              ? `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`
              : `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;

        activities.push({
          user: `${taxReturn.profile.firstName || 'User'} ${taxReturn.profile.lastName || ''}`.trim(),
          action: 'Filed tax return',
          time: timeStr,
          badge: 'success',
        });
      }
    });

    // Get recent referrals
    const recentReferrals = await prisma.referral.findMany({
      include: {
        referrer: true,
        client: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    recentReferrals.forEach((referral) => {
      const timeDiff = Date.now() - referral.createdAt.getTime();
      const minutesAgo = Math.floor(timeDiff / 60000);
      const hoursAgo = Math.floor(minutesAgo / 60);
      const daysAgo = Math.floor(hoursAgo / 24);
      const timeStr =
        daysAgo > 0
          ? `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`
          : hoursAgo > 0
            ? `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`
            : `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;

      activities.push({
        user: `${referral.referrer.firstName || 'Referrer'} ${referral.referrer.lastName || ''}`.trim(),
        action: 'Referred a new client',
        time: timeStr,
        badge: 'info',
      });
    });

    // Sort by most recent and take top 20
    return activities.slice(0, 20);
  } catch (error) {
    logger.error('Error fetching recent activity:', error);
    return [];
  }
}

/**
 * Get revenue data for last 6 months
 */
export async function getRevenueData(): Promise<RevenueData[]> {
  try {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const revenue = await prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: date,
            lt: nextMonth,
          },
        },
        _sum: { amount: true },
      });

      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        value: Number(revenue._sum.amount || 0),
      });
    }

    // Calculate heights based on max value
    const maxValue = Math.max(...months.map((m) => m.value), 1);
    return months.map((m) => ({
      ...m,
      height: `${(m.value / maxValue) * 100}%`,
    }));
  } catch (error) {
    logger.error('Error fetching revenue data:', error);
    return [];
  }
}

/**
 * Get user growth data for last 6 months
 */
export async function getUserGrowthData(): Promise<UserGrowthData[]> {
  try {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const userCount = await prisma.profile.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextMonth,
          },
        },
      });

      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        value: userCount,
      });
    }

    // Calculate heights based on max value
    const maxValue = Math.max(...months.map((m) => m.value), 1);
    return months.map((m) => ({
      ...m,
      height: `${(m.value / maxValue) * 100}%`,
    }));
  } catch (error) {
    logger.error('Error fetching user growth data:', error);
    return [];
  }
}

/**
 * Get top performing services
 */
export async function getTopServices(): Promise<TopService[]> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get revenue by payment type this month
    const paymentsThisMonth = await prisma.payment.groupBy({
      by: ['type'],
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
      _count: true,
    });

    const services: TopService[] = paymentsThisMonth.map((payment, index) => {
      const serviceName =
        payment.type === 'TAX_PREP_FEE'
          ? 'Personal Tax Filing'
          : payment.type === 'COMMISSION'
            ? 'Referral Commissions'
            : 'Other Services';

      const colors = [
        'bg-blue-500',
        'bg-green-500',
        'bg-purple-500',
        'bg-orange-500',
        'bg-red-500',
      ];

      return {
        name: serviceName,
        revenue: `$${Number(payment._sum.amount || 0).toLocaleString()}`,
        growth: '+0%', // TODO: Calculate growth vs last month
        color: colors[index % colors.length],
      };
    });

    return services.slice(0, 5);
  } catch (error) {
    logger.error('Error fetching top services:', error);
    return [];
  }
}

/**
 * Get user activity by role
 */
export async function getUserActivity(): Promise<UserActivityData[]> {
  try {
    const roles: UserRole[] = [
      UserRole.CLIENT,
      UserRole.TAX_PREPARER,
      UserRole.REFERRER,
      UserRole.AFFILIATE,
    ];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activity: UserActivityData[] = [];

    for (const role of roles) {
      const totalCount = await prisma.profile.count({
        where: { role },
      });

      const activeCount = await prisma.profile.count({
        where: {
          role,
          createdAt: { gte: thirtyDaysAgo },
        },
      });

      const percentage = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

      const colorMap: Record<string, string> = {
        CLIENT: 'bg-gray-500',
        TAX_PREPARER: 'bg-blue-500',
        REFERRER: 'bg-green-500',
        AFFILIATE: 'bg-purple-500',
      };

      activity.push({
        role: role.charAt(0) + role.slice(1).toLowerCase().replace('_', ' ') + 's',
        count: totalCount,
        percentage,
        active: activeCount,
        color: colorMap[role],
      });
    }

    return activity;
  } catch (error) {
    logger.error('Error fetching user activity:', error);
    return [];
  }
}

/**
 * Get conversion funnel data
 */
export async function getConversionFunnel(): Promise<ConversionStage[]> {
  try {
    // Stage 1: Leads (visitors who submitted lead forms)
    const totalLeads = await prisma.lead.count();

    // Stage 2: Signups (profiles created)
    const totalSignups = await prisma.profile.count();

    // Stage 3: Started Filing (tax returns in any status)
    const startedFiling = await prisma.taxReturn.count();

    // Stage 4: Uploaded Documents
    const uploadedDocs = await prisma.document.count({
      where: {
        taxReturnId: { not: null },
      },
    });

    // Stage 5: Completed Returns (filed or accepted)
    const completedReturns = await prisma.taxReturn.count({
      where: {
        status: { in: ['FILED', 'ACCEPTED'] },
      },
    });

    // Calculate percentages (base 100% on total leads or signups, whichever is higher)
    const baseCount = Math.max(totalLeads, totalSignups, 1);

    return [
      {
        stage: 'Visited Site / Leads',
        count: totalLeads,
        percentage: 100,
        color: 'bg-blue-500',
      },
      {
        stage: 'Signed Up',
        count: totalSignups,
        percentage: Math.round((totalSignups / baseCount) * 100),
        color: 'bg-blue-600',
      },
      {
        stage: 'Started Filing',
        count: startedFiling,
        percentage: Math.round((startedFiling / baseCount) * 100),
        color: 'bg-blue-700',
      },
      {
        stage: 'Uploaded Documents',
        count: uploadedDocs,
        percentage: Math.round((uploadedDocs / baseCount) * 100),
        color: 'bg-blue-800',
      },
      {
        stage: 'Completed Return',
        count: completedReturns,
        percentage: Math.round((completedReturns / baseCount) * 100),
        color: 'bg-blue-900',
      },
    ];
  } catch (error) {
    logger.error('Error fetching conversion funnel:', error);
    return [];
  }
}

/**
 * Get revenue chart data for last 7 days (for dashboard)
 */
export async function getRevenueChart() {
  try {
    const days = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const revenue = await prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: date,
            lt: nextDay,
          },
        },
        _sum: { amount: true },
      });

      days.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        value: Number(revenue._sum.amount || 0),
      });
    }

    const maxValue = Math.max(...days.map((d) => d.value), 1);
    return days.map((d) => ({
      ...d,
      height: `${(d.value / maxValue) * 90}%`, // Max 90% height for visual spacing
    }));
  } catch (error) {
    logger.error('Error fetching revenue chart:', error);
    return [];
  }
}

/**
 * Get top performing pages by traffic
 */
export async function getPagePerformance() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Group by path and sum views
    const pages = await prisma.pageAnalytics.groupBy({
      by: ['path'],
      where: {
        date: { gte: sevenDaysAgo },
      },
      _sum: {
        views: true,
        uniqueVisitors: true,
        conversions: true,
      },
      _avg: {
        bounceRate: true,
      },
      orderBy: {
        _sum: {
          views: 'desc',
        },
      },
      take: 5,
    });

    return pages.map((page) => ({
      path: page.path,
      views: page._sum.views || 0,
      visitors: page._sum.uniqueVisitors || 0,
      conversions: page._sum.conversions || 0,
      bounceRate: page._avg.bounceRate ? Math.round(page._avg.bounceRate) : 0,
      conversionRate:
        page._sum.views && page._sum.conversions
          ? Math.round((page._sum.conversions / page._sum.views) * 100)
          : 0,
    }));
  } catch (error) {
    logger.error('Error fetching page performance:', error);
    return [];
  }
}

/**
 * Get traffic sources breakdown
 */
export async function getTrafficSources() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const sources = await prisma.pageAnalytics.groupBy({
      by: ['source'],
      where: {
        date: { gte: sevenDaysAgo },
      },
      _sum: {
        views: true,
      },
    });

    const total = sources.reduce((sum, s) => sum + (s._sum.views || 0), 0);

    return sources.map((source) => ({
      source: source.source || 'direct',
      views: source._sum.views || 0,
      percentage: total > 0 ? Math.round(((source._sum.views || 0) / total) * 100) : 0,
    }));
  } catch (error) {
    logger.error('Error fetching traffic sources:', error);
    return [];
  }
}

/**
 * Get AI content performance metrics
 */
export async function getAIContentMetrics() {
  try {
    // AI generated landing pages
    const aiGenerated = await prisma.landingPage.count({
      where: { generatedBy: { not: null } },
    });

    const published = await prisma.landingPage.count({
      where: {
        generatedBy: { not: null },
        isPublished: true,
      },
    });

    // Content performance for AI pages
    const aiPerformance = await prisma.contentPerformance.aggregate({
      where: { contentType: 'ai_generated' },
      _sum: {
        views: true,
        clicks: true,
        conversions: true,
      },
      _avg: {
        ctr: true,
        conversionRate: true,
      },
    });

    return {
      generated: aiGenerated,
      published,
      totalViews: aiPerformance._sum.views || 0,
      totalClicks: aiPerformance._sum.clicks || 0,
      totalConversions: aiPerformance._sum.conversions || 0,
      avgCTR: aiPerformance._avg.ctr ? Math.round(aiPerformance._avg.ctr * 10) / 10 : 0,
      avgConversionRate: aiPerformance._avg.conversionRate
        ? Math.round(aiPerformance._avg.conversionRate * 10) / 10
        : 0,
    };
  } catch (error) {
    logger.error('Error fetching AI content metrics:', error);
    return {
      generated: 0,
      published: 0,
      totalViews: 0,
      totalClicks: 0,
      totalConversions: 0,
      avgCTR: 0,
      avgConversionRate: 0,
    };
  }
}

/**
 * Get pending actions count for quick alerts
 */
export async function getPendingActionsCount() {
  try {
    // Pending payouts
    const pendingPayouts = await prisma.payoutRequest.count({
      where: { status: 'PENDING' },
    });

    // New leads in last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newLeads = await prisma.lead.count({
      where: {
        status: 'NEW',
        createdAt: { gte: twentyFourHoursAgo },
      },
    });

    // Failed payments in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const failedPayments = await prisma.payment.count({
      where: {
        status: 'FAILED',
        createdAt: { gte: sevenDaysAgo },
      },
    });

    const failedPaymentsAmount = await prisma.payment.aggregate({
      where: {
        status: 'FAILED',
        createdAt: { gte: sevenDaysAgo },
      },
      _sum: { amount: true },
    });

    return {
      pendingPayouts,
      newLeads,
      failedPayments,
      failedPaymentsAmount: Number(failedPaymentsAmount._sum.amount || 0),
    };
  } catch (error) {
    logger.error('Error fetching pending actions:', error);
    return {
      pendingPayouts: 0,
      newLeads: 0,
      failedPayments: 0,
      failedPaymentsAmount: 0,
    };
  }
}
