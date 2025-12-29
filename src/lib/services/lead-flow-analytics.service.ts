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

import { db, firstOrNull } from '@/lib/db';

// Local type definitions (replacing @prisma/client)
type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'DISQUALIFIED';
type PaymentStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED';

interface LeadRecord {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  status: LeadStatus;
  type?: string | null;
  source?: string | null;
  referrerUsername?: string | null;
  referrerType?: string | null;
  createdAt: Date | string;
}

interface MarketingLinkRecord {
  id: string;
  code: string;
  title?: string | null;
  targetPage?: string | null;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  intakeStarts: number;
  intakeCompletes: number;
  returnsFiled: number;
  conversionRate: number;
  creatorId?: string | null;
  creatorType?: string | null;
  createdAt: Date | string;
}

interface ProfileRecord {
  id: string;
  shortLinkUsername?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  affiliateStatus?: string | null;
}

interface CommissionRecord {
  id: string;
  referrerId: string;
  amount: number;
  status: PaymentStatus;
  createdAt: Date | string;
}

interface ReferralRecord {
  id: string;
  referrerId: string;
  clientId: string;
  status: string;
}

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

  // Build query
  let query = db.from('leads').select('status');
  if (startDate) {
    query = query.gte('createdAt', startDate.toISOString());
  }

  const { data: leads } = await query;
  const allLeads = (leads || []) as Array<{ status: LeadStatus }>;

  // Group by status in JavaScript
  const pipeline: Record<LeadStatus, number> = {
    NEW: 0,
    CONTACTED: 0,
    QUALIFIED: 0,
    CONVERTED: 0,
    DISQUALIFIED: 0,
  };

  allLeads.forEach((lead) => {
    if (lead.status in pipeline) {
      pipeline[lead.status]++;
    }
  });

  const total = Object.values(pipeline).reduce((sum, count) => sum + count, 0);

  return { pipeline, total };
}

/**
 * Get top entry points - which marketing links bring the most leads
 */
export async function getTopEntryPoints(limit: number = 10, period: Period = '30d') {
  const startDate = getPeriodStartDate(period);

  let query = db
    .from('marketing_links')
    .select('id, code, title, targetPage, clicks, uniqueClicks, conversions, intakeStarts, intakeCompletes, returnsFiled, conversionRate, creatorId, creatorType')
    .order('conversions', { ascending: false })
    .order('clicks', { ascending: false })
    .limit(limit);

  if (startDate) {
    query = query.gte('createdAt', startDate.toISOString());
  }

  const { data: links } = await query;
  const allLinks = (links || []) as MarketingLinkRecord[];

  return allLinks.map((link) => ({
    ...link,
    conversionRate: link.clicks > 0 ? (link.conversions / link.clicks) * 100 : 0,
  }));
}

/**
 * Get conversion funnel metrics
 */
export async function getConversionFunnel(period: Period = '30d') {
  const startDate = getPeriodStartDate(period);

  // Get click totals from marketing links
  let linksQuery = db.from('marketing_links').select('clicks, intakeStarts, intakeCompletes, returnsFiled');
  if (startDate) {
    linksQuery = linksQuery.gte('createdAt', startDate.toISOString());
  }
  const { data: linksData } = await linksQuery;
  const allLinks = (linksData || []) as Array<{ clicks: number; intakeStarts: number; intakeCompletes: number; returnsFiled: number }>;

  // Sum the link stats
  const linkStats = allLinks.reduce(
    (acc, link) => ({
      clicks: acc.clicks + (link.clicks || 0),
      intakeStarts: acc.intakeStarts + (link.intakeStarts || 0),
      intakeCompletes: acc.intakeCompletes + (link.intakeCompletes || 0),
      returnsFiled: acc.returnsFiled + (link.returnsFiled || 0),
    }),
    { clicks: 0, intakeStarts: 0, intakeCompletes: 0, returnsFiled: 0 }
  );

  // Get lead count
  let leadsQuery = db.from('leads').select('id', { count: 'exact', head: true });
  if (startDate) {
    leadsQuery = leadsQuery.gte('createdAt', startDate.toISOString());
  }
  const { count: leadCount } = await leadsQuery;
  const totalLeads = leadCount || 0;

  // Get intake lead counts
  let intakeQuery = db.from('tax_intake_leads').select('id', { count: 'exact', head: true });
  if (startDate) {
    intakeQuery = intakeQuery.gte('created_at', startDate.toISOString());
  }
  const { count: intakeStartedCount } = await intakeQuery;
  const intakeStarted = intakeStartedCount || 0;

  let intakeCompletedQuery = db.from('tax_intake_leads').select('id', { count: 'exact', head: true }).eq('completed', true);
  if (startDate) {
    intakeCompletedQuery = intakeCompletedQuery.gte('created_at', startDate.toISOString());
  }
  const { count: intakeCompletedCount } = await intakeCompletedQuery;
  const intakeCompleted = intakeCompletedCount || 0;

  return {
    clicks: linkStats.clicks,
    leads: totalLeads,
    intakeStarts: intakeStarted,
    intakeCompletes: intakeCompleted,
    returnsFiled: linkStats.returnsFiled,
    conversionRates: {
      clickToLead: linkStats.clicks > 0
        ? (totalLeads / linkStats.clicks) * 100
        : 0,
      leadToIntake: totalLeads > 0 ? (intakeStarted / totalLeads) * 100 : 0,
      intakeToComplete:
        intakeStarted > 0 ? (intakeCompleted / intakeStarted) * 100 : 0,
      overallConversion: linkStats.clicks > 0
        ? (intakeCompleted / linkStats.clicks) * 100
        : 0,
    },
  };
}

/**
 * Get top performers (preparers and affiliates combined)
 */
export async function getTopPerformers(limit: number = 10, period: Period = '30d') {
  const startDate = getPeriodStartDate(period);

  // Get all leads with referrers
  let leadsQuery = db
    .from('leads')
    .select('referrerUsername, referrerType, status')
    .not('referrerUsername', 'is', null);
  if (startDate) {
    leadsQuery = leadsQuery.gte('createdAt', startDate.toISOString());
  }
  const { data: leadsData } = await leadsQuery;
  const allLeads = (leadsData || []) as Array<{ referrerUsername: string | null; referrerType: string | null; status: LeadStatus }>;

  // Group leads by referrer in JavaScript
  const leadsMap = new Map<string, { type: string | null; count: number }>();
  const conversionsMap = new Map<string, number>();

  allLeads.forEach((lead) => {
    if (lead.referrerUsername) {
      const existing = leadsMap.get(lead.referrerUsername);
      if (existing) {
        existing.count++;
      } else {
        leadsMap.set(lead.referrerUsername, { type: lead.referrerType, count: 1 });
      }

      if (lead.status === 'CONVERTED') {
        conversionsMap.set(lead.referrerUsername, (conversionsMap.get(lead.referrerUsername) || 0) + 1);
      }
    }
  });

  // Get profile info for referrers
  const referrerUsernames = Array.from(leadsMap.keys());

  let profiles: Array<{ id: string; shortLinkUsername: string | null; firstName: string | null; lastName: string | null; avatarUrl: string | null }> = [];
  if (referrerUsernames.length > 0) {
    const { data: profilesData } = await db
      .from('profiles')
      .select('id, shortLinkUsername, firstName, lastName, avatarUrl')
      .in('shortLinkUsername', referrerUsernames);
    profiles = (profilesData || []) as typeof profiles;
  }

  const profileMap = new Map(profiles.map((p) => [p.shortLinkUsername, p]));

  // Combine and sort
  const performers = Array.from(leadsMap.entries())
    .map(([username, data]) => {
      const profile = profileMap.get(username);
      const conversions = conversionsMap.get(username) || 0;
      return {
        username,
        type: data.type,
        displayName: profile ? getDisplayName(profile) : username,
        avatarUrl: profile?.avatarUrl,
        leads: data.count,
        conversions,
        conversionRate: data.count > 0 ? (conversions / data.count) * 100 : 0,
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

  if (preparerId) {
    // Get specific preparer's profile
    const { data: profileData } = await db
      .from('profiles')
      .select('shortLinkUsername')
      .eq('id', preparerId)
      .limit(1);

    const profile = firstOrNull(profileData) as { shortLinkUsername: string | null } | null;
    if (!profile?.shortLinkUsername) return null;

    // Count leads
    let leadsQuery = db
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('referrerUsername', profile.shortLinkUsername)
      .eq('referrerType', 'TAX_PREPARER');
    if (startDate) {
      leadsQuery = leadsQuery.gte('createdAt', startDate.toISOString());
    }
    const { count: leadsCount } = await leadsQuery;
    const leads = leadsCount || 0;

    // Count conversions
    let conversionsQuery = db
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('referrerUsername', profile.shortLinkUsername)
      .eq('referrerType', 'TAX_PREPARER')
      .eq('status', 'CONVERTED');
    if (startDate) {
      conversionsQuery = conversionsQuery.gte('createdAt', startDate.toISOString());
    }
    const { count: conversionsCount } = await conversionsQuery;
    const conversions = conversionsCount || 0;

    return {
      leads,
      conversions,
      conversionRate: leads > 0 ? (conversions / leads) * 100 : 0,
    };
  }

  // Get all preparers' performance
  let allLeadsQuery = db
    .from('leads')
    .select('referrerUsername')
    .eq('referrerType', 'TAX_PREPARER')
    .not('referrerUsername', 'is', null);
  if (startDate) {
    allLeadsQuery = allLeadsQuery.gte('createdAt', startDate.toISOString());
  }
  const { data: leadsData } = await allLeadsQuery;
  const allLeads = (leadsData || []) as Array<{ referrerUsername: string | null }>;

  // Group by referrerUsername in JavaScript
  const preparerSet = new Set<string>();
  allLeads.forEach((lead) => {
    if (lead.referrerUsername) {
      preparerSet.add(lead.referrerUsername);
    }
  });

  return {
    totalLeads: allLeads.length,
    preparerCount: preparerSet.size,
  };
}

/**
 * Get affiliate lead performance with commission tracking
 */
export async function getAffiliateLeadPerformance(affiliateId?: string, period: Period = '30d') {
  const startDate = getPeriodStartDate(period);

  if (affiliateId) {
    // Get specific affiliate's profile
    const { data: profileData } = await db
      .from('profiles')
      .select('shortLinkUsername, id')
      .eq('id', affiliateId)
      .limit(1);

    const profile = firstOrNull(profileData) as { shortLinkUsername: string | null; id: string } | null;
    if (!profile) return null;

    // Get leads (affiliate or client referrer type)
    let leadsQuery = db
      .from('leads')
      .select('id, status')
      .eq('referrerUsername', profile.shortLinkUsername)
      .in('referrerType', ['AFFILIATE', 'CLIENT']);
    if (startDate) {
      leadsQuery = leadsQuery.gte('createdAt', startDate.toISOString());
    }
    const { data: leadsData } = await leadsQuery;
    const allLeads = (leadsData || []) as Array<{ id: string; status: LeadStatus }>;

    const leads = allLeads.length;
    const conversions = allLeads.filter((l) => l.status === 'CONVERTED').length;

    // Get commissions
    let commissionsQuery = db.from('commissions').select('amount, status').eq('referrerId', profile.id);
    if (startDate) {
      commissionsQuery = commissionsQuery.gte('createdAt', startDate.toISOString());
    }
    const { data: commissionsData } = await commissionsQuery;
    const allCommissions = (commissionsData || []) as Array<{ amount: number; status: PaymentStatus }>;

    const totalCommissions = allCommissions.reduce((sum, c) => sum + (c.amount || 0), 0);
    const pendingCommissions = allCommissions
      .filter((c) => c.status === 'PENDING')
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    const paidCommissions = allCommissions
      .filter((c) => c.status === 'PAID')
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    return {
      leads,
      conversions,
      conversionRate: leads > 0 ? (conversions / leads) * 100 : 0,
      totalCommissions,
      pendingCommissions,
      paidCommissions,
    };
  }

  // Get all affiliates' performance
  let allLeadsQuery = db
    .from('leads')
    .select('referrerUsername')
    .in('referrerType', ['AFFILIATE', 'CLIENT'])
    .not('referrerUsername', 'is', null);
  if (startDate) {
    allLeadsQuery = allLeadsQuery.gte('createdAt', startDate.toISOString());
  }
  const { data: leadsData } = await allLeadsQuery;
  const allLeads = (leadsData || []) as Array<{ referrerUsername: string | null }>;

  // Group by referrerUsername in JavaScript
  const affiliateSet = new Set<string>();
  allLeads.forEach((lead) => {
    if (lead.referrerUsername) {
      affiliateSet.add(lead.referrerUsername);
    }
  });

  // Get total commissions
  let commissionsQuery = db.from('commissions').select('amount, status');
  if (startDate) {
    commissionsQuery = commissionsQuery.gte('createdAt', startDate.toISOString());
  }
  const { data: commissionsData } = await commissionsQuery;
  const allCommissions = (commissionsData || []) as Array<{ amount: number; status: PaymentStatus }>;

  const totalCommissions = allCommissions.reduce((sum, c) => sum + (c.amount || 0), 0);
  const pendingCommissions = allCommissions
    .filter((c) => c.status === 'PENDING')
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  return {
    totalLeads: allLeads.length,
    affiliateCount: affiliateSet.size,
    totalCommissions,
    pendingCommissions,
  };
}

/**
 * Get all preparers with their lead performance
 */
export async function getAllPreparersLeadPerformance(period: Period = '30d') {
  const startDate = getPeriodStartDate(period);

  // Get all tax preparer profiles directly
  const { data: profilesData } = await db
    .from('profiles')
    .select('id, shortLinkUsername, firstName, lastName, avatarUrl')
    .eq('role', 'tax_preparer');

  const preparerProfiles = (profilesData || []) as Array<{
    id: string;
    shortLinkUsername: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  }>;

  // Get all leads by preparer
  let leadsQuery = db
    .from('leads')
    .select('referrerUsername, status')
    .eq('referrerType', 'TAX_PREPARER')
    .not('referrerUsername', 'is', null);
  if (startDate) {
    leadsQuery = leadsQuery.gte('createdAt', startDate.toISOString());
  }
  const { data: leadsData } = await leadsQuery;
  const allLeads = (leadsData || []) as Array<{ referrerUsername: string | null; status: LeadStatus }>;

  // Group leads and conversions by referrerUsername
  const leadsMap = new Map<string, number>();
  const conversionsMap = new Map<string, number>();

  allLeads.forEach((lead) => {
    if (lead.referrerUsername) {
      leadsMap.set(lead.referrerUsername, (leadsMap.get(lead.referrerUsername) || 0) + 1);
      if (lead.status === 'CONVERTED') {
        conversionsMap.set(lead.referrerUsername, (conversionsMap.get(lead.referrerUsername) || 0) + 1);
      }
    }
  });

  return preparerProfiles
    .map((profile) => {
      const username = profile.shortLinkUsername;
      const leads = username ? leadsMap.get(username) || 0 : 0;
      const conversions = username ? conversionsMap.get(username) || 0 : 0;

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
 *
 * NOTE: This excludes tax_preparers since they have their own analytics page
 * at /admin/analytics/preparers. This page is specifically for tracking
 * client/affiliate referrers who earn commissions.
 */
export async function getAllAffiliatesLeadPerformance(period: Period = '30d') {
  const startDate = getPeriodStartDate(period);

  // Get all profiles with affiliate status APPROVED, excluding tax preparers and admins
  const { data: affiliatesData } = await db
    .from('profiles')
    .select('id, shortLinkUsername, firstName, lastName, avatarUrl, role')
    .eq('affiliateStatus', 'APPROVED')
    .not('role', 'in', '("tax_preparer","admin")');

  const affiliates = (affiliatesData || []) as Array<{
    id: string;
    shortLinkUsername: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    role: string | null;
  }>;

  // Get all leads by affiliate
  let leadsQuery = db
    .from('leads')
    .select('referrerUsername, status')
    .in('referrerType', ['AFFILIATE', 'CLIENT'])
    .not('referrerUsername', 'is', null);
  if (startDate) {
    leadsQuery = leadsQuery.gte('createdAt', startDate.toISOString());
  }
  const { data: leadsData } = await leadsQuery;
  const allLeads = (leadsData || []) as Array<{ referrerUsername: string | null; status: LeadStatus }>;

  // Group leads and conversions by referrerUsername
  const leadsMap = new Map<string, number>();
  const leadConversionsMap = new Map<string, number>();

  allLeads.forEach((lead) => {
    if (lead.referrerUsername) {
      leadsMap.set(lead.referrerUsername, (leadsMap.get(lead.referrerUsername) || 0) + 1);
      if (lead.status === 'CONVERTED') {
        leadConversionsMap.set(lead.referrerUsername, (leadConversionsMap.get(lead.referrerUsername) || 0) + 1);
      }
    }
  });

  // Get all commissions
  let commissionsQuery = db.from('commissions').select('referrerId, amount, status');
  if (startDate) {
    commissionsQuery = commissionsQuery.gte('createdAt', startDate.toISOString());
  }
  const { data: commissionsData } = await commissionsQuery;
  const allCommissions = (commissionsData || []) as Array<{ referrerId: string; amount: number; status: PaymentStatus }>;

  // Group commissions by referrerId
  const commissionsMap = new Map<string, number>();
  const pendingMap = new Map<string, number>();

  allCommissions.forEach((c) => {
    commissionsMap.set(c.referrerId, (commissionsMap.get(c.referrerId) || 0) + (c.amount || 0));
    if (c.status === 'PENDING') {
      pendingMap.set(c.referrerId, (pendingMap.get(c.referrerId) || 0) + (c.amount || 0));
    }
  });

  return affiliates
    .map((affiliate) => {
      const username = affiliate.shortLinkUsername;
      const leads = username ? leadsMap.get(username) || 0 : 0;
      const conversions = username ? leadConversionsMap.get(username) || 0 : 0;

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

  // Get all leads with referrer info
  let query = db.from('leads').select('referrerType, referrerUsername');
  if (startDate) {
    query = query.gte('createdAt', startDate.toISOString());
  }
  const { data: leadsData } = await query;
  const allLeads = (leadsData || []) as Array<{ referrerType: string | null; referrerUsername: string | null }>;

  // Group by referrer type in JavaScript
  const typeCountsMap = new Map<string | null, number>();
  let directLeads = 0;

  allLeads.forEach((lead) => {
    if (lead.referrerUsername === null) {
      directLeads++;
    }
    typeCountsMap.set(lead.referrerType, (typeCountsMap.get(lead.referrerType) || 0) + 1);
  });

  const sources = [
    {
      source: 'Tax Preparers',
      count: typeCountsMap.get('TAX_PREPARER') || 0,
      color: '#8B5CF6', // purple
    },
    {
      source: 'Affiliates',
      count: typeCountsMap.get('AFFILIATE') || 0,
      color: '#F97316', // orange
    },
    {
      source: 'Client Referrals',
      count: typeCountsMap.get('CLIENT') || 0,
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
  const { data: leads } = await db
    .from('leads')
    .select('id, firstName, lastName, email, status, type, source, referrerUsername, referrerType, createdAt')
    .order('createdAt', { ascending: false })
    .limit(limit);

  return (leads || []) as LeadRecord[];
}

/**
 * Get commission summary for dashboard
 */
export async function getCommissionSummary(period: Period = '30d') {
  const startDate = getPeriodStartDate(period);

  // Get all commissions
  let query = db.from('commissions').select('amount, status');
  if (startDate) {
    query = query.gte('createdAt', startDate.toISOString());
  }
  const { data: commissionsData } = await query;
  const allCommissions = (commissionsData || []) as Array<{ amount: number; status: PaymentStatus }>;

  // Calculate aggregates in JavaScript
  let totalAmount = 0;
  let pendingAmount = 0;
  let approvedAmount = 0;
  let paidAmount = 0;
  let pendingCount = 0;
  let approvedCount = 0;
  let paidCount = 0;

  allCommissions.forEach((c) => {
    const amount = c.amount || 0;
    totalAmount += amount;

    if (c.status === 'PENDING') {
      pendingAmount += amount;
      pendingCount++;
    } else if (c.status === 'APPROVED') {
      approvedAmount += amount;
      approvedCount++;
    } else if (c.status === 'PAID') {
      paidAmount += amount;
      paidCount++;
    }
  });

  return {
    total: {
      amount: totalAmount,
      count: allCommissions.length,
    },
    pending: {
      amount: pendingAmount,
      count: pendingCount,
    },
    approved: {
      amount: approvedAmount,
      count: approvedCount,
    },
    paid: {
      amount: paidAmount,
      count: paidCount,
    },
  };
}

/**
 * Get sub-affiliate tree for a given affiliate
 */
export async function getSubAffiliateTree(affiliateUsername: string) {
  // First get the referrer's profile ID
  const { data: referrerData } = await db
    .from('profiles')
    .select('id')
    .eq('shortLinkUsername', affiliateUsername)
    .limit(1);

  const referrer = firstOrNull(referrerData) as { id: string } | null;
  if (!referrer) return [];

  // Get all referrals where this user is the referrer
  const { data: referralsData } = await db
    .from('referrals')
    .select('clientId')
    .eq('referrerId', referrer.id)
    .eq('status', 'COMPLETED');

  const referrals = (referralsData || []) as Array<{ clientId: string }>;
  if (referrals.length === 0) return [];

  // Get client profiles
  const clientIds = referrals.map((r) => r.clientId);
  const { data: clientsData } = await db
    .from('profiles')
    .select('id, shortLinkUsername, firstName, lastName, avatarUrl, affiliateStatus')
    .in('id', clientIds)
    .eq('affiliateStatus', 'APPROVED');

  const subAffiliates = (clientsData || []) as Array<{
    id: string;
    shortLinkUsername: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    affiliateStatus: string | null;
  }>;

  if (subAffiliates.length === 0) return [];

  // Get all leads for these sub-affiliates in one query
  const subUsernames = subAffiliates
    .map((s) => s.shortLinkUsername)
    .filter((u): u is string => u !== null);

  let leadsData: Array<{ referrerUsername: string | null; status: LeadStatus }> = [];
  if (subUsernames.length > 0) {
    const { data } = await db
      .from('leads')
      .select('referrerUsername, status')
      .in('referrerUsername', subUsernames);
    leadsData = (data || []) as typeof leadsData;
  }

  // Group leads by username
  const leadsMap = new Map<string, number>();
  const conversionsMap = new Map<string, number>();
  leadsData.forEach((lead) => {
    if (lead.referrerUsername) {
      leadsMap.set(lead.referrerUsername, (leadsMap.get(lead.referrerUsername) || 0) + 1);
      if (lead.status === 'CONVERTED') {
        conversionsMap.set(lead.referrerUsername, (conversionsMap.get(lead.referrerUsername) || 0) + 1);
      }
    }
  });

  // Get all commissions for these sub-affiliates in one query
  const subIds = subAffiliates.map((s) => s.id);
  const { data: commissionsData } = await db
    .from('commissions')
    .select('referrerId, amount')
    .in('referrerId', subIds);

  const allCommissions = (commissionsData || []) as Array<{ referrerId: string; amount: number }>;
  const commissionsMap = new Map<string, number>();
  allCommissions.forEach((c) => {
    commissionsMap.set(c.referrerId, (commissionsMap.get(c.referrerId) || 0) + (c.amount || 0));
  });

  // Build result
  return subAffiliates.map((sub) => {
    const leads = sub.shortLinkUsername ? leadsMap.get(sub.shortLinkUsername) || 0 : 0;
    const conversions = sub.shortLinkUsername ? conversionsMap.get(sub.shortLinkUsername) || 0 : 0;

    return {
      id: sub.id,
      username: sub.shortLinkUsername,
      displayName: getDisplayName(sub),
      avatarUrl: sub.avatarUrl,
      leads,
      conversions,
      conversionRate: leads > 0 ? (conversions / leads) * 100 : 0,
      totalCommissions: commissionsMap.get(sub.id) || 0,
    };
  });
}
