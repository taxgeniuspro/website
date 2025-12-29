/**
 * Analytics Service
 *
 * Provides real-time analytics aggregation from database
 * Used by admin dashboard and analytics pages
 */

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
type UserRole = 'CLIENT' | 'TAX_PREPARER' | 'REFERRER' | 'AFFILIATE' | 'ADMIN';

// Database record interfaces
interface PaymentRecord {
  id: string;
  amount?: number | null;
  status: string;
  type?: string | null;
  createdAt: string;
  profile: {
    firstName?: string | null;
    lastName?: string | null;
  };
}

interface TaxReturnRecord {
  id: string;
  status: string;
  filedDate?: string | null;
  profile: {
    firstName?: string | null;
    lastName?: string | null;
  };
}

interface ReferralRecord {
  id: string;
  createdAt: string;
  referrer: {
    firstName?: string | null;
    lastName?: string | null;
  };
  client: {
    firstName?: string | null;
    lastName?: string | null;
  };
}

interface ProfileRecord {
  id: string;
  role: string;
  createdAt: string;
}

interface PageAnalyticsRecord {
  path: string;
  source?: string | null;
  views?: number | null;
  uniqueVisitors?: number | null;
  conversions?: number | null;
  bounceRate?: number | null;
  date: string;
}

interface LandingPageRecord {
  id: string;
  generatedBy?: string | null;
  isPublished: boolean;
}

interface ContentPerformanceRecord {
  contentType: string;
  views?: number | null;
  clicks?: number | null;
  conversions?: number | null;
  ctr?: number | null;
  conversionRate?: number | null;
}

interface PayoutRequestRecord {
  id: string;
  status: string;
}

interface LeadRecord {
  id: string;
  status: string;
  createdAt: string;
}

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

    // Total users from database
    const { count: totalUsers } = await db
      .from('users')
      .select('id', { count: 'exact', head: true });

    // Users created before this month (for growth calculation)
    const { count: usersLastMonthCount } = await db
      .from('users')
      .select('id', { count: 'exact', head: true })
      .lt('createdAt', startOfMonth.toISOString());

    // Total revenue (completed payments) - manual sum
    const { data: completedPayments } = await db
      .from('payments')
      .select('amount')
      .eq('status', 'COMPLETED');

    const totalRevenue = (completedPayments || []).reduce(
      (sum: number, p: { amount?: number | null }) => sum + (p.amount || 0),
      0
    );

    // Revenue this month
    const { data: paymentsThisMonth } = await db
      .from('payments')
      .select('amount')
      .eq('status', 'COMPLETED')
      .gte('createdAt', startOfMonth.toISOString());

    const revenueThisMonthAmount = (paymentsThisMonth || []).reduce(
      (sum: number, p: { amount?: number | null }) => sum + (p.amount || 0),
      0
    );

    // Revenue last month
    const { data: paymentsLastMonth } = await db
      .from('payments')
      .select('amount')
      .eq('status', 'COMPLETED')
      .gte('createdAt', startOfLastMonth.toISOString())
      .lte('createdAt', endOfLastMonth.toISOString());

    const revenueLastMonthAmount = (paymentsLastMonth || []).reduce(
      (sum: number, p: { amount?: number | null }) => sum + (p.amount || 0),
      0
    );

    // Returns filed
    const { count: returnsFiled } = await db
      .from('tax_returns')
      .select('id', { count: 'exact', head: true })
      .in('status', ['FILED', 'ACCEPTED']);

    // Returns this month
    const { count: returnsThisMonth } = await db
      .from('tax_returns')
      .select('id', { count: 'exact', head: true })
      .in('status', ['FILED', 'ACCEPTED'])
      .gte('filedDate', startOfMonth.toISOString());

    // Returns last month
    const { count: returnsLastMonth } = await db
      .from('tax_returns')
      .select('id', { count: 'exact', head: true })
      .in('status', ['FILED', 'ACCEPTED'])
      .gte('filedDate', startOfLastMonth.toISOString())
      .lte('filedDate', endOfLastMonth.toISOString());

    // Active sessions (users created in last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const { count: activeSessions } = await db
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('createdAt', thirtyDaysAgo.toISOString());

    // Calculate growth percentages
    const revenueGrowth =
      revenueLastMonthAmount > 0
        ? ((revenueThisMonthAmount - revenueLastMonthAmount) / revenueLastMonthAmount) * 100
        : 0;

    const usersGrowth =
      (usersLastMonthCount || 0) > 0
        ? (((totalUsers || 0) - (usersLastMonthCount || 0)) / (usersLastMonthCount || 1)) * 100
        : 0;

    const returnsGrowthValue =
      (returnsLastMonth || 0) > 0
        ? (((returnsThisMonth || 0) - (returnsLastMonth || 0)) / (returnsLastMonth || 1)) * 100
        : 0;

    return {
      totalUsers: totalUsers || 0,
      totalRevenue,
      returnsFiled: returnsFiled || 0,
      activeSessions: activeSessions || 0,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      usersGrowth: Math.round(usersGrowth * 10) / 10,
      returnsGrowth: Math.round(returnsGrowthValue * 10) / 10,
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

    // Get recent payments with profile join
    const { data: recentPaymentsData } = await db
      .from('payments')
      .select('id, createdAt, profile:profiles(firstName, lastName)')
      .eq('status', 'COMPLETED')
      .order('createdAt', { ascending: false })
      .limit(5);

    const recentPayments = (recentPaymentsData || []) as Array<{
      id: string;
      createdAt: string;
      profile: { firstName?: string | null; lastName?: string | null };
    }>;

    recentPayments.forEach((payment) => {
      const timeDiff = Date.now() - new Date(payment.createdAt).getTime();
      const minutesAgo = Math.floor(timeDiff / 60000);
      const hoursAgo = Math.floor(minutesAgo / 60);
      const timeStr =
        hoursAgo > 0
          ? `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`
          : `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;

      activities.push({
        user: `${payment.profile?.firstName || 'User'} ${payment.profile?.lastName || ''}`.trim(),
        action: 'Made a payment',
        time: timeStr,
        badge: 'success',
      });
    });

    // Get recent returns filed with profile join
    const { data: recentReturnsData } = await db
      .from('tax_returns')
      .select('id, filedDate, profile:profiles(firstName, lastName)')
      .in('status', ['FILED', 'ACCEPTED'])
      .order('filedDate', { ascending: false })
      .limit(5);

    const recentReturns = (recentReturnsData || []) as Array<{
      id: string;
      filedDate?: string | null;
      profile: { firstName?: string | null; lastName?: string | null };
    }>;

    recentReturns.forEach((taxReturn) => {
      if (taxReturn.filedDate) {
        const timeDiff = Date.now() - new Date(taxReturn.filedDate).getTime();
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
          user: `${taxReturn.profile?.firstName || 'User'} ${taxReturn.profile?.lastName || ''}`.trim(),
          action: 'Filed tax return',
          time: timeStr,
          badge: 'success',
        });
      }
    });

    // Get recent referrals with joins
    const { data: recentReferralsData } = await db
      .from('referrals')
      .select('id, createdAt, referrer:profiles!referrerId(firstName, lastName), client:profiles!clientId(firstName, lastName)')
      .order('createdAt', { ascending: false })
      .limit(5);

    const recentReferrals = (recentReferralsData || []) as Array<{
      id: string;
      createdAt: string;
      referrer: { firstName?: string | null; lastName?: string | null };
      client: { firstName?: string | null; lastName?: string | null };
    }>;

    recentReferrals.forEach((referral) => {
      const timeDiff = Date.now() - new Date(referral.createdAt).getTime();
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
        user: `${referral.referrer?.firstName || 'Referrer'} ${referral.referrer?.lastName || ''}`.trim(),
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

      // Supabase: fetch and sum manually instead of aggregate
      const { data: paymentsData } = await db
        .from('payments')
        .select('amount')
        .eq('status', 'COMPLETED')
        .gte('createdAt', date.toISOString())
        .lt('createdAt', nextMonth.toISOString());

      const revenueSum = (paymentsData || []).reduce(
        (sum: number, p: { amount?: number | null }) => sum + (p.amount || 0),
        0
      );

      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        value: revenueSum,
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

      // Supabase count query
      const { count: userCount } = await db
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('createdAt', date.toISOString())
        .lt('createdAt', nextMonth.toISOString());

      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        value: userCount || 0,
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

    // Supabase: fetch all payments and group manually (no groupBy support)
    const { data: paymentsData } = await db
      .from('payments')
      .select('type, amount')
      .eq('status', 'COMPLETED')
      .gte('createdAt', startOfMonth.toISOString());

    // Group by type manually
    const grouped = new Map<string, { total: number; count: number }>();
    for (const payment of (paymentsData || []) as { type?: string | null; amount?: number | null }[]) {
      const type = payment.type || 'OTHER';
      const existing = grouped.get(type) || { total: 0, count: 0 };
      existing.total += payment.amount || 0;
      existing.count += 1;
      grouped.set(type, existing);
    }

    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-red-500',
    ];

    const services: TopService[] = Array.from(grouped.entries()).map(([type, data], index) => {
      const serviceName =
        type === 'TAX_PREP_FEE'
          ? 'Personal Tax Filing'
          : type === 'COMMISSION'
            ? 'Referral Commissions'
            : 'Other Services';

      return {
        name: serviceName,
        revenue: `$${data.total.toLocaleString()}`,
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
    const roles: UserRole[] = ['CLIENT', 'TAX_PREPARER', 'REFERRER', 'AFFILIATE'];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activity: UserActivityData[] = [];

    for (const role of roles) {
      // Supabase count queries
      const { count: totalCount } = await db
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', role);

      const { count: activeCount } = await db
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', role)
        .gte('createdAt', thirtyDaysAgo.toISOString());

      const total = totalCount || 0;
      const active = activeCount || 0;
      const percentage = total > 0 ? Math.round((active / total) * 100) : 0;

      const colorMap: Record<string, string> = {
        CLIENT: 'bg-gray-500',
        TAX_PREPARER: 'bg-blue-500',
        REFERRER: 'bg-green-500',
        AFFILIATE: 'bg-purple-500',
      };

      activity.push({
        role: role.charAt(0) + role.slice(1).toLowerCase().replace('_', ' ') + 's',
        count: total,
        percentage,
        active,
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
    const { count: totalLeads } = await db
      .from('leads')
      .select('id', { count: 'exact', head: true });

    // Stage 2: Signups (profiles created)
    const { count: totalSignups } = await db
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    // Stage 3: Started Filing (tax returns in any status)
    const { count: startedFiling } = await db
      .from('tax_returns')
      .select('id', { count: 'exact', head: true });

    // Stage 4: Uploaded Documents (documents with taxReturnId)
    const { count: uploadedDocs } = await db
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .not('taxReturnId', 'is', null);

    // Stage 5: Completed Returns (filed or accepted)
    const { count: completedReturns } = await db
      .from('tax_returns')
      .select('id', { count: 'exact', head: true })
      .in('status', ['FILED', 'ACCEPTED']);

    // Calculate percentages (base 100% on total leads or signups, whichever is higher)
    const leads = totalLeads || 0;
    const signups = totalSignups || 0;
    const filing = startedFiling || 0;
    const docs = uploadedDocs || 0;
    const completed = completedReturns || 0;
    const baseCount = Math.max(leads, signups, 1);

    return [
      {
        stage: 'Visited Site / Leads',
        count: leads,
        percentage: 100,
        color: 'bg-blue-500',
      },
      {
        stage: 'Signed Up',
        count: signups,
        percentage: Math.round((signups / baseCount) * 100),
        color: 'bg-blue-600',
      },
      {
        stage: 'Started Filing',
        count: filing,
        percentage: Math.round((filing / baseCount) * 100),
        color: 'bg-blue-700',
      },
      {
        stage: 'Uploaded Documents',
        count: docs,
        percentage: Math.round((docs / baseCount) * 100),
        color: 'bg-blue-800',
      },
      {
        stage: 'Completed Return',
        count: completed,
        percentage: Math.round((completed / baseCount) * 100),
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

      // Supabase: fetch and sum manually
      const { data: paymentsData } = await db
        .from('payments')
        .select('amount')
        .eq('status', 'COMPLETED')
        .gte('createdAt', date.toISOString())
        .lt('createdAt', nextDay.toISOString());

      const revenueSum = (paymentsData || []).reduce(
        (sum: number, p: { amount?: number | null }) => sum + (p.amount || 0),
        0
      );

      days.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        value: revenueSum,
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

    // Supabase: fetch all and group manually (no groupBy support)
    const { data: pagesData } = await db
      .from('page_analytics')
      .select('path, views, uniqueVisitors, conversions, bounceRate')
      .gte('date', sevenDaysAgo.toISOString());

    // Group by path manually
    const grouped = new Map<
      string,
      {
        views: number;
        visitors: number;
        conversions: number;
        bounceRates: number[];
      }
    >();

    for (const page of (pagesData || []) as PageAnalyticsRecord[]) {
      const path = page.path;
      const existing = grouped.get(path) || {
        views: 0,
        visitors: 0,
        conversions: 0,
        bounceRates: [],
      };
      existing.views += page.views || 0;
      existing.visitors += page.uniqueVisitors || 0;
      existing.conversions += page.conversions || 0;
      if (page.bounceRate != null) existing.bounceRates.push(page.bounceRate);
      grouped.set(path, existing);
    }

    // Convert to array and sort by views descending
    const sortedPages = Array.from(grouped.entries())
      .map(([path, data]) => ({
        path,
        views: data.views,
        visitors: data.visitors,
        conversions: data.conversions,
        bounceRate:
          data.bounceRates.length > 0
            ? Math.round(data.bounceRates.reduce((a, b) => a + b, 0) / data.bounceRates.length)
            : 0,
        conversionRate:
          data.views > 0 && data.conversions > 0
            ? Math.round((data.conversions / data.views) * 100)
            : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    return sortedPages;
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

    // Supabase: fetch all and group manually
    const { data: pagesData } = await db
      .from('page_analytics')
      .select('source, views')
      .gte('date', sevenDaysAgo.toISOString());

    // Group by source manually
    const grouped = new Map<string, number>();
    for (const page of (pagesData || []) as { source?: string | null; views?: number | null }[]) {
      const source = page.source || 'direct';
      grouped.set(source, (grouped.get(source) || 0) + (page.views || 0));
    }

    const total = Array.from(grouped.values()).reduce((sum, v) => sum + v, 0);

    return Array.from(grouped.entries()).map(([source, views]) => ({
      source,
      views,
      percentage: total > 0 ? Math.round((views / total) * 100) : 0,
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
    // AI generated landing pages (generatedBy is not null)
    const { count: aiGenerated } = await db
      .from('landing_pages')
      .select('id', { count: 'exact', head: true })
      .not('generatedBy', 'is', null);

    const { count: published } = await db
      .from('landing_pages')
      .select('id', { count: 'exact', head: true })
      .not('generatedBy', 'is', null)
      .eq('isPublished', true);

    // Content performance for AI pages - fetch and aggregate manually
    const { data: perfData } = await db
      .from('content_performance')
      .select('views, clicks, conversions, ctr, conversionRate')
      .eq('contentType', 'ai_generated');

    let totalViews = 0;
    let totalClicks = 0;
    let totalConversions = 0;
    const ctrs: number[] = [];
    const conversionRates: number[] = [];

    for (const perf of (perfData || []) as ContentPerformanceRecord[]) {
      totalViews += perf.views || 0;
      totalClicks += perf.clicks || 0;
      totalConversions += perf.conversions || 0;
      if (perf.ctr != null) ctrs.push(perf.ctr);
      if (perf.conversionRate != null) conversionRates.push(perf.conversionRate);
    }

    const avgCTR = ctrs.length > 0 ? ctrs.reduce((a, b) => a + b, 0) / ctrs.length : 0;
    const avgConvRate =
      conversionRates.length > 0
        ? conversionRates.reduce((a, b) => a + b, 0) / conversionRates.length
        : 0;

    return {
      generated: aiGenerated || 0,
      published: published || 0,
      totalViews,
      totalClicks,
      totalConversions,
      avgCTR: Math.round(avgCTR * 10) / 10,
      avgConversionRate: Math.round(avgConvRate * 10) / 10,
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
    const { count: pendingPayouts } = await db
      .from('payout_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING');

    // New leads in last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { count: newLeads } = await db
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'NEW')
      .gte('createdAt', twentyFourHoursAgo.toISOString());

    // Failed payments in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { count: failedPayments } = await db
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'FAILED')
      .gte('createdAt', sevenDaysAgo.toISOString());

    // Sum failed payment amounts
    const { data: failedPaymentsData } = await db
      .from('payments')
      .select('amount')
      .eq('status', 'FAILED')
      .gte('createdAt', sevenDaysAgo.toISOString());

    const failedPaymentsAmount = (failedPaymentsData || []).reduce(
      (sum: number, p: { amount?: number | null }) => sum + (p.amount || 0),
      0
    );

    return {
      pendingPayouts: pendingPayouts || 0,
      newLeads: newLeads || 0,
      failedPayments: failedPayments || 0,
      failedPaymentsAmount,
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
