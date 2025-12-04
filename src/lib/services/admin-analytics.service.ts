/**
 * Admin Analytics Service
 *
 * Provides Top 15 rankings and platform-wide analytics for Super Admin dashboard.
 * Optimized queries with proper indexing for < 500ms response times.
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6.3
 */

import { prisma } from '../prisma';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TopPerformer {
  rank: number;
  id: string;
  name: string;
  avatarUrl?: string;
  metrics: {
    clicks: number;
    intakeStarts: number;
    intakeCompletes: number;
    returnsFiled: number;
    conversionRate: number;
    earnings?: number;
  };
  badge?: string;
}

export interface TopMaterial {
  rank: number;
  id: string;
  title: string;
  type: string;
  location?: string;
  creatorId: string;
  creatorName: string;
  metrics: {
    clicks: number;
    intakeStarts: number;
    intakeCompletes: number;
    returnsFiled: number;
    conversionRate: number;
  };
  badge?: string;
}

export interface TopLocation {
  rank: number;
  city: string;
  state: string;
  totalClicks: number;
  conversions: number;
  signups: number;
  conversionRate: number;
  badge?: string;
}

export interface PlatformOverview {
  totalClicks: number;
  totalClicksChange: number;
  intakeFormsStarted: number;
  intakeFormsCompleted: number;
  taxReturnsCompleted: number;
  overallConversionRate: number;
  totalCommissionsOwed: number;
  totalCommissionsPaid: number;
  activeUsers: {
    preparers: number;
    affiliates: number;
    referrers: number;
  };
}

/**
 * Get platform-wide overview metrics
 */
export async function getPlatformOverview(dateRange?: DateRange): Promise<PlatformOverview> {
  const whereClause = dateRange
    ? {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }
    : {};

  // Aggregate all marketing link stats
  const linkStats = await prisma.marketingLink.aggregate({
    where: {
      isActive: true,
      ...whereClause,
    },
    _sum: {
      clicks: true,
      intakeStarts: true,
      intakeCompletes: true,
      returnsFiled: true,
    },
  });

  // Count active users by role
  const activeUsers = await prisma.$transaction([
    prisma.profile.count({ where: { role: 'TAX_PREPARER' } }),
    prisma.profile.count({ where: { role: 'AFFILIATE' } }),
    prisma.profile.count({ where: { role: 'REFERRER' } }),
  ]);

  // Calculate commission totals
  const commissionStats = await prisma.commission.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      ...(dateRange && {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    },
  });

  const commissionsPaid = await prisma.commission.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      status: 'COMPLETED',
      ...(dateRange && {
        paidAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    },
  });

  const totalClicks = linkStats._sum.clicks || 0;
  const intakeStarts = linkStats._sum.intakeStarts || 0;
  const intakeCompletes = linkStats._sum.intakeCompletes || 0;
  const returnsFiled = linkStats._sum.returnsFiled || 0;

  // Calculate previous period for comparison
  let totalClicksChange = 0;
  if (dateRange) {
    const periodLength = dateRange.end.getTime() - dateRange.start.getTime();
    const previousPeriodEnd = new Date(dateRange.start.getTime());
    const previousPeriodStart = new Date(dateRange.start.getTime() - periodLength);

    const previousStats = await prisma.marketingLink.aggregate({
      where: {
        isActive: true,
        createdAt: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd,
        },
      },
      _sum: {
        clicks: true,
      },
    });

    const previousClicks = previousStats._sum.clicks || 0;
    if (previousClicks > 0) {
      totalClicksChange = ((totalClicks - previousClicks) / previousClicks) * 100;
    }
  }

  return {
    totalClicks,
    totalClicksChange,
    intakeFormsStarted: intakeStarts,
    intakeFormsCompleted: intakeCompletes,
    taxReturnsCompleted: returnsFiled,
    overallConversionRate: totalClicks > 0 ? (returnsFiled / totalClicks) * 100 : 0,
    totalCommissionsOwed: Number(commissionStats._sum.amount || 0),
    totalCommissionsPaid: Number(commissionsPaid._sum.amount || 0),
    activeUsers: {
      preparers: activeUsers[0],
      affiliates: activeUsers[1],
      referrers: activeUsers[2],
    },
  };
}

/**
 * Get Top 15 Preparers
 */
export async function getTop15Preparers(dateRange?: DateRange): Promise<TopPerformer[]> {
  // Query materials created by preparers and aggregate their stats
  const preparerMaterials = await prisma.marketingLink.groupBy({
    by: ['creatorId'],
    where: {
      creatorType: 'TAX_PREPARER',
      isActive: true,
      ...(dateRange && {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    },
    _sum: {
      clicks: true,
      intakeStarts: true,
      intakeCompletes: true,
      returnsFiled: true,
    },
    orderBy: {
      _sum: {
        returnsFiled: 'desc',
      },
    },
    take: 15,
  });

  // Get preparer details
  const preparerIds = preparerMaterials.map((pm) => pm.creatorId);
  const preparers = await prisma.profile.findMany({
    where: { userId: { in: preparerIds } },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
    },
  });

  // Combine and return
  return preparerMaterials.map((pm, idx) => {
    const preparer = preparers.find((p) => p.userId === pm.creatorId);
    const clicks = pm._sum.clicks || 0;
    const returnsFiled = pm._sum.returnsFiled || 0;

    return {
      rank: idx + 1,
      id: pm.creatorId,
      name: preparer ? `${preparer.firstName} ${preparer.lastName}` : 'Unknown',
      avatarUrl: preparer?.avatarUrl || undefined,
      metrics: {
        clicks,
        intakeStarts: pm._sum.intakeStarts || 0,
        intakeCompletes: pm._sum.intakeCompletes || 0,
        returnsFiled,
        conversionRate: clicks > 0 ? (returnsFiled / clicks) * 100 : 0,
      },
      badge: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : undefined,
    };
  });
}

/**
 * Get Top 15 Affiliates
 */
export async function getTop15Affiliates(dateRange?: DateRange): Promise<TopPerformer[]> {
  const affiliateMaterials = await prisma.marketingLink.groupBy({
    by: ['creatorId'],
    where: {
      creatorType: 'AFFILIATE',
      isActive: true,
      ...(dateRange && {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    },
    _sum: {
      clicks: true,
      intakeStarts: true,
      intakeCompletes: true,
      returnsFiled: true,
    },
    orderBy: {
      _sum: {
        returnsFiled: 'desc',
      },
    },
    take: 15,
  });

  const affiliateIds = affiliateMaterials.map((am) => am.creatorId);
  const affiliates = await prisma.profile.findMany({
    where: { userId: { in: affiliateIds } },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
    },
  });

  return affiliateMaterials.map((am, idx) => {
    const affiliate = affiliates.find((a) => a.userId === am.creatorId);
    const clicks = am._sum.clicks || 0;
    const returnsFiled = am._sum.returnsFiled || 0;

    return {
      rank: idx + 1,
      id: am.creatorId,
      name: affiliate ? `${affiliate.firstName} ${affiliate.lastName}` : 'Unknown',
      avatarUrl: affiliate?.avatarUrl || undefined,
      metrics: {
        clicks,
        intakeStarts: am._sum.intakeStarts || 0,
        intakeCompletes: am._sum.intakeCompletes || 0,
        returnsFiled,
        conversionRate: clicks > 0 ? (returnsFiled / clicks) * 100 : 0,
      },
      badge: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : undefined,
    };
  });
}

/**
 * Get Top 15 Referrers
 */
export async function getTop15Referrers(dateRange?: DateRange): Promise<TopPerformer[]> {
  const referrerMaterials = await prisma.marketingLink.groupBy({
    by: ['creatorId'],
    where: {
      creatorType: 'REFERRER',
      isActive: true,
      ...(dateRange && {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    },
    _sum: {
      clicks: true,
      intakeStarts: true,
      intakeCompletes: true,
      returnsFiled: true,
    },
    orderBy: {
      _sum: {
        returnsFiled: 'desc',
      },
    },
    take: 15,
  });

  const referrerIds = referrerMaterials.map((rm) => rm.creatorId);
  const referrers = await prisma.profile.findMany({
    where: { userId: { in: referrerIds } },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
    },
  });

  return referrerMaterials.map((rm, idx) => {
    const referrer = referrers.find((r) => r.userId === rm.creatorId);
    const clicks = rm._sum.clicks || 0;
    const returnsFiled = rm._sum.returnsFiled || 0;

    return {
      rank: idx + 1,
      id: rm.creatorId,
      name: referrer ? `${referrer.firstName} ${referrer.lastName}` : 'Unknown',
      avatarUrl: referrer?.avatarUrl || undefined,
      metrics: {
        clicks,
        intakeStarts: rm._sum.intakeStarts || 0,
        intakeCompletes: rm._sum.intakeCompletes || 0,
        returnsFiled,
        conversionRate: clicks > 0 ? (returnsFiled / clicks) * 100 : 0,
      },
      badge: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : undefined,
    };
  });
}

/**
 * Get Top 15 Materials (all creators combined)
 */
export async function getTop15Materials(dateRange?: DateRange): Promise<TopMaterial[]> {
  const materials = await prisma.marketingLink.findMany({
    where: {
      isActive: true,
      ...(dateRange && {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    },
    orderBy: {
      returnsFiled: 'desc',
    },
    take: 15,
    select: {
      id: true,
      title: true,
      code: true,
      linkType: true,
      location: true,
      creatorId: true,
      clicks: true,
      intakeStarts: true,
      intakeCompletes: true,
      returnsFiled: true,
      filedConversionRate: true,
    },
  });

  // Get creator names
  const creatorIds = materials.map((m) => m.creatorId);
  const creators = await prisma.profile.findMany({
    where: { userId: { in: creatorIds } },
    select: {
      userId: true,
      firstName: true,
      lastName: true,
    },
  });

  return materials.map((material, idx) => {
    const creator = creators.find((c) => c.userId === material.creatorId);

    return {
      rank: idx + 1,
      id: material.id,
      title: material.title || material.code,
      type: material.linkType,
      location: material.location || undefined,
      creatorId: material.creatorId,
      creatorName: creator ? `${creator.firstName} ${creator.lastName}` : 'Unknown',
      metrics: {
        clicks: material.clicks,
        intakeStarts: material.intakeStarts || 0,
        intakeCompletes: material.intakeCompletes || 0,
        returnsFiled: material.returnsFiled || 0,
        conversionRate: material.filedConversionRate || 0,
      },
      badge: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : undefined,
    };
  });
}

/**
 * Get Top 15 Locations by performance
 */
export async function getTop15Locations(dateRange?: DateRange): Promise<TopLocation[]> {
  const locationStats = await prisma.linkClick.groupBy({
    by: ['city', 'state'],
    where: {
      city: { not: null },
      state: { not: null },
      ...(dateRange && {
        clickedAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    },
    _count: {
      id: true,
    },
    _sum: {
      converted: true,
      signedUp: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: 15,
  });

  return locationStats.map((loc, idx) => {
    const totalClicks = loc._count.id;
    const conversions = loc._sum.converted || 0;

    return {
      rank: idx + 1,
      city: loc.city || 'Unknown',
      state: loc.state || '',
      totalClicks,
      conversions,
      signups: loc._sum.signedUp || 0,
      conversionRate: totalClicks > 0 ? (conversions / totalClicks) * 100 : 0,
      badge: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : undefined,
    };
  });
}

/**
 * Get Top 15 Material Types by performance
 */
export async function getTop15MaterialTypes(dateRange?: DateRange): Promise<any[]> {
  const typeStats = await prisma.marketingLink.groupBy({
    by: ['linkType'],
    where: {
      isActive: true,
      ...(dateRange && {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    },
    _sum: {
      clicks: true,
      intakeStarts: true,
      intakeCompletes: true,
      returnsFiled: true,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _sum: {
        returnsFiled: 'desc',
      },
    },
    take: 15,
  });

  return typeStats.map((type, idx) => {
    const clicks = type._sum.clicks || 0;
    const returnsFiled = type._sum.returnsFiled || 0;

    return {
      rank: idx + 1,
      type: type.linkType,
      materialCount: type._count.id,
      metrics: {
        clicks,
        intakeStarts: type._sum.intakeStarts || 0,
        intakeCompletes: type._sum.intakeCompletes || 0,
        returnsFiled,
        conversionRate: clicks > 0 ? (returnsFiled / clicks) * 100 : 0,
      },
      badge: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : undefined,
    };
  });
}

/**
 * Helper: Parse date range from string
 */
export function parseDateRange(range: string): DateRange {
  const now = new Date();
  const start = new Date();

  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      start.setMonth(now.getMonth() - 1); // Default to last month
  }

  return { start, end: now };
}

/**
 * Get platform-wide earnings statistics for Admin Earnings page
 */
export interface AdminEarningsStats {
  totalRevenue: number;
  monthlyRevenue: number;
  totalCommissions: number;
  monthlyCommissions: number;
  averageCommission: number;
  totalPayouts: number;
  pendingPayouts: number;
}

export async function getAdminEarningsStats(): Promise<AdminEarningsStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Total revenue from completed payments
  const totalRevenueResult = await prisma.payment.aggregate({
    where: { status: 'COMPLETED' },
    _sum: { amount: true },
  });

  // Revenue this month
  const monthlyRevenueResult = await prisma.payment.aggregate({
    where: {
      status: 'COMPLETED',
      createdAt: { gte: startOfMonth },
    },
    _sum: { amount: true },
  });

  // Commission stats
  const commissionStats = await prisma.commission.aggregate({
    _sum: { amount: true },
    _avg: { amount: true },
  });

  const monthlyCommissions = await prisma.commission.aggregate({
    where: { createdAt: { gte: startOfMonth } },
    _sum: { amount: true },
  });

  // Payout stats
  const totalPayoutsResult = await prisma.payoutRequest.aggregate({
    where: { status: 'COMPLETED' },
    _sum: { amount: true },
  });

  const pendingPayoutsResult = await prisma.payoutRequest.aggregate({
    where: { status: 'PENDING' },
    _sum: { amount: true },
  });

  return {
    totalRevenue: Number(totalRevenueResult._sum.amount || 0),
    monthlyRevenue: Number(monthlyRevenueResult._sum.amount || 0),
    totalCommissions: Number(commissionStats._sum.amount || 0),
    monthlyCommissions: Number(monthlyCommissions._sum.amount || 0),
    averageCommission: Number(commissionStats._avg.amount || 0),
    totalPayouts: Number(totalPayoutsResult._sum.amount || 0),
    pendingPayouts: Number(pendingPayoutsResult._sum.amount || 0),
  };
}

/**
 * Get top earning users across all roles
 */
export interface TopEarner {
  id: string;
  name: string;
  role: string;
  earnings: number;
  returns?: number;
  referrals?: number;
  leads?: number;
  trend: number;
}

export async function getTopEarners(limit: number = 5): Promise<TopEarner[]> {
  // Get commission earners grouped by user
  const earners = await prisma.commission.groupBy({
    by: ['referrerId'],
    _sum: { amount: true },
    _count: { id: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: limit,
  });

  // Get user details
  const userIds = earners.map((e) => e.referrerId);
  const users = await prisma.profile.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  // Calculate returns/referrals for each earner
  const result: TopEarner[] = [];

  for (const earner of earners) {
    const user = users.find((u) => u.userId === earner.referrerId);
    if (!user) continue;

    // Count conversions for this user
    const conversions = await prisma.referral.count({
      where: {
        referrerId: earner.referrerId,
        status: 'COMPLETED',
      },
    });

    result.push({
      id: earner.referrerId,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role.toLowerCase().replace('_', ' '),
      earnings: Number(earner._sum.amount || 0),
      returns: conversions,
      referrals: earner._count.id,
      trend: 0, // TODO: Calculate trend from previous period
    });
  }

  return result;
}

/**
 * Get recent payout history
 */
export interface RecentPayout {
  id: string;
  name: string;
  role: string;
  amount: number;
  date: string;
  status: string;
}

export async function getRecentPayouts(limit: number = 5): Promise<RecentPayout[]> {
  const payouts = await prisma.payoutRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      profile: {
        select: {
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });

  return payouts.map((payout) => ({
    id: payout.id,
    name: `${payout.profile.firstName} ${payout.profile.lastName}`,
    role: payout.profile.role.toLowerCase().replace('_', ' '),
    amount: Number(payout.amount),
    date: payout.createdAt.toISOString(),
    status: payout.status.toLowerCase(),
  }));
}
