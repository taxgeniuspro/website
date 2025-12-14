/**
 * Lead Flow Analytics Service
 *
 * Provides lead-focused analytics for the admin dashboard.
 * Tracks lead status, conversion rates, entry points, and performer rankings.
 *
 * NOTE: Does NOT track tax preparer revenue from tax services.
 * Only tracks:
 * - Lead status and conversions
 * - Entry points (which pages bring leads)
 * - Affiliate commissions (predetermined amounts)
 * - Sub-affiliate relationships
 */

import { prisma } from '@/lib/prisma';
import { LeadStatus, PaymentStatus } from '@prisma/client';

export type Period = '7d' | '30d' | '90d' | 'all';

function getPeriodStartDate(period: Period): Date | null {
  if (period === 'all') return null;

  const now = new Date();
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

// Helper to build display name from profile
function getDisplayName(profile: { firstName?: string | null; lastName?: string | null }): string {
  const parts = [profile.firstName, profile.lastName].filter(Boolean);
  return parts.join(' ') || 'Unknown';
}

/**
 * Get lead pipeline summary - counts by status
 */
export async function getLeadPipelineSummary(period: Period = '30d') {
  const startDate = getPeriodStartDate(period);

  const where = startDate ? { createdAt: { gte: startDate } } : {};

  const statusCounts = await prisma.lead.groupBy({
    by: ['status'],
    where,
    _count: { id: true },
  });

  const pipeline: Record<LeadStatus, number> = {
    NEW: 0,
    CONTACTED: 0,
    QUALIFIED: 0,
    CONVERTED: 0,
    DISQUALIFIED: 0,
  };

  statusCounts.forEach((item) => {
    pipeline[item.status] = item._count.id;
  });

  const total = Object.values(pipeline).reduce((sum, count) => sum + count, 0);

  return { pipeline, total };
}

/**
 * Get top entry points - which marketing links bring the most leads
 */
export async function getTopEntryPoints(limit: number = 10, period: Period = '30d') {
  const startDate = getPeriodStartDate(period);

  const where = startDate ? { createdAt: { gte: startDate } } : {};

  const links = await prisma.marketingLink.findMany({
    where,
    orderBy: [{ conversions: 'desc' }, { clicks: 'desc' }],
    take: limit,
    select: {
      id: true,
      code: true,
      title: true,
      targetPage: true,
      clicks: true,
      uniqueClicks: true,
      conversions: true,
      intakeStarts: true,
      intakeCompletes: true,
      returnsFiled: true,
      conversionRate: true,
      creatorId: true,
      creatorType: true,
    },
  });

  return links.map((link) => ({
    ...link,
    conversionRate: link.clicks > 0 ? (link.conversions / link.clicks) * 100 : 0,
  }));
}

/**
 * Get conversion funnel metrics
 */
export async function getConversionFunnel(period: Period = '30d') {
  const startDate = getPeriodStartDate(period);
  const where = startDate ? { createdAt: { gte: startDate } } : {};

  // Get click totals from marketing links
  const linkStats = await prisma.marketingLink.aggregate({
    where,
    _sum: {
      clicks: true,
      intakeStarts: true,
      intakeCompletes: true,
      returnsFiled: true,
    },
  });

  // Get lead counts
  const leadCount = await prisma.lead.count({ where });

  // Get intake lead counts
  const intakeWhere = startDate ? { created_at: { gte: startDate } } : {};
  const intakeStarted = await prisma.taxIntakeLead.count({ where: intakeWhere });
  const intakeCompleted = await prisma.taxIntakeLead.count({
    where: { ...intakeWhere, completed: true },
  });

  return {
    clicks: linkStats._sum.clicks || 0,
    leads: leadCount,
    intakeStarts: intakeStarted,
    intakeCompletes: intakeCompleted,
    returnsFiled: linkStats._sum.returnsFiled || 0,
    conversionRates: {
      clickToLead: linkStats._sum.clicks
        ? (leadCount / linkStats._sum.clicks) * 100
        : 0,
      leadToIntake: leadCount > 0 ? (intakeStarted / leadCount) * 100 : 0,
      intakeToComplete:
        intakeStarted > 0 ? (intakeCompleted / intakeStarted) * 100 : 0,
      overallConversion: linkStats._sum.clicks
        ? (intakeCompleted / linkStats._sum.clicks) * 100
        : 0,
    },
  };
}

/**
 * Get top performers (preparers and affiliates combined)
 */
export async function getTopPerformers(limit: number = 10, period: Period = '30d') {
  const startDate = getPeriodStartDate(period);
  const where = startDate ? { createdAt: { gte: startDate } } : {};

  // Get leads grouped by referrer
  const leadsByReferrer = await prisma.lead.groupBy({
    by: ['referrerUsername', 'referrerType'],
    where: {
      ...where,
      referrerUsername: { not: null },
    },
    _count: { id: true },
  });

  // Get conversions (leads with status CONVERTED)
  const conversionsByReferrer = await prisma.lead.groupBy({
    by: ['referrerUsername'],
    where: {
      ...where,
      referrerUsername: { not: null },
      status: 'CONVERTED',
    },
    _count: { id: true },
  });

  // Create a map for quick lookup
  const conversionMap = new Map(
    conversionsByReferrer.map((c) => [c.referrerUsername, c._count.id])
  );

  // Get profile info for referrers (using shortLinkUsername to match referrerUsername)
  const referrerUsernames = leadsByReferrer
    .map((l) => l.referrerUsername)
    .filter((u): u is string => u !== null);

  // Only query profiles if we have usernames to look up
  const profiles = referrerUsernames.length > 0
    ? await prisma.profile.findMany({
        where: { shortLinkUsername: { in: referrerUsernames } },
        select: {
          id: true,
          shortLinkUsername: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      })
    : [];

  const profileMap = new Map(profiles.map((p) => [p.shortLinkUsername, p]));

  // Combine and sort
  const performers = leadsByReferrer
    .map((item) => {
      const profile = profileMap.get(item.referrerUsername || '');
      const conversions = conversionMap.get(item.referrerUsername) || 0;
      return {
        username: item.referrerUsername,
        type: item.referrerType,
        displayName: profile ? getDisplayName(profile) : item.referrerUsername,
        avatarUrl: profile?.avatarUrl,
        leads: item._count.id,
        conversions,
        conversionRate: item._count.id > 0 ? (conversions / item._count.id) * 100 : 0,
      };
    })
    .sort((a, b) => b.leads - a.leads)
    .slice(0, limit);

  return performers;
}

/**
 * Get preparer lead performance
 */
export async function getPreparerLeadPerformance(preparerId?: string, period: Period = '30d') {
  const startDate = getPeriodStartDate(period);
  const baseWhere = startDate ? { createdAt: { gte: startDate } } : {};

  if (preparerId) {
    // Get specific preparer's profile
    const profile = await prisma.profile.findUnique({
      where: { id: preparerId },
      select: { shortLinkUsername: true },
    });

    if (!profile?.shortLinkUsername) return null;

    const leads = await prisma.lead.count({
      where: {
        ...baseWhere,
        referrerUsername: profile.shortLinkUsername,
        referrerType: 'TAX_PREPARER',
      },
    });

    const conversions = await prisma.lead.count({
      where: {
        ...baseWhere,
        referrerUsername: profile.shortLinkUsername,
        referrerType: 'TAX_PREPARER',
        status: 'CONVERTED',
      },
    });

    return {
      leads,
      conversions,
      conversionRate: leads > 0 ? (conversions / leads) * 100 : 0,
    };
  }

  // Get all preparers' performance
  const preparerLeads = await prisma.lead.groupBy({
    by: ['referrerUsername'],
    where: {
      ...baseWhere,
      referrerType: 'TAX_PREPARER',
      referrerUsername: { not: null },
    },
    _count: { id: true },
  });

  return {
    totalLeads: preparerLeads.reduce((sum, p) => sum + p._count.id, 0),
    preparerCount: preparerLeads.length,
  };
}

/**
 * Get affiliate lead performance with commission tracking
 */
export async function getAffiliateLeadPerformance(affiliateId?: string, period: Period = '30d') {
  const startDate = getPeriodStartDate(period);
  const baseWhere = startDate ? { createdAt: { gte: startDate } } : {};

  if (affiliateId) {
    // Get specific affiliate's profile
    const profile = await prisma.profile.findUnique({
      where: { id: affiliateId },
      select: { shortLinkUsername: true, id: true },
    });

    if (!profile) return null;

    // Get leads
    const leads = await prisma.lead.count({
      where: {
        ...baseWhere,
        referrerUsername: profile.shortLinkUsername,
        OR: [{ referrerType: 'AFFILIATE' }, { referrerType: 'CLIENT' }],
      },
    });

    const conversions = await prisma.lead.count({
      where: {
        ...baseWhere,
        referrerUsername: profile.shortLinkUsername,
        OR: [{ referrerType: 'AFFILIATE' }, { referrerType: 'CLIENT' }],
        status: 'CONVERTED',
      },
    });

    // Get commissions
    const commissionWhere = startDate ? { createdAt: { gte: startDate } } : {};
    const commissions = await prisma.commission.aggregate({
      where: {
        ...commissionWhere,
        referrerId: profile.id,
      },
      _sum: { amount: true },
    });

    const pendingCommissions = await prisma.commission.aggregate({
      where: {
        ...commissionWhere,
        referrerId: profile.id,
        status: PaymentStatus.PENDING,
      },
      _sum: { amount: true },
    });

    const paidCommissions = await prisma.commission.aggregate({
      where: {
        ...commissionWhere,
        referrerId: profile.id,
        status: PaymentStatus.PAID,
      },
      _sum: { amount: true },
    });

    return {
      leads,
      conversions,
      conversionRate: leads > 0 ? (conversions / leads) * 100 : 0,
      totalCommissions: Number(commissions._sum?.amount) || 0,
      pendingCommissions: Number(pendingCommissions._sum?.amount) || 0,
      paidCommissions: Number(paidCommissions._sum?.amount) || 0,
    };
  }

  // Get all affiliates' performance
  const affiliateLeads = await prisma.lead.groupBy({
    by: ['referrerUsername'],
    where: {
      ...baseWhere,
      OR: [{ referrerType: 'AFFILIATE' }, { referrerType: 'CLIENT' }],
      referrerUsername: { not: null },
    },
    _count: { id: true },
  });

  // Get total commissions
  const commissionWhere = startDate ? { createdAt: { gte: startDate } } : {};
  const totalCommissions = await prisma.commission.aggregate({
    where: commissionWhere,
    _sum: { amount: true },
  });

  const pendingCommissions = await prisma.commission.aggregate({
    where: {
      ...commissionWhere,
      status: PaymentStatus.PENDING,
    },
    _sum: { amount: true },
  });

  return {
    totalLeads: affiliateLeads.reduce((sum, a) => sum + a._count.id, 0),
    affiliateCount: affiliateLeads.length,
    totalCommissions: Number(totalCommissions._sum?.amount) || 0,
    pendingCommissions: Number(pendingCommissions._sum?.amount) || 0,
  };
}

/**
 * Get all preparers with their lead performance
 */
export async function getAllPreparersLeadPerformance(period: Period = '30d') {
  const startDate = getPeriodStartDate(period);
  const baseWhere = startDate ? { createdAt: { gte: startDate } } : {};

  // Get all tax preparer profiles directly
  const preparerProfiles = await prisma.profile.findMany({
    where: { role: 'tax_preparer' },
    select: {
      id: true,
      shortLinkUsername: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
    },
  });

  // Get leads grouped by preparer
  const leadsByPreparer = await prisma.lead.groupBy({
    by: ['referrerUsername'],
    where: {
      ...baseWhere,
      referrerType: 'TAX_PREPARER',
      referrerUsername: { not: null },
    },
    _count: { id: true },
  });

  // Get conversions grouped by preparer
  const conversionsByPreparer = await prisma.lead.groupBy({
    by: ['referrerUsername'],
    where: {
      ...baseWhere,
      referrerType: 'TAX_PREPARER',
      referrerUsername: { not: null },
      status: 'CONVERTED',
    },
    _count: { id: true },
  });

  const leadsMap = new Map(leadsByPreparer.map((l) => [l.referrerUsername, l._count.id]));
  const conversionsMap = new Map(
    conversionsByPreparer.map((c) => [c.referrerUsername, c._count.id])
  );

  return preparerProfiles
    .map((profile) => {
      const username = profile.shortLinkUsername;
      const leads = leadsMap.get(username) || 0;
      const conversions = conversionsMap.get(username) || 0;

      return {
        id: profile.id,
        username,
        displayName: getDisplayName(profile),
        avatarUrl: profile.avatarUrl,
        leads,
        conversions,
        conversionRate: leads > 0 ? (conversions / leads) * 100 : 0,
      };
    })
    .sort((a, b) => b.leads - a.leads);
}

/**
 * Get all affiliates with their lead and commission performance
 */
export async function getAllAffiliatesLeadPerformance(period: Period = '30d') {
  const startDate = getPeriodStartDate(period);
  const baseWhere = startDate ? { createdAt: { gte: startDate } } : {};

  // Get all profiles with affiliate status APPROVED
  const affiliates = await prisma.profile.findMany({
    where: { affiliateStatus: 'APPROVED' },
    select: {
      id: true,
      shortLinkUsername: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
    },
  });

  // Get leads grouped by affiliate
  const leadsByAffiliate = await prisma.lead.groupBy({
    by: ['referrerUsername'],
    where: {
      ...baseWhere,
      OR: [{ referrerType: 'AFFILIATE' }, { referrerType: 'CLIENT' }],
      referrerUsername: { not: null },
    },
    _count: { id: true },
  });

  // Get conversions grouped by affiliate
  const conversionsByAffiliate = await prisma.lead.groupBy({
    by: ['referrerUsername'],
    where: {
      ...baseWhere,
      OR: [{ referrerType: 'AFFILIATE' }, { referrerType: 'CLIENT' }],
      referrerUsername: { not: null },
      status: 'CONVERTED',
    },
    _count: { id: true },
  });

  // Get commissions grouped by referrer
  const commissionWhere = startDate ? { createdAt: { gte: startDate } } : {};
  const commissions = await prisma.commission.groupBy({
    by: ['referrerId'],
    where: commissionWhere,
    _sum: { amount: true },
  });

  const pendingCommissions = await prisma.commission.groupBy({
    by: ['referrerId'],
    where: { ...commissionWhere, status: PaymentStatus.PENDING },
    _sum: { amount: true },
  });

  const leadsMap = new Map(leadsByAffiliate.map((l) => [l.referrerUsername, l._count.id]));
  const conversionsMap = new Map(
    conversionsByAffiliate.map((c) => [c.referrerUsername, c._count.id])
  );
  const commissionsMap = new Map(
    commissions.map((c) => [c.referrerId, Number(c._sum?.amount) || 0])
  );
  const pendingMap = new Map(
    pendingCommissions.map((c) => [c.referrerId, Number(c._sum?.amount) || 0])
  );

  return affiliates
    .map((affiliate) => {
      const leads = leadsMap.get(affiliate.shortLinkUsername) || 0;
      const conversions = conversionsMap.get(affiliate.shortLinkUsername) || 0;

      return {
        id: affiliate.id,
        username: affiliate.shortLinkUsername,
        displayName: getDisplayName(affiliate),
        avatarUrl: affiliate.avatarUrl,
        role: affiliate.role,
        referrerUsername: null, // Sub-affiliate tracking would need a separate lookup
        leads,
        conversions,
        conversionRate: leads > 0 ? (conversions / leads) * 100 : 0,
        totalCommissions: commissionsMap.get(affiliate.id) || 0,
        pendingCommissions: pendingMap.get(affiliate.id) || 0,
      };
    })
    .sort((a, b) => b.leads - a.leads);
}

/**
 * Get leads by source (for pie chart)
 */
export async function getLeadsBySource(period: Period = '30d') {
  const startDate = getPeriodStartDate(period);
  const where = startDate ? { createdAt: { gte: startDate } } : {};

  const byReferrerType = await prisma.lead.groupBy({
    by: ['referrerType'],
    where,
    _count: { id: true },
  });

  // Count leads with no referrer as "Direct"
  const directLeads = await prisma.lead.count({
    where: {
      ...where,
      referrerUsername: null,
    },
  });

  const sources = [
    {
      source: 'Tax Preparers',
      count: byReferrerType.find((r) => r.referrerType === 'TAX_PREPARER')?._count.id || 0,
      color: '#8B5CF6', // purple
    },
    {
      source: 'Affiliates',
      count: byReferrerType.find((r) => r.referrerType === 'AFFILIATE')?._count.id || 0,
      color: '#F97316', // orange
    },
    {
      source: 'Client Referrals',
      count: byReferrerType.find((r) => r.referrerType === 'CLIENT')?._count.id || 0,
      color: '#22C55E', // green
    },
    {
      source: 'Direct',
      count: directLeads,
      color: '#3B82F6', // blue
    },
  ];

  const total = sources.reduce((sum, s) => sum + s.count, 0);

  return sources.map((s) => ({
    ...s,
    percentage: total > 0 ? (s.count / total) * 100 : 0,
  }));
}

/**
 * Get recent leads for table display
 */
export async function getRecentLeads(limit: number = 50) {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      type: true,
      source: true,
      referrerUsername: true,
      referrerType: true,
      createdAt: true,
    },
  });

  return leads;
}

/**
 * Get commission summary for dashboard
 */
export async function getCommissionSummary(period: Period = '30d') {
  const startDate = getPeriodStartDate(period);
  const where = startDate ? { createdAt: { gte: startDate } } : {};

  const [total, pending, approved, paid] = await Promise.all([
    prisma.commission.aggregate({
      where,
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.commission.aggregate({
      where: { ...where, status: PaymentStatus.PENDING },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.commission.aggregate({
      where: { ...where, status: PaymentStatus.APPROVED },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.commission.aggregate({
      where: { ...where, status: PaymentStatus.PAID },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  return {
    total: {
      amount: Number(total._sum?.amount) || 0,
      count: total._count?.id || 0,
    },
    pending: {
      amount: Number(pending._sum?.amount) || 0,
      count: pending._count?.id || 0,
    },
    approved: {
      amount: Number(approved._sum?.amount) || 0,
      count: approved._count?.id || 0,
    },
    paid: {
      amount: Number(paid._sum?.amount) || 0,
      count: paid._count?.id || 0,
    },
  };
}

/**
 * Get sub-affiliate tree for a given affiliate
 */
export async function getSubAffiliateTree(affiliateUsername: string) {
  // Get all referrals where this user is the referrer
  const referrals = await prisma.referral.findMany({
    where: {
      referrer: {
        shortLinkUsername: affiliateUsername,
      },
      status: 'COMPLETED',
    },
    select: {
      client: {
        select: {
          id: true,
          shortLinkUsername: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          affiliateStatus: true,
        },
      },
    },
  });

  // Filter to only approved affiliates
  const subAffiliates = referrals
    .map((r) => r.client)
    .filter((c) => c.affiliateStatus === 'APPROVED');

  // Get performance for each sub-affiliate
  const result = await Promise.all(
    subAffiliates.map(async (sub) => {
      const leads = await prisma.lead.count({
        where: { referrerUsername: sub.shortLinkUsername },
      });
      const conversions = await prisma.lead.count({
        where: { referrerUsername: sub.shortLinkUsername, status: 'CONVERTED' },
      });
      const commissions = await prisma.commission.aggregate({
        where: { referrerId: sub.id },
        _sum: { amount: true },
      });

      return {
        id: sub.id,
        username: sub.shortLinkUsername,
        displayName: getDisplayName(sub),
        avatarUrl: sub.avatarUrl,
        leads,
        conversions,
        conversionRate: leads > 0 ? (conversions / leads) * 100 : 0,
        totalCommissions: Number(commissions._sum?.amount) || 0,
      };
    })
  );

  return result;
}
