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
      where: { role: 'TAX_PREPARER' },
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
      where: { role: 'TAX_PREPARER' },
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
