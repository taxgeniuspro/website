/**
 * Preparer Analytics Service
 *
 * Individual preparer performance metrics and dashboard data
 * Used by tax preparer dashboards and admin oversight
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface PreparerDashboardStats {
  totalIntakesForms: number;
  totalReferrals: number;
  returnsInProgress: number;
  returnsCompleted: number;
  earningsThisMonth: number;
  totalEarnings: number;
  averageResponseTime: number; // hours
  missedFollowUpsCount: number;
}

export interface TopReferrer {
  id: string;
  name: string;
  referralCount: number;
  conversionRate: number;
}

export interface PreparerLinkPerformance {
  linkId: string;
  title: string;
  clicks: number;
  conversions: number;
  conversionRate: number;
}

export interface MissedFollowUp {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  contactMethod: string;
  daysWaiting: number;
  requestedAt: Date;
  source: string; // "Lead" or "TaxIntake"
  urgency?: 'critical' | 'high' | 'medium' | 'low';
}

// ============================================
// NEW: Dashboard Home Analytics Types
// ============================================

export interface TodayScheduleData {
  scheduled: number;
  pending: number;
  completed: number;
  cancelled: number;
}

export interface MetricWithTrend {
  value: number;
  previousValue: number;
  trend: number; // percentage change
  trendDirection: 'up' | 'down' | 'neutral';
}

export interface TodaysDashboardData {
  appointments: TodayScheduleData;
  linkClicks: MetricWithTrend;
  intakeForms: MetricWithTrend;
  appointmentsBooked: MetricWithTrend;
  earnings: MetricWithTrend;
}

export interface ConversionFunnelStage {
  name: string;
  value: number;
  percentage: number;
  dropOffRate: number;
  color: string;
}

export interface ClientSourceBreakdown {
  source: string;
  count: number;
  percentage: number;
  color: string;
}

export interface EarningsBreakdown {
  source: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface HotLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  clickedAt: Date;
  linkCode: string;
  linkTitle: string;
  hoursAgo: number;
}

export interface RecentActivityItem {
  id: string;
  type: 'link_click' | 'intake_submitted' | 'appointment_booked' | 'intake_started' | 'return_filed';
  description: string;
  timestamp: Date;
  timeAgo: string;
  metadata?: {
    clientName?: string;
    linkCode?: string;
    appointmentTime?: string;
  };
}

/**
 * Get dashboard stats for a specific preparer
 */
export async function getPreparerDashboardStats(
  preparerId: string
): Promise<PreparerDashboardStats> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count intake forms assigned to this preparer
    const totalIntakeForms = await prisma.clientIntake.count({
      where: { assignedPreparerId: preparerId },
    });

    // Count referrals (clients referred TO this preparer)
    const totalReferrals = await prisma.referral.count({
      where: {
        client: {
          preparerClients: {
            some: { preparerId },
          },
        },
      },
    });

    // Count returns in progress
    const returnsInProgress = await prisma.taxReturn.count({
      where: {
        profile: {
          preparerClients: {
            some: { preparerId },
          },
        },
        status: { in: ['DRAFT', 'IN_REVIEW'] },
      },
    });

    // Count returns completed
    const returnsCompleted = await prisma.taxReturn.count({
      where: {
        profile: {
          preparerClients: {
            some: { preparerId },
          },
        },
        status: { in: ['FILED', 'ACCEPTED'] },
      },
    });

    // Calculate earnings this month (if preparers earn commissions)
    const earningsThisMonth = await prisma.payment.aggregate({
      where: {
        profileId: preparerId,
        status: 'COMPLETED',
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });

    // Total earnings
    const totalEarnings = await prisma.payment.aggregate({
      where: {
        profileId: preparerId,
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    });

    // Calculate average response time
    const avgResponseTime = await calculateAverageResponseTime(preparerId);

    // Count missed follow-ups
    const missedFollowUps = await getMissedFollowUpsCount(preparerId);

    return {
      totalIntakesForms: totalIntakeForms,
      totalReferrals,
      returnsInProgress,
      returnsCompleted,
      earningsThisMonth: Number(earningsThisMonth._sum.amount || 0),
      totalEarnings: Number(totalEarnings._sum.amount || 0),
      averageResponseTime: avgResponseTime,
      missedFollowUpsCount: missedFollowUps,
    };
  } catch (error) {
    logger.error('Error fetching preparer dashboard stats:', error);
    return {
      totalIntakesForms: 0,
      totalReferrals: 0,
      returnsInProgress: 0,
      returnsCompleted: 0,
      earningsThisMonth: 0,
      totalEarnings: 0,
      averageResponseTime: 0,
      missedFollowUpsCount: 0,
    };
  }
}

/**
 * Calculate average response time for a preparer (in hours)
 */
async function calculateAverageResponseTime(preparerId: string): Promise<number> {
  try {
    // Get leads assigned to this preparer that were contacted
    const leads = await prisma.lead.findMany({
      where: {
        assignedPreparerId: preparerId,
        lastContactedAt: { not: null },
      },
      select: {
        createdAt: true,
        lastContactedAt: true,
      },
    });

    if (leads.length === 0) return 0;

    // Calculate average time difference
    const totalHours = leads.reduce((sum, lead) => {
      if (!lead.lastContactedAt) return sum;
      const diff = lead.lastContactedAt.getTime() - lead.createdAt.getTime();
      return sum + diff / (1000 * 60 * 60); // Convert to hours
    }, 0);

    return Math.round(totalHours / leads.length);
  } catch (error) {
    logger.error('Error calculating average response time:', error);
    return 0;
  }
}

/**
 * Get count of missed follow-ups for a preparer
 */
async function getMissedFollowUpsCount(preparerId: string): Promise<number> {
  try {
    const now = new Date();

    // Count leads that requested contact but haven't been contacted
    const missedLeads = await prisma.lead.count({
      where: {
        assignedPreparerId: preparerId,
        contactRequested: true,
        lastContactedAt: null,
      },
    });

    // Count tax intakes that requested contact but haven't been contacted
    const missedIntakes = await prisma.taxIntakeLead.count({
      where: {
        assignedPreparerId: preparerId,
        contactRequested: true,
        lastContactedAt: null,
      },
    });

    return missedLeads + missedIntakes;
  } catch (error) {
    logger.error('Error getting missed follow-ups count:', error);
    return 0;
  }
}

/**
 * Get detailed list of missed follow-ups for a preparer
 */
export async function getPreparerMissedFollowUps(preparerId: string): Promise<MissedFollowUp[]> {
  try {
    const now = new Date();
    const results: MissedFollowUp[] = [];

    // Get leads that need follow-up
    const leads = await prisma.lead.findMany({
      where: {
        assignedPreparerId: preparerId,
        contactRequested: true,
        lastContactedAt: null,
      },
      orderBy: { createdAt: 'asc' }, // Oldest first
    });

    leads.forEach((lead) => {
      const daysWaiting = Math.floor(
        (now.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      results.push({
        id: lead.id,
        clientId: lead.id,
        clientName: `${lead.firstName} ${lead.lastName}`,
        clientEmail: lead.email,
        clientPhone: lead.phone,
        contactMethod: lead.contactMethod || 'UNKNOWN',
        daysWaiting,
        requestedAt: lead.createdAt,
        source: 'Lead',
      });
    });

    // Get tax intakes that need follow-up
    const intakes = await prisma.taxIntakeLead.findMany({
      where: {
        assignedPreparerId: preparerId,
        contactRequested: true,
        lastContactedAt: null,
      },
      orderBy: { created_at: 'asc' },
    });

    intakes.forEach((intake) => {
      const daysWaiting = Math.floor(
        (now.getTime() - intake.created_at.getTime()) / (1000 * 60 * 60 * 24)
      );
      results.push({
        id: intake.id,
        clientId: intake.id,
        clientName: `${intake.first_name} ${intake.last_name}`,
        clientEmail: intake.email,
        clientPhone: intake.phone,
        contactMethod: intake.contactMethod || 'UNKNOWN',
        daysWaiting,
        requestedAt: intake.created_at,
        source: 'TaxIntake',
      });
    });

    // Sort by days waiting (most urgent first)
    results.sort((a, b) => b.daysWaiting - a.daysWaiting);

    return results;
  } catch (error) {
    logger.error('Error fetching preparer missed follow-ups:', error);
    return [];
  }
}

/**
 * Get top 10 referrers who sent clients to this preparer
 */
export async function getPreparerTopReferrers(
  preparerId: string,
  limit: number = 10
): Promise<TopReferrer[]> {
  try {
    // Get all referrals where the client was assigned to this preparer
    const referrals = await prisma.referral.groupBy({
      by: ['referrerId'],
      where: {
        client: {
          preparerClients: {
            some: { preparerId },
          },
        },
      },
      _count: true,
    });

    // Get referrer details
    const referrerIds = referrals.map((r) => r.referrerId);
    const referrers = await prisma.profile.findMany({
      where: { id: { in: referrerIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        referrerReferrals: {
          where: {
            client: {
              preparerClients: {
                some: { preparerId },
              },
            },
          },
          select: {
            status: true,
          },
        },
      },
    });

    const topReferrers: TopReferrer[] = referrers.map((referrer) => {
      const totalReferrals = referrer.referrerReferrals.length;
      const completedReferrals = referrer.referrerReferrals.filter(
        (r) => r.status === 'COMPLETED'
      ).length;
      const conversionRate =
        totalReferrals > 0 ? Math.round((completedReferrals / totalReferrals) * 100) : 0;

      return {
        id: referrer.id,
        name: `${referrer.firstName || ''} ${referrer.lastName || ''}`.trim() || 'Unknown',
        referralCount: totalReferrals,
        conversionRate,
      };
    });

    // Sort by referral count and take top N
    topReferrers.sort((a, b) => b.referralCount - a.referralCount);
    return topReferrers.slice(0, limit);
  } catch (error) {
    logger.error('Error fetching top referrers:', error);
    return [];
  }
}

/**
 * Get top 10 performing links for a preparer
 */
export async function getPreparerTopLinks(
  preparerId: string,
  limit: number = 10
): Promise<PreparerLinkPerformance[]> {
  try {
    const links = await prisma.marketingLink.findMany({
      where: {
        creatorId: preparerId,
        isActive: true,
      },
      orderBy: [{ conversions: 'desc' }, { clicks: 'desc' }],
      take: limit,
    });

    return links.map((link) => ({
      linkId: link.id,
      title: link.title || link.code,
      clicks: link.clicks,
      conversions: link.conversions,
      conversionRate: link.conversionRate || 0,
    }));
  } catch (error) {
    logger.error('Error fetching preparer top links:', error);
    return [];
  }
}

/**
 * Get top 10 preparers platform-wide by various metrics
 */
export async function getTopPreparers(
  metric: 'clients' | 'returns' | 'revenue' = 'clients',
  limit: number = 10
) {
  try {
    // This is a complex query - we'll get all preparers and calculate stats
    const preparers = await prisma.profile.findMany({
      where: { role: 'tax_preparer' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        preparerClients: {
          select: {
            clientId: true,
            client: {
              select: {
                taxReturns: {
                  select: {
                    status: true,
                  },
                },
                payments: {
                  where: { status: 'COMPLETED' },
                  select: {
                    amount: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const preparerStats = preparers.map((preparer) => {
      const totalClients = preparer.preparerClients.length;

      let totalReturns = 0;
      let totalRevenue = 0;

      preparer.preparerClients.forEach((pc) => {
        const returns = pc.client.taxReturns.filter(
          (tr) => tr.status === 'FILED' || tr.status === 'ACCEPTED'
        );
        totalReturns += returns.length;

        const revenue = pc.client.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        totalRevenue += revenue;
      });

      return {
        id: preparer.id,
        name: `${preparer.firstName || ''} ${preparer.lastName || ''}`.trim() || 'Unknown',
        totalClients,
        totalReturns,
        totalRevenue,
        conversionRate: totalClients > 0 ? Math.round((totalReturns / totalClients) * 100) : 0,
      };
    });

    // Sort by requested metric
    if (metric === 'clients') {
      preparerStats.sort((a, b) => b.totalClients - a.totalClients);
    } else if (metric === 'returns') {
      preparerStats.sort((a, b) => b.totalReturns - a.totalReturns);
    } else if (metric === 'revenue') {
      preparerStats.sort((a, b) => b.totalRevenue - a.totalRevenue);
    }

    return preparerStats.slice(0, limit);
  } catch (error) {
    logger.error('Error fetching top preparers:', error);
    return [];
  }
}

/**
 * Get preparer performance comparison (vs. platform average)
 */
export async function getPreparerPerformanceComparison(preparerId: string) {
  try {
    const preparerStats = await getPreparerDashboardStats(preparerId);

    // Get platform averages
    const allPreparers = await prisma.profile.count({
      where: { role: 'tax_preparer' },
    });

    const totalIntakes = await prisma.clientIntake.count();
    const totalReturns = await prisma.taxReturn.count({
      where: { status: { in: ['FILED', 'ACCEPTED'] } },
    });

    const avgIntakesPerPreparer = allPreparers > 0 ? Math.round(totalIntakes / allPreparers) : 0;
    const avgReturnsPerPreparer = allPreparers > 0 ? Math.round(totalReturns / allPreparers) : 0;

    return {
      preparer: {
        intakes: preparerStats.totalIntakesForms,
        returns: preparerStats.returnsCompleted,
        responseTime: preparerStats.averageResponseTime,
      },
      platformAverage: {
        intakes: avgIntakesPerPreparer,
        returns: avgReturnsPerPreparer,
        responseTime: 24, // Placeholder - would calculate from all preparers
      },
      performance: {
        intakesVsAvg: preparerStats.totalIntakesForms - avgIntakesPerPreparer,
        returnsVsAvg: preparerStats.returnsCompleted - avgReturnsPerPreparer,
      },
    };
  } catch (error) {
    logger.error('Error fetching preparer performance comparison:', error);
    return null;
  }
}

// ============================================
// NEW: Dashboard Home Analytics Functions
// ============================================

/**
 * Helper function to calculate trend between two values
 */
function calculateTrend(current: number, previous: number): MetricWithTrend {
  const trend = previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;
  return {
    value: current,
    previousValue: previous,
    trend: Math.abs(trend),
    trendDirection: trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral',
  };
}

/**
 * Helper function to format time ago string
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

/**
 * Get today's dashboard data with trends vs yesterday
 */
export async function getTodaysDashboardData(preparerId: string): Promise<TodaysDashboardData> {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

    // Get preparer's marketing links
    const preparerLinks = await prisma.marketingLink.findMany({
      where: { creatorId: preparerId },
      select: { id: true },
    });
    const linkIds = preparerLinks.map(l => l.id);

    // Today's appointments by status
    const todayAppointments = await prisma.appointment.groupBy({
      by: ['status'],
      where: {
        preparerId,
        scheduledFor: {
          gte: startOfToday,
          lt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      _count: true,
    });

    const appointments: TodayScheduleData = {
      scheduled: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
    };

    todayAppointments.forEach(apt => {
      if (apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED') {
        appointments.scheduled += apt._count;
      } else if (apt.status === 'PENDING_APPROVAL' || apt.status === 'REQUESTED') {
        appointments.pending += apt._count;
      } else if (apt.status === 'COMPLETED') {
        appointments.completed += apt._count;
      } else if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') {
        appointments.cancelled += apt._count;
      }
    });

    // Link clicks today vs yesterday
    const clicksToday = linkIds.length > 0 ? await prisma.linkClick.count({
      where: {
        linkId: { in: linkIds },
        clickedAt: { gte: startOfToday },
      },
    }) : 0;

    const clicksYesterday = linkIds.length > 0 ? await prisma.linkClick.count({
      where: {
        linkId: { in: linkIds },
        clickedAt: {
          gte: startOfYesterday,
          lt: startOfToday,
        },
      },
    }) : 0;

    // Intake forms today vs yesterday
    const intakesToday = await prisma.taxIntakeLead.count({
      where: {
        assignedPreparerId: preparerId,
        created_at: { gte: startOfToday },
      },
    });

    const intakesYesterday = await prisma.taxIntakeLead.count({
      where: {
        assignedPreparerId: preparerId,
        created_at: {
          gte: startOfYesterday,
          lt: startOfToday,
        },
      },
    });

    // Appointments booked today vs yesterday
    const bookedToday = await prisma.appointment.count({
      where: {
        preparerId,
        requestedAt: { gte: startOfToday },
      },
    });

    const bookedYesterday = await prisma.appointment.count({
      where: {
        preparerId,
        requestedAt: {
          gte: startOfYesterday,
          lt: startOfToday,
        },
      },
    });

    // Earnings today vs yesterday
    const earningsToday = await prisma.payment.aggregate({
      where: {
        profileId: preparerId,
        status: 'COMPLETED',
        createdAt: { gte: startOfToday },
      },
      _sum: { amount: true },
    });

    const earningsYesterday = await prisma.payment.aggregate({
      where: {
        profileId: preparerId,
        status: 'COMPLETED',
        createdAt: {
          gte: startOfYesterday,
          lt: startOfToday,
        },
      },
      _sum: { amount: true },
    });

    return {
      appointments,
      linkClicks: calculateTrend(clicksToday, clicksYesterday),
      intakeForms: calculateTrend(intakesToday, intakesYesterday),
      appointmentsBooked: calculateTrend(bookedToday, bookedYesterday),
      earnings: calculateTrend(
        Number(earningsToday._sum.amount || 0),
        Number(earningsYesterday._sum.amount || 0)
      ),
    };
  } catch (error) {
    logger.error('Error fetching todays dashboard data:', error);
    return {
      appointments: { scheduled: 0, pending: 0, completed: 0, cancelled: 0 },
      linkClicks: { value: 0, previousValue: 0, trend: 0, trendDirection: 'neutral' },
      intakeForms: { value: 0, previousValue: 0, trend: 0, trendDirection: 'neutral' },
      appointmentsBooked: { value: 0, previousValue: 0, trend: 0, trendDirection: 'neutral' },
      earnings: { value: 0, previousValue: 0, trend: 0, trendDirection: 'neutral' },
    };
  }
}

/**
 * Get conversion funnel data for a preparer
 */
export async function getConversionFunnel(
  preparerId: string,
  period: 'today' | 'week' | 'month' = 'today'
): Promise<ConversionFunnelStage[]> {
  try {
    const now = new Date();
    let startDate: Date;

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get preparer's marketing links
    const preparerLinks = await prisma.marketingLink.findMany({
      where: { creatorId: preparerId },
      select: { id: true, clicks: true, intakeStarts: true, intakeCompletes: true },
    });
    const linkIds = preparerLinks.map(l => l.id);

    // Link clicks in period
    const linkClicks = linkIds.length > 0 ? await prisma.linkClick.count({
      where: {
        linkId: { in: linkIds },
        clickedAt: { gte: startDate },
      },
    }) : 0;

    // Intakes started (has referrer matching preparer)
    const intakesStarted = await prisma.taxIntakeLead.count({
      where: {
        assignedPreparerId: preparerId,
        created_at: { gte: startDate },
      },
    });

    // Intakes completed
    const intakesCompleted = await prisma.taxIntakeLead.count({
      where: {
        assignedPreparerId: preparerId,
        completed: true,
        created_at: { gte: startDate },
      },
    });

    // Appointments booked
    const appointmentsBooked = await prisma.appointment.count({
      where: {
        preparerId,
        requestedAt: { gte: startDate },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED'] },
      },
    });

    // Returns filed
    const returnsFiled = await prisma.taxReturn.count({
      where: {
        profile: {
          preparerClients: {
            some: { preparerId },
          },
        },
        status: { in: ['FILED', 'ACCEPTED'] },
        createdAt: { gte: startDate },
      },
    });

    const maxValue = Math.max(linkClicks, 1);
    const stages: ConversionFunnelStage[] = [
      {
        name: 'Link Clicks',
        value: linkClicks,
        percentage: 100,
        dropOffRate: 0,
        color: '#3b82f6', // blue
      },
      {
        name: 'Intake Started',
        value: intakesStarted,
        percentage: linkClicks > 0 ? Math.round((intakesStarted / linkClicks) * 100) : 0,
        dropOffRate: linkClicks > 0 ? Math.round(((linkClicks - intakesStarted) / linkClicks) * 100) : 0,
        color: '#8b5cf6', // purple
      },
      {
        name: 'Intake Completed',
        value: intakesCompleted,
        percentage: intakesStarted > 0 ? Math.round((intakesCompleted / intakesStarted) * 100) : 0,
        dropOffRate: intakesStarted > 0 ? Math.round(((intakesStarted - intakesCompleted) / intakesStarted) * 100) : 0,
        color: '#06b6d4', // cyan
      },
      {
        name: 'Appointment Booked',
        value: appointmentsBooked,
        percentage: intakesCompleted > 0 ? Math.round((appointmentsBooked / intakesCompleted) * 100) : 0,
        dropOffRate: intakesCompleted > 0 ? Math.round(((intakesCompleted - appointmentsBooked) / intakesCompleted) * 100) : 0,
        color: '#10b981', // emerald
      },
      {
        name: 'Return Filed',
        value: returnsFiled,
        percentage: appointmentsBooked > 0 ? Math.round((returnsFiled / appointmentsBooked) * 100) : 0,
        dropOffRate: appointmentsBooked > 0 ? Math.round(((appointmentsBooked - returnsFiled) / appointmentsBooked) * 100) : 0,
        color: '#f59e0b', // amber
      },
    ];

    return stages;
  } catch (error) {
    logger.error('Error fetching conversion funnel:', error);
    return [];
  }
}

/**
 * Get client source breakdown (where clients came from)
 */
export async function getClientSources(
  preparerId: string,
  period: 'today' | 'week' | 'month' | 'all' = 'month'
): Promise<ClientSourceBreakdown[]> {
  try {
    const now = new Date();
    let startDate: Date | undefined;

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const whereClause: any = { assignedPreparerId: preparerId };
    if (startDate) {
      whereClause.created_at = { gte: startDate };
    }

    // Group intakes by attribution method
    const intakes = await prisma.taxIntakeLead.groupBy({
      by: ['attributionMethod'],
      where: whereClause,
      _count: true,
    });

    const total = intakes.reduce((sum, i) => sum + i._count, 0);

    const sourceColors: Record<string, string> = {
      'referral_link': '#3b82f6', // blue
      'qr_code': '#8b5cf6', // purple
      'direct': '#10b981', // emerald
      'social_media': '#f59e0b', // amber
      'email': '#ef4444', // red
      'unknown': '#6b7280', // gray
    };

    const sourceLabels: Record<string, string> = {
      'referral_link': 'Referral Links',
      'qr_code': 'QR Codes',
      'direct': 'Direct Traffic',
      'social_media': 'Social Media',
      'email': 'Email Campaign',
      'cookie': 'Referral Links',
      'email_match': 'Email Campaign',
      'phone_match': 'Direct',
    };

    const sources: ClientSourceBreakdown[] = intakes.map(intake => {
      const method = intake.attributionMethod || 'unknown';
      return {
        source: sourceLabels[method] || method,
        count: intake._count,
        percentage: total > 0 ? Math.round((intake._count / total) * 100) : 0,
        color: sourceColors[method] || sourceColors['unknown'],
      };
    });

    // Consolidate duplicate source names
    const consolidatedSources = sources.reduce((acc, curr) => {
      const existing = acc.find(s => s.source === curr.source);
      if (existing) {
        existing.count += curr.count;
        existing.percentage = total > 0 ? Math.round((existing.count / total) * 100) : 0;
      } else {
        acc.push(curr);
      }
      return acc;
    }, [] as ClientSourceBreakdown[]);

    // Sort by count descending
    consolidatedSources.sort((a, b) => b.count - a.count);

    return consolidatedSources;
  } catch (error) {
    logger.error('Error fetching client sources:', error);
    return [];
  }
}

/**
 * Get earnings breakdown by source
 */
export async function getEarningsBreakdown(
  preparerId: string,
  period: 'today' | 'week' | 'month' | 'all' = 'month'
): Promise<EarningsBreakdown[]> {
  try {
    const now = new Date();
    let startDate: Date | undefined;

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const whereClause: any = {
      profileId: preparerId,
      status: 'COMPLETED',
    };
    if (startDate) {
      whereClause.createdAt = { gte: startDate };
    }

    // Get payments grouped by type/description
    const payments = await prisma.payment.groupBy({
      by: ['type'],
      where: whereClause,
      _sum: { amount: true },
    });

    const total = payments.reduce((sum, p) => sum + Number(p._sum.amount || 0), 0);

    const sourceColors: Record<string, string> = {
      'TAX_RETURN': '#10b981', // emerald
      'COMMISSION': '#3b82f6', // blue
      'REFERRAL_BONUS': '#8b5cf6', // purple
      'SERVICE_FEE': '#f59e0b', // amber
      'OTHER': '#6b7280', // gray
    };

    const sourceLabels: Record<string, string> = {
      'TAX_RETURN': 'Returns Filed',
      'COMMISSION': 'Commissions',
      'REFERRAL_BONUS': 'Referral Bonuses',
      'SERVICE_FEE': 'Service Fees',
      'OTHER': 'Other',
    };

    const breakdown: EarningsBreakdown[] = payments.map(payment => {
      const type = payment.type || 'OTHER';
      const amount = Number(payment._sum.amount || 0);
      return {
        source: sourceLabels[type] || type,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
        color: sourceColors[type] || sourceColors['OTHER'],
      };
    });

    // Sort by amount descending
    breakdown.sort((a, b) => b.amount - a.amount);

    return breakdown;
  } catch (error) {
    logger.error('Error fetching earnings breakdown:', error);
    return [];
  }
}

/**
 * Get hot leads - clicked in last 24h but no form submitted
 */
export async function getHotLeads(preparerId: string, limit: number = 10): Promise<HotLead[]> {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get preparer's marketing links
    const preparerLinks = await prisma.marketingLink.findMany({
      where: { creatorId: preparerId },
      select: { id: true, code: true, title: true },
    });
    const linkIds = preparerLinks.map(l => l.id);
    const linkMap = new Map(preparerLinks.map(l => [l.id, { code: l.code, title: l.title }]));

    if (linkIds.length === 0) return [];

    // Get recent clicks that haven't converted
    const recentClicks = await prisma.linkClick.findMany({
      where: {
        linkId: { in: linkIds },
        clickedAt: { gte: twentyFourHoursAgo },
        converted: false,
        // Has some identifying info
        OR: [
          { userEmail: { not: null } },
          { userPhone: { not: null } },
        ],
      },
      orderBy: { clickedAt: 'desc' },
      take: limit,
    });

    const now = new Date();
    return recentClicks.map(click => {
      const linkInfo = linkMap.get(click.linkId);
      const hoursAgo = Math.floor((now.getTime() - click.clickedAt.getTime()) / (1000 * 60 * 60));
      return {
        id: click.id,
        name: click.userEmail?.split('@')[0] || 'Unknown',
        email: click.userEmail || '',
        phone: click.userPhone || '',
        clickedAt: click.clickedAt,
        linkCode: linkInfo?.code || '',
        linkTitle: linkInfo?.title || linkInfo?.code || '',
        hoursAgo,
      };
    });
  } catch (error) {
    logger.error('Error fetching hot leads:', error);
    return [];
  }
}

/**
 * Get recent activity feed
 */
export async function getRecentActivity(
  preparerId: string,
  limit: number = 10
): Promise<RecentActivityItem[]> {
  try {
    const activities: RecentActivityItem[] = [];

    // Get preparer's marketing links
    const preparerLinks = await prisma.marketingLink.findMany({
      where: { creatorId: preparerId },
      select: { id: true, code: true, title: true },
    });
    const linkIds = preparerLinks.map(l => l.id);
    const linkMap = new Map(preparerLinks.map(l => [l.id, { code: l.code, title: l.title }]));

    // Recent link clicks
    if (linkIds.length > 0) {
      const recentClicks = await prisma.linkClick.findMany({
        where: { linkId: { in: linkIds } },
        orderBy: { clickedAt: 'desc' },
        take: 5,
      });

      recentClicks.forEach(click => {
        const linkInfo = linkMap.get(click.linkId);
        activities.push({
          id: `click-${click.id}`,
          type: 'link_click',
          description: `Someone clicked ${linkInfo?.code || 'your link'}`,
          timestamp: click.clickedAt,
          timeAgo: formatTimeAgo(click.clickedAt),
          metadata: { linkCode: linkInfo?.code },
        });
      });
    }

    // Recent intake submissions
    const recentIntakes = await prisma.taxIntakeLead.findMany({
      where: { assignedPreparerId: preparerId },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    recentIntakes.forEach(intake => {
      activities.push({
        id: `intake-${intake.id}`,
        type: intake.completed ? 'intake_submitted' : 'intake_started',
        description: `${intake.first_name} ${intake.last_name} ${intake.completed ? 'submitted intake form' : 'started intake form'}`,
        timestamp: intake.created_at,
        timeAgo: formatTimeAgo(intake.created_at),
        metadata: { clientName: `${intake.first_name} ${intake.last_name}` },
      });
    });

    // Recent appointments
    const recentAppointments = await prisma.appointment.findMany({
      where: {
        preparerId,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      orderBy: { requestedAt: 'desc' },
      take: 5,
    });

    recentAppointments.forEach(apt => {
      const scheduledTime = apt.scheduledFor
        ? apt.scheduledFor.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : 'TBD';
      activities.push({
        id: `apt-${apt.id}`,
        type: 'appointment_booked',
        description: `${apt.clientName} booked appointment`,
        timestamp: apt.requestedAt,
        timeAgo: formatTimeAgo(apt.requestedAt),
        metadata: {
          clientName: apt.clientName,
          appointmentTime: scheduledTime,
        },
      });
    });

    // Sort by timestamp and take the most recent
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return activities.slice(0, limit);
  } catch (error) {
    logger.error('Error fetching recent activity:', error);
    return [];
  }
}

/**
 * Get top performing links for today
 */
export async function getTopLinksToday(
  preparerId: string,
  limit: number = 5
): Promise<PreparerLinkPerformance[]> {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Get preparer's links
    const links = await prisma.marketingLink.findMany({
      where: {
        creatorId: preparerId,
        isActive: true,
      },
    });

    // Get clicks for each link today
    const linkPerformance: PreparerLinkPerformance[] = [];

    for (const link of links) {
      const todayClicks = await prisma.linkClick.count({
        where: {
          linkId: link.id,
          clickedAt: { gte: startOfToday },
        },
      });

      const todayConversions = await prisma.linkClick.count({
        where: {
          linkId: link.id,
          clickedAt: { gte: startOfToday },
          converted: true,
        },
      });

      linkPerformance.push({
        linkId: link.id,
        title: link.title || link.code,
        clicks: todayClicks,
        conversions: todayConversions,
        conversionRate: todayClicks > 0
          ? Math.round((todayConversions / todayClicks) * 100)
          : 0,
      });
    }

    // Sort by clicks descending
    linkPerformance.sort((a, b) => b.clicks - a.clicks);
    return linkPerformance.slice(0, limit);
  } catch (error) {
    logger.error('Error fetching top links today:', error);
    return [];
  }
}
