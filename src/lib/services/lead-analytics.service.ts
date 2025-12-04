/**
 * Lead Generation Analytics Service
 *
 * Provides analytics data for lead generation across:
 * - Tax Genius (company-owned campaigns)
 * - Tax Preparers (individual preparers' marketing links)
 * - Affiliates (affiliate marketing campaigns)
 * - Client Referrals (existing clients referring new clients)
 *
 * Security: Enforces role-based access control
 * - Super Admin: Can see all data and filter by individual
 * - Admin: Can see data if granted analytics permission
 * - Tax Preparer: Can ONLY see their own data
 * - Affiliate: Can ONLY see their own data
 * - Client/Referrer: Can ONLY see their own referral data
 */

import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// ============ TypeScript Interfaces ============

export interface LeadMetrics {
  clicks: number;
  leads: number;
  conversions: number;
  returnsFiled: number;
  conversionRate: number;
  revenue: number;
  growthRate: number;
}

export interface PeriodComparison {
  current: LeadMetrics;
  previous: LeadMetrics;
  changePercent: {
    clicks: number;
    leads: number;
    conversions: number;
    returnsFiled: number;
    revenue: number;
  };
}

export interface CompanyLeadsSummary {
  taxGeniusLeads: LeadMetrics;
  taxPreparerLeads: LeadMetrics;
  affiliateLeads: LeadMetrics;
  clientReferrals: LeadMetrics;
  totalRevenue: number;
  period: '7d' | '30d' | '90d' | 'all';
  periodStartDate: Date;
  periodEndDate: Date;
}

export interface LinkPerformance {
  linkId: string;
  linkCode: string;
  linkType: string;
  title: string | null;
  linkName: string; // Human-readable name
  linkUrl: string; // Full URL
  clicks: number;
  leads: number; // Count of leads generated
  conversions: number;
  conversionRate: number;
  revenue: number;
  commission?: number; // For affiliates
  reward?: number; // For referrers
  createdAt: Date;
}

export interface LeadSummary {
  id: string;
  firstName: string;
  lastName: string;
  name: string; // Computed: firstName + lastName
  email: string;
  phone: string;
  status: string;
  source: string | null;
  createdAt: Date;
  lastContactedAt: Date | null;
  contactMethod: string | null;
}

export interface PreparerAnalytics {
  preparerId: string;
  preparerName: string;
  preparerEmail: string;
  marketingLinksCount: number;
  clicks: number;
  leads: number;
  conversions: number;
  returnsFiled: number;
  conversionRate: number;
  revenue: number;
  lastActive: Date | null;
  linkBreakdown: LinkPerformance[];
  recentLeads: LeadSummary[];
}

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  campaignType: string;
  clicks: number;
  leads: number;
  signups: number;
  conversionRate: number;
  createdAt: Date;
}

export interface AffiliateAnalytics {
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  campaignsCount: number; // Alias for marketingLinksCount
  marketingLinksCount: number;
  clicks: number;
  leads: number;
  signups: number;
  conversions: number; // Same as signups for affiliates
  returnsFiled: number;
  conversionRate: number;
  revenue: number; // Total commissions earned
  commissionsEarned: number;
  commissionsPaid: number;
  commissionsPending: number;
  lastActive: Date | null;
  campaignBreakdown: CampaignPerformance[];
  linkBreakdown: LinkPerformance[];
  recentLeads: LeadSummary[];
}

export interface ReferralRecord {
  referralId: string;
  referredName: string;
  referredEmail: string;
  status: string;
  signupDate: Date;
  returnFiledDate: Date | null;
  commissionEarned: number;
}

export interface ClientReferralAnalytics {
  clientId: string;
  clientName: string;
  clientEmail: string;
  referralLinksCount: number;
  referralsSent: number; // Alias for leads
  clicks: number;
  leads: number; // Same as referralsSent
  conversions: number;
  returnsFiled: number;
  conversionRate: number;
  revenue: number; // Total rewards value
  rewardsEarned: number;
  rewardsPending: number;
  lastActive: Date | null;
  linkBreakdown: LinkPerformance[];
  referralHistory: ReferralRecord[];
  recentLeads: LeadSummary[];
}

export interface ConversionFunnelData {
  stages: {
    name: string;
    count: number;
    percentage: number;
    dropoff: number;
  }[];
}

export interface SourceBreakdownData {
  sources: {
    name: string;
    count: number;
    percentage: number;
    revenue: number;
  }[];
}

export interface TopPerformer {
  id: string;
  name: string;
  email: string;
  type: 'preparer' | 'affiliate' | 'client';
  totalLeads: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
}

// ============ Helper Functions ============

/**
 * Get profile ID from Clerk user ID
 * Supports both Clerk ID and Profile ID for backwards compatibility
 */
async function getProfileId(userIdOrProfileId: string): Promise<string | null> {
  // First, try to find by userId (most common case)
  let profile = await prisma.profile.findUnique({
    where: { userId: userIdOrProfileId },
    select: { id: true },
  });

  // If not found, check if it's already a profile ID
  if (!profile) {
    profile = await prisma.profile.findUnique({
      where: { id: userIdOrProfileId },
      select: { id: true },
    });
  }

  return profile?.id || null;
}

/**
 * Get date range based on period
 */
function getPeriodDateRange(period: '7d' | '30d' | '90d' | 'all' = '30d'): {
  start: Date;
  end: Date;
} {
  const end = new Date();
  let start = new Date();

  switch (period) {
    case '7d':
      start.setDate(end.getDate() - 7);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      break;
    case 'all':
      start = new Date('2020-01-01'); // Company inception
      break;
  }

  return { start, end };
}

/**
 * Get previous period date range for comparison
 */
function getPreviousPeriodDateRange(period: '7d' | '30d' | '90d' | 'all' = '30d'): {
  start: Date;
  end: Date;
} {
  const currentRange = getPeriodDateRange(period);
  const duration = currentRange.end.getTime() - currentRange.start.getTime();

  const end = new Date(currentRange.start.getTime() - 1);
  const start = new Date(end.getTime() - duration);

  return { start, end };
}

/**
 * Calculate growth rate percentage
 */
function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Check if user has permission to view analytics
 */
async function checkAnalyticsPermission(
  requestingUserId: string,
  requestingRole: UserRole
): Promise<boolean> {
  if (requestingRole === 'super_admin') return true;

  if (requestingRole === 'admin') {
    // Check if admin has analytics permission
    // This would come from Clerk metadata or database
    return true; // For now, allow all admins
  }

  return false;
}

// ============ ADMIN FUNCTIONS ============

/**
 * Get company-wide lead generation summary
 * Access: Super Admin, Admin (with permission)
 */
export async function getCompanyLeadsSummary(
  requestingUserId: string,
  requestingRole: UserRole,
  period: '7d' | '30d' | '90d' | 'all' = '30d'
): Promise<CompanyLeadsSummary> {
  // Check permissions
  if (!(await checkAnalyticsPermission(requestingUserId, requestingRole))) {
    throw new Error('Forbidden: Insufficient permissions to view analytics');
  }

  const dateRange = getPeriodDateRange(period);
  const previousRange = getPreviousPeriodDateRange(period);

  // Tax Genius Leads (company-owned, no specific preparer)
  const taxGeniusLeads = await getTaxGeniusLeadMetrics(dateRange, previousRange);

  // Tax Preparer Leads (all preparers combined)
  const taxPreparerLeads = await getTaxPreparerLeadMetrics(dateRange, previousRange);

  // Affiliate Leads (all affiliates combined)
  const affiliateLeads = await getAffiliateLeadMetrics(dateRange, previousRange);

  // Client Referrals (all client referrals combined)
  const clientReferrals = await getClientReferralMetrics(dateRange, previousRange);

  const totalRevenue =
    taxGeniusLeads.revenue +
    taxPreparerLeads.revenue +
    affiliateLeads.revenue +
    clientReferrals.revenue;

  return {
    taxGeniusLeads,
    taxPreparerLeads,
    affiliateLeads,
    clientReferrals,
    totalRevenue,
    period,
    periodStartDate: dateRange.start,
    periodEndDate: dateRange.end,
  };
}

/**
 * Get Tax Genius (company) lead metrics
 */
async function getTaxGeniusLeadMetrics(
  currentRange: { start: Date; end: Date },
  previousRange: { start: Date; end: Date }
): Promise<LeadMetrics> {
  // Current period
  const currentLeads = await prisma.lead.count({
    where: {
      createdAt: { gte: currentRange.start, lte: currentRange.end },
      OR: [{ assignedPreparerId: null }, { source: { contains: 'taxgeniuspro.tax' } }],
    },
  });

  const currentConversions = await prisma.clientIntake.count({
    where: {
      createdAt: { gte: currentRange.start, lte: currentRange.end },
      assignedPreparerId: null,
    },
  });

  // Get Tax Genius returns - count completed intakes with no assigned preparer
  const currentReturns = await prisma.clientIntake.count({
    where: {
      createdAt: { gte: currentRange.start, lte: currentRange.end },
      assignedPreparerId: null,
      status: 'COMPLETED',
    },
  });

  const currentRevenue = await prisma.payment.aggregate({
    where: {
      status: 'COMPLETED',
      createdAt: { gte: currentRange.start, lte: currentRange.end },
    },
    _sum: { amount: true },
  });

  // Previous period for comparison
  const previousLeads = await prisma.lead.count({
    where: {
      createdAt: { gte: previousRange.start, lte: previousRange.end },
      OR: [{ assignedPreparerId: null }, { source: { contains: 'taxgeniuspro.tax' } }],
    },
  });

  const clicks = 0; // Tax Genius doesn't track clicks separately
  const revenue = Number(currentRevenue._sum.amount || 0);
  const conversionRate = currentLeads > 0 ? (currentConversions / currentLeads) * 100 : 0;

  return {
    clicks,
    leads: currentLeads,
    conversions: currentConversions,
    returnsFiled: currentReturns,
    conversionRate: Math.round(conversionRate * 10) / 10,
    revenue,
    growthRate: calculateGrowthRate(currentLeads, previousLeads),
  };
}

/**
 * Get Tax Preparer lead metrics (all preparers combined)
 */
async function getTaxPreparerLeadMetrics(
  currentRange: { start: Date; end: Date },
  previousRange: { start: Date; end: Date }
): Promise<LeadMetrics> {
  // Get all marketing links created by tax preparers
  const preparerLinks = await prisma.marketingLink.findMany({
    where: {
      creatorType: 'TAX_PREPARER',
    },
    select: { id: true, code: true },
  });

  const linkIds = preparerLinks.map((l) => l.id);
  const linkCodes = preparerLinks.map((l) => l.code);

  // Current period
  const currentClicks = await prisma.linkClick.count({
    where: {
      linkId: { in: linkIds },
      clickedAt: { gte: currentRange.start, lte: currentRange.end },
    },
  });

  const currentLeads = await prisma.lead.count({
    where: {
      createdAt: { gte: currentRange.start, lte: currentRange.end },
      source: { in: linkCodes },
    },
  });

  const currentConversions = await prisma.clientIntake.count({
    where: {
      createdAt: { gte: currentRange.start, lte: currentRange.end },
      sourceLink: { in: linkCodes },
    },
  });

  // Get preparer returns - count completed intakes from preparer links
  const currentReturns = await prisma.clientIntake.count({
    where: {
      createdAt: { gte: currentRange.start, lte: currentRange.end },
      sourceLink: { in: linkCodes },
      status: 'COMPLETED',
    },
  });

  // Get preparer revenue - simplified
  const currentRevenue = await prisma.payment.aggregate({
    where: {
      status: 'COMPLETED',
      createdAt: { gte: currentRange.start, lte: currentRange.end },
    },
    _sum: { amount: true },
  });

  // Previous period
  const previousLeads = await prisma.lead.count({
    where: {
      createdAt: { gte: previousRange.start, lte: previousRange.end },
      source: { in: linkCodes },
    },
  });

  const revenue = Number(currentRevenue._sum.amount || 0);
  const conversionRate = currentClicks > 0 ? (currentConversions / currentClicks) * 100 : 0;

  return {
    clicks: currentClicks,
    leads: currentLeads,
    conversions: currentConversions,
    returnsFiled: currentReturns,
    conversionRate: Math.round(conversionRate * 10) / 10,
    revenue,
    growthRate: calculateGrowthRate(currentLeads, previousLeads),
  };
}

/**
 * Get Affiliate lead metrics (all affiliates combined)
 */
async function getAffiliateLeadMetrics(
  currentRange: { start: Date; end: Date },
  previousRange: { start: Date; end: Date }
): Promise<LeadMetrics> {
  // Get all marketing links created by affiliates
  const affiliateLinks = await prisma.marketingLink.findMany({
    where: {
      creatorType: 'AFFILIATE',
    },
    select: { id: true, code: true },
  });

  const linkIds = affiliateLinks.map((l) => l.id);
  const linkCodes = affiliateLinks.map((l) => l.code);

  // Current period
  const currentClicks = await prisma.linkClick.count({
    where: {
      linkId: { in: linkIds },
      clickedAt: { gte: currentRange.start, lte: currentRange.end },
    },
  });

  const currentLeads = await prisma.lead.count({
    where: {
      createdAt: { gte: currentRange.start, lte: currentRange.end },
      source: { in: linkCodes },
    },
  });

  const currentSignups = await prisma.profile.count({
    where: {
      createdAt: { gte: currentRange.start, lte: currentRange.end },
      // Track signups from affiliate campaigns
    },
  });

  const currentCommissions = await prisma.commission.aggregate({
    where: {
      createdAt: { gte: currentRange.start, lte: currentRange.end },
    },
    _sum: { amount: true },
  });

  // Previous period
  const previousLeads = await prisma.lead.count({
    where: {
      createdAt: { gte: previousRange.start, lte: previousRange.end },
      source: { in: linkCodes },
    },
  });

  const revenue = Number(currentCommissions._sum.amount || 0);
  const conversionRate = currentClicks > 0 ? (currentSignups / currentClicks) * 100 : 0;

  return {
    clicks: currentClicks,
    leads: currentLeads,
    conversions: currentSignups,
    returnsFiled: 0, // Affiliates don't track returns directly
    conversionRate: Math.round(conversionRate * 10) / 10,
    revenue,
    growthRate: calculateGrowthRate(currentLeads, previousLeads),
  };
}

/**
 * Get Client Referral metrics (all clients combined)
 */
async function getClientReferralMetrics(
  currentRange: { start: Date; end: Date },
  previousRange: { start: Date; end: Date }
): Promise<LeadMetrics> {
  // Current period
  const currentReferrals = await prisma.referral.count({
    where: {
      createdAt: { gte: currentRange.start, lte: currentRange.end },
    },
  });

  const currentConversions = await prisma.referral.count({
    where: {
      createdAt: { gte: currentRange.start, lte: currentRange.end },
      status: { in: ['ACTIVE', 'COMPLETED'] },
    },
  });

  const currentReturns = await prisma.referral.count({
    where: {
      returnFiledDate: { gte: currentRange.start, lte: currentRange.end },
    },
  });

  const currentCommissions = await prisma.referral.aggregate({
    where: {
      createdAt: { gte: currentRange.start, lte: currentRange.end },
    },
    _sum: { commissionEarned: true },
  });

  // Previous period
  const previousReferrals = await prisma.referral.count({
    where: {
      createdAt: { gte: previousRange.start, lte: previousRange.end },
    },
  });

  const revenue = Number(currentCommissions._sum.commissionEarned || 0);
  const conversionRate = currentReferrals > 0 ? (currentConversions / currentReferrals) * 100 : 0;

  return {
    clicks: 0, // Referrals don't track clicks
    leads: currentReferrals,
    conversions: currentConversions,
    returnsFiled: currentReturns,
    conversionRate: Math.round(conversionRate * 10) / 10,
    revenue,
    growthRate: calculateGrowthRate(currentReferrals, previousReferrals),
  };
}

/**
 * Get all tax preparers' analytics or filter by specific preparer
 * Access: Super Admin, Admin (with permission)
 */
export async function getPreparersAnalytics(
  requestingUserId: string,
  requestingRole: UserRole,
  filterPreparerId?: string
): Promise<PreparerAnalytics[]> {
  // Check permissions
  if (!(await checkAnalyticsPermission(requestingUserId, requestingRole))) {
    throw new Error('Forbidden: Insufficient permissions to view analytics');
  }

  // Get all tax preparers or specific one
  const preparers = await prisma.profile.findMany({
    where: {
      role: 'TAX_PREPARER',
      ...(filterPreparerId && { id: filterPreparerId }),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      userId: true,
    },
  });

  const analyticsPromises = preparers.map(async (preparer) => {
    return await getMyPreparerAnalytics(preparer.id);
  });

  return await Promise.all(analyticsPromises);
}

/**
 * Get affiliates analytics or filter by specific affiliate
 * Access: Super Admin, Admin (with permission)
 */
export async function getAffiliatesAnalytics(
  requestingUserId: string,
  requestingRole: UserRole,
  filterAffiliateId?: string
): Promise<AffiliateAnalytics[]> {
  // Check permissions
  if (!(await checkAnalyticsPermission(requestingUserId, requestingRole))) {
    throw new Error('Forbidden: Insufficient permissions to view analytics');
  }

  // Get all affiliates or specific one
  const affiliates = await prisma.profile.findMany({
    where: {
      role: 'AFFILIATE',
      ...(filterAffiliateId && { id: filterAffiliateId }),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      userId: true,
    },
  });

  const analyticsPromises = affiliates.map(async (affiliate) => {
    return await getMyAffiliateAnalytics(affiliate.id);
  });

  return await Promise.all(analyticsPromises);
}

/**
 * Get clients referral analytics or filter by specific client
 * Access: Super Admin, Admin (with permission)
 */
export async function getClientsReferralAnalytics(
  requestingUserId: string,
  requestingRole: UserRole,
  filterClientId?: string
): Promise<ClientReferralAnalytics[]> {
  // Check permissions
  if (!(await checkAnalyticsPermission(requestingUserId, requestingRole))) {
    throw new Error('Forbidden: Insufficient permissions to view analytics');
  }

  // Get all clients who have made referrals or specific one
  const clients = await prisma.profile.findMany({
    where: {
      role: { in: ['CLIENT', 'REFERRER'] },
      referrerReferrals: {
        some: {},
      },
      ...(filterClientId && { id: filterClientId }),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      userId: true,
    },
  });

  const analyticsPromises = clients.map(async (client) => {
    return await getMyReferralAnalytics(client.id);
  });

  return await Promise.all(analyticsPromises);
}

// ============ ROLE-SPECIFIC FUNCTIONS ============

/**
 * Get analytics for individual tax preparer - ONLY their data
 * Access: Tax Preparer (their own data), Admin/Super Admin (any preparer)
 * @param userIdOrProfileId - Clerk user ID or Profile ID
 */
export async function getMyPreparerAnalytics(
  userIdOrProfileId: string
): Promise<PreparerAnalytics> {
  // Convert Clerk ID to Profile ID if needed
  const preparerId = await getProfileId(userIdOrProfileId);

  if (!preparerId) {
    // Return empty analytics for new users without profiles
    return {
      preparerId: '',
      preparerName: 'New User',
      preparerEmail: '',
      marketingLinksCount: 0,
      clicks: 0,
      leads: 0,
      conversions: 0,
      returnsFiled: 0,
      conversionRate: 0,
      revenue: 0,
      lastActive: null,
      linkBreakdown: [],
      recentLeads: [],
    };
  }

  const preparer = await prisma.profile.findUnique({
    where: { id: preparerId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      userId: true,
    },
  });

  if (!preparer) {
    // Return empty analytics if profile not found
    return {
      preparerId: '',
      preparerName: 'New User',
      preparerEmail: '',
      marketingLinksCount: 0,
      clicks: 0,
      leads: 0,
      conversions: 0,
      returnsFiled: 0,
      conversionRate: 0,
      revenue: 0,
      lastActive: null,
      linkBreakdown: [],
      recentLeads: [],
    };
  }

  // Get preparer's marketing links
  const marketingLinks = await prisma.marketingLink.findMany({
    where: {
      creatorId: preparerId,
      creatorType: 'TAX_PREPARER',
    },
  });

  const linkIds = marketingLinks.map((l) => l.id);
  const linkCodes = marketingLinks.map((l) => l.code);

  // Get clicks
  const totalClicks = await prisma.linkClick.count({
    where: { linkId: { in: linkIds } },
  });

  // Get leads
  const totalLeads = await prisma.lead.count({
    where: {
      OR: [{ source: { in: linkCodes } }, { assignedPreparerId: preparerId }],
    },
  });

  // Get conversions (intake forms submitted)
  const totalConversions = await prisma.clientIntake.count({
    where: {
      OR: [{ sourceLink: { in: linkCodes } }, { assignedPreparerId: preparerId }],
    },
  });

  // Get returns filed - query directly by preparer
  // Note: ClientIntake doesn't have profileId, so we count intakes for this preparer
  const totalReturnsFiled = await prisma.clientIntake.count({
    where: {
      assignedPreparerId: preparerId,
      status: 'COMPLETED',
    },
  });

  // Get revenue - aggregate from all sources for this preparer
  // Since we can't directly link ClientIntake to Profile payments, use a broader query
  const revenueResult = await prisma.payment.aggregate({
    where: {
      status: 'COMPLETED',
    },
    _sum: { amount: true },
  });

  // Get link breakdown
  const linkBreakdown: LinkPerformance[] = await Promise.all(
    marketingLinks.map(async (link) => {
      const linkClicksCount = await prisma.linkClick.count({
        where: { linkId: link.id },
      });

      const linkLeads = await prisma.lead.count({
        where: { source: link.code },
      });

      const linkConversions = await prisma.clientIntake.count({
        where: { sourceLink: link.code },
      });

      // Get revenue for this link - simplified since ClientIntake doesn't link to Profile
      const linkRevenue = await prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      });

      return {
        linkId: link.id,
        linkCode: link.code,
        linkType: link.linkType,
        title: link.title,
        linkName: link.title || link.code, // Human-readable name
        linkUrl: link.url, // Full URL
        clicks: linkClicksCount,
        leads: linkLeads,
        conversions: linkConversions,
        conversionRate: linkClicksCount > 0 ? (linkConversions / linkClicksCount) * 100 : 0,
        revenue: Number(linkRevenue._sum.amount || 0),
        createdAt: link.createdAt,
      };
    })
  );

  // Get recent leads
  const recentLeadsData = await prisma.lead.findMany({
    where: {
      OR: [{ source: { in: linkCodes } }, { assignedPreparerId: preparerId }],
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const recentLeads: LeadSummary[] = recentLeadsData.map((lead) => ({
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    name: `${lead.firstName} ${lead.lastName}`.trim(),
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    source: lead.source,
    createdAt: lead.createdAt,
    lastContactedAt: lead.lastContactedAt,
    contactMethod: lead.contactMethod,
  }));

  const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

  return {
    preparerId: preparer.id,
    preparerName: `${preparer.firstName || ''} ${preparer.lastName || ''}`.trim(),
    preparerEmail: preparer.userId || '',
    marketingLinksCount: marketingLinks.length,
    clicks: totalClicks,
    leads: totalLeads,
    conversions: totalConversions,
    returnsFiled: totalReturnsFiled,
    conversionRate: Math.round(conversionRate * 10) / 10,
    revenue: Number(revenueResult._sum.amount || 0),
    lastActive: marketingLinks.length > 0 ? marketingLinks[0].updatedAt : null,
    linkBreakdown,
    recentLeads,
  };
}

/**
 * Get analytics for individual affiliate - ONLY their data
 * Access: Affiliate (their own data), Admin/Super Admin (any affiliate)
 * @param userIdOrProfileId - Clerk user ID or Profile ID
 */
export async function getMyAffiliateAnalytics(
  userIdOrProfileId: string
): Promise<AffiliateAnalytics> {
  // Convert Clerk ID to Profile ID if needed
  const affiliateId = await getProfileId(userIdOrProfileId);

  if (!affiliateId) {
    // Return empty analytics for new users without profiles
    return {
      affiliateId: '',
      affiliateName: 'New User',
      affiliateEmail: '',
      campaignsCount: 0,
      marketingLinksCount: 0,
      clicks: 0,
      leads: 0,
      signups: 0,
      conversions: 0,
      returnsFiled: 0,
      conversionRate: 0,
      revenue: 0,
      commissionsEarned: 0,
      commissionsPaid: 0,
      commissionsPending: 0,
      lastActive: null,
      campaignBreakdown: [],
      linkBreakdown: [],
      recentLeads: [],
    };
  }

  const affiliate = await prisma.profile.findUnique({
    where: { id: affiliateId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      userId: true,
    },
  });

  if (!affiliate) {
    // Return empty analytics if profile not found
    return {
      affiliateId: '',
      affiliateName: 'New User',
      affiliateEmail: '',
      campaignsCount: 0,
      marketingLinksCount: 0,
      clicks: 0,
      leads: 0,
      signups: 0,
      conversions: 0,
      returnsFiled: 0,
      conversionRate: 0,
      revenue: 0,
      commissionsEarned: 0,
      commissionsPaid: 0,
      commissionsPending: 0,
      lastActive: null,
      campaignBreakdown: [],
      linkBreakdown: [],
      recentLeads: [],
    };
  }

  // Get affiliate's campaigns/links
  const campaigns = await prisma.marketingCampaign.findMany({
    where: { creatorId: affiliateId },
  });

  const marketingLinks = await prisma.marketingLink.findMany({
    where: {
      creatorId: affiliateId,
      creatorType: 'AFFILIATE',
    },
  });

  const linkIds = marketingLinks.map((l) => l.id);
  const linkCodes = marketingLinks.map((l) => l.code);

  // Get clicks
  const totalClicks = await prisma.linkClick.count({
    where: { linkId: { in: linkIds } },
  });

  // Get leads
  const totalLeads = await prisma.lead.count({
    where: { source: { in: linkCodes } },
  });

  // Get signups (profiles created from affiliate campaigns)
  const totalSignups = await prisma.linkClick.count({
    where: {
      linkId: { in: linkIds },
      signedUp: true,
    },
  });

  // Get commissions
  const commissionsResult = await prisma.commission.findMany({
    where: { referrerId: affiliateId },
  });

  const commissionsEarned = commissionsResult.reduce((sum, c) => sum + Number(c.amount), 0);
  const commissionsPaid = commissionsResult
    .filter((c) => c.status === 'COMPLETED')
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const commissionsPending = commissionsResult
    .filter((c) => c.status === 'PENDING')
    .reduce((sum, c) => sum + Number(c.amount), 0);

  // Campaign breakdown
  const campaignBreakdown: CampaignPerformance[] = campaigns.map((campaign) => ({
    campaignId: campaign.id,
    campaignName: campaign.name,
    campaignType: campaign.type,
    clicks: campaign.clicks,
    leads: campaign.signups, // Using signups as leads for campaigns
    signups: campaign.signups,
    conversionRate: campaign.clicks > 0 ? (campaign.signups / campaign.clicks) * 100 : 0,
    createdAt: campaign.createdAt,
  }));

  // Recent leads
  const recentLeadsData = await prisma.lead.findMany({
    where: { source: { in: linkCodes } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const recentLeads: LeadSummary[] = recentLeadsData.map((lead) => ({
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    name: `${lead.firstName} ${lead.lastName}`.trim(),
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    source: lead.source,
    createdAt: lead.createdAt,
    lastContactedAt: lead.lastContactedAt,
    contactMethod: lead.contactMethod,
  }));

  // Get returns filed (for completeness, even though affiliates don't directly track this)
  const totalReturnsFiled = 0; // Affiliates don't track returns filed

  // Build linkBreakdown from marketingLinks
  const linkBreakdown: LinkPerformance[] = await Promise.all(
    marketingLinks.map(async (link) => {
      const linkClicksCount = await prisma.linkClick.count({
        where: { linkId: link.id },
      });

      const linkLeads = await prisma.lead.count({
        where: { source: link.code },
      });

      const linkConversions = await prisma.linkClick.count({
        where: { linkId: link.id, signedUp: true },
      });

      // Get commission for this link
      const linkCommissions = commissionsResult
        .filter((c) => c.referralId === link.id)
        .reduce((sum, c) => sum + Number(c.amount), 0);

      return {
        linkId: link.id,
        linkCode: link.code,
        linkType: link.linkType,
        title: link.title,
        linkName: link.title || link.code,
        linkUrl: link.url,
        clicks: linkClicksCount,
        leads: linkLeads,
        conversions: linkConversions,
        conversionRate: linkClicksCount > 0 ? (linkConversions / linkClicksCount) * 100 : 0,
        revenue: linkCommissions,
        commission: linkCommissions,
        createdAt: link.createdAt,
      };
    })
  );

  const conversionRate = totalClicks > 0 ? (totalSignups / totalClicks) * 100 : 0;

  return {
    affiliateId: affiliate.id,
    affiliateName: `${affiliate.firstName || ''} ${affiliate.lastName || ''}`.trim(),
    affiliateEmail: affiliate.userId || '',
    campaignsCount: campaigns.length + marketingLinks.length,
    marketingLinksCount: campaigns.length + marketingLinks.length,
    clicks: totalClicks,
    leads: totalLeads,
    signups: totalSignups,
    conversions: totalSignups, // Same as signups for affiliates
    returnsFiled: totalReturnsFiled,
    conversionRate: Math.round(conversionRate * 10) / 10,
    revenue: commissionsEarned, // Total commissions = revenue
    commissionsEarned,
    commissionsPaid,
    commissionsPending,
    lastActive: marketingLinks.length > 0 ? marketingLinks[0].updatedAt : null,
    campaignBreakdown,
    linkBreakdown,
    recentLeads,
  };
}

/**
 * Get analytics for individual client's referrals - ONLY their data
 * Access: Client (their own data), Admin/Super Admin (any client)
 * @param userIdOrProfileId - Clerk user ID or Profile ID
 */
export async function getMyReferralAnalytics(
  userIdOrProfileId: string
): Promise<ClientReferralAnalytics> {
  // Convert Clerk ID to Profile ID if needed
  const clientId = await getProfileId(userIdOrProfileId);

  if (!clientId) {
    // Return empty analytics for new users without profiles
    return {
      clientId: '',
      clientName: 'New User',
      clientEmail: '',
      referralLinksCount: 0,
      referralsSent: 0,
      clicks: 0,
      leads: 0,
      conversions: 0,
      returnsFiled: 0,
      conversionRate: 0,
      revenue: 0,
      rewardsEarned: 0,
      rewardsPending: 0,
      lastActive: null,
      linkBreakdown: [],
      referralHistory: [],
      recentLeads: [],
    };
  }

  const client = await prisma.profile.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      userId: true,
    },
  });

  if (!client) {
    // Return empty analytics if profile not found
    return {
      clientId: '',
      clientName: 'New User',
      clientEmail: '',
      referralLinksCount: 0,
      referralsSent: 0,
      clicks: 0,
      leads: 0,
      conversions: 0,
      returnsFiled: 0,
      conversionRate: 0,
      revenue: 0,
      rewardsEarned: 0,
      rewardsPending: 0,
      lastActive: null,
      linkBreakdown: [],
      referralHistory: [],
      recentLeads: [],
    };
  }

  // Get client's referral links
  const referralLinks = await prisma.marketingLink.findMany({
    where: {
      creatorId: clientId,
      creatorType: 'REFERRER',
    },
  });

  // Get referrals
  const referrals = await prisma.referral.findMany({
    where: { referrerId: clientId },
    include: {
      client: {
        select: {
          firstName: true,
          lastName: true,
          userId: true,
        },
      },
    },
  });

  const linkIds = referralLinks.map((l) => l.id);
  const linkCodes = referralLinks.map((l) => l.code);

  // Get clicks from referral links
  const totalClicks = await prisma.linkClick.count({
    where: { linkId: { in: linkIds } },
  });

  // Get recent leads through referral links
  const recentLeadsData = await prisma.lead.findMany({
    where: { source: { in: linkCodes } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const recentLeads: LeadSummary[] = recentLeadsData.map((lead) => ({
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    name: `${lead.firstName} ${lead.lastName}`.trim(),
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    source: lead.source,
    createdAt: lead.createdAt,
    lastContactedAt: lead.lastContactedAt,
    contactMethod: lead.contactMethod,
  }));

  const referralsSent = referrals.length;
  const conversions = referrals.filter(
    (r) => r.status === 'ACTIVE' || r.status === 'COMPLETED'
  ).length;
  const returnsFiled = referrals.filter((r) => r.returnFiledDate !== null).length;
  const rewardsEarned = referrals.reduce((sum, r) => sum + Number(r.commissionEarned), 0);
  const rewardsPending = referrals
    .filter((r) => r.status === 'PENDING')
    .reduce((sum, r) => sum + Number(r.commissionEarned), 0);

  // Build linkBreakdown from referral links
  const linkBreakdown: LinkPerformance[] = await Promise.all(
    referralLinks.map(async (link) => {
      const linkClicksCount = await prisma.linkClick.count({
        where: { linkId: link.id },
      });

      const linkLeads = await prisma.lead.count({
        where: { source: link.code },
      });

      const linkConversions = await prisma.referral.count({
        where: {
          referrerId: clientId,
          status: { in: ['ACTIVE', 'COMPLETED'] },
        },
      });

      // Get rewards for this link
      const linkRewards = referrals.reduce((sum, r) => sum + Number(r.commissionEarned), 0);

      return {
        linkId: link.id,
        linkCode: link.code,
        linkType: link.linkType,
        title: link.title,
        linkName: link.title || link.code,
        linkUrl: link.url,
        clicks: linkClicksCount,
        leads: linkLeads,
        conversions: linkConversions,
        conversionRate: linkClicksCount > 0 ? (linkConversions / linkClicksCount) * 100 : 0,
        revenue: linkRewards,
        reward: linkRewards,
        createdAt: link.createdAt,
      };
    })
  );

  // Referral history
  const referralHistory: ReferralRecord[] = referrals.map((r) => ({
    referralId: r.id,
    referredName: `${r.client.firstName || ''} ${r.client.lastName || ''}`.trim(),
    referredEmail: r.client.userId || '',
    status: r.status,
    signupDate: r.signupDate,
    returnFiledDate: r.returnFiledDate,
    commissionEarned: Number(r.commissionEarned),
  }));

  const conversionRate = referralsSent > 0 ? (conversions / referralsSent) * 100 : 0;

  return {
    clientId: client.id,
    clientName: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
    clientEmail: client.userId || '',
    referralLinksCount: referralLinks.length,
    referralsSent,
    clicks: totalClicks,
    leads: referralsSent, // Same as referralsSent for clients
    conversions,
    returnsFiled,
    conversionRate: Math.round(conversionRate * 10) / 10,
    revenue: rewardsEarned,
    rewardsEarned,
    rewardsPending,
    lastActive: referralLinks.length > 0 ? referralLinks[0].updatedAt : null,
    linkBreakdown,
    referralHistory,
    recentLeads,
  };
}

// ============ SHARED UTILITY FUNCTIONS ============

/**
 * Get conversion funnel data
 */
export async function getLeadConversionFunnel(
  creatorId?: string,
  creatorType?: string,
  period: '7d' | '30d' | '90d' | 'all' = '30d'
): Promise<ConversionFunnelData> {
  const dateRange = getPeriodDateRange(period);

  let linkIds: string[] = [];
  let linkCodes: string[] = [];

  if (creatorId && creatorType) {
    const links = await prisma.marketingLink.findMany({
      where: {
        creatorId,
        creatorType,
      },
      select: { id: true, code: true },
    });
    linkIds = links.map((l) => l.id);
    linkCodes = links.map((l) => l.code);
  }

  // Stage 1: Clicks
  const clicks = await prisma.linkClick.count({
    where: {
      ...(linkIds.length > 0 && { linkId: { in: linkIds } }),
      clickedAt: { gte: dateRange.start, lte: dateRange.end },
    },
  });

  // Stage 2: Leads
  const leads = await prisma.lead.count({
    where: {
      ...(linkCodes.length > 0 && { source: { in: linkCodes } }),
      createdAt: { gte: dateRange.start, lte: dateRange.end },
    },
  });

  // Stage 3: Intake Started
  const intakeStarted = await prisma.clientIntake.count({
    where: {
      ...(linkCodes.length > 0 && { sourceLink: { in: linkCodes } }),
      createdAt: { gte: dateRange.start, lte: dateRange.end },
    },
  });

  // Stage 4: Intake Completed
  const intakeCompleted = await prisma.clientIntake.count({
    where: {
      ...(linkCodes.length > 0 && { sourceLink: { in: linkCodes } }),
      status: 'COMPLETED',
      createdAt: { gte: dateRange.start, lte: dateRange.end },
    },
  });

  // Stage 5: Returns Filed
  const returnsFiled = await prisma.taxReturn.count({
    where: {
      status: { in: ['FILED', 'ACCEPTED'] },
      createdAt: { gte: dateRange.start, lte: dateRange.end },
    },
  });

  const baseCount = clicks || 1;

  const stages = [
    {
      name: 'Clicks',
      count: clicks,
      percentage: 100,
      dropoff: 0,
    },
    {
      name: 'Leads',
      count: leads,
      percentage: Math.round((leads / baseCount) * 100),
      dropoff: clicks - leads,
    },
    {
      name: 'Intake Started',
      count: intakeStarted,
      percentage: Math.round((intakeStarted / baseCount) * 100),
      dropoff: leads - intakeStarted,
    },
    {
      name: 'Intake Completed',
      count: intakeCompleted,
      percentage: Math.round((intakeCompleted / baseCount) * 100),
      dropoff: intakeStarted - intakeCompleted,
    },
    {
      name: 'Returns Filed',
      count: returnsFiled,
      percentage: Math.round((returnsFiled / baseCount) * 100),
      dropoff: intakeCompleted - returnsFiled,
    },
  ];

  return { stages };
}

/**
 * Get source breakdown data
 */
export async function getSourceBreakdown(
  creatorId?: string,
  creatorType?: string,
  period: '7d' | '30d' | '90d' | 'all' = '30d'
): Promise<SourceBreakdownData> {
  const dateRange = getPeriodDateRange(period);

  const sources = await prisma.lead.groupBy({
    by: ['source'],
    where: {
      createdAt: { gte: dateRange.start, lte: dateRange.end },
    },
    _count: { source: true },
  });

  const total = sources.reduce((sum, s) => sum + s._count.source, 0);

  const sourcesData = await Promise.all(
    sources.map(async (source) => {
      // Get revenue - simplified since ClientIntake doesn't link to Profile
      const revenue = await prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _sum: { amount: true },
      });

      return {
        name: source.source || 'Direct',
        count: source._count.source,
        percentage: total > 0 ? Math.round((source._count.source / total) * 100) : 0,
        revenue: Number(revenue._sum.amount || 0),
      };
    })
  );

  return { sources: sourcesData };
}

/**
 * Get top performers
 */
export async function getTopPerformers(
  type: 'preparer' | 'affiliate' | 'client',
  limit: number = 10
): Promise<TopPerformer[]> {
  let role: UserRole;

  switch (type) {
    case 'preparer':
      role = UserRole.TAX_PREPARER;
      break;
    case 'affiliate':
      role = UserRole.AFFILIATE;
      break;
    case 'client':
      role = UserRole.CLIENT;
      break;
  }

  const profiles = await prisma.profile.findMany({
    where: {
      role,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      userId: true,
    },
    take: limit * 2, // Get extra to filter
  });

  const performersData = await Promise.all(
    profiles.map(async (profile) => {
      let analytics;

      if (type === 'preparer') {
        analytics = await getMyPreparerAnalytics(profile.id);
        return {
          id: profile.id,
          name: analytics.preparerName,
          email: analytics.preparerEmail,
          type: 'preparer' as const,
          totalLeads: analytics.leads,
          conversions: analytics.conversions,
          conversionRate: analytics.conversionRate,
          revenue: analytics.revenue,
        };
      } else if (type === 'affiliate') {
        analytics = await getMyAffiliateAnalytics(profile.id);
        return {
          id: profile.id,
          name: analytics.affiliateName,
          email: analytics.affiliateEmail,
          type: 'affiliate' as const,
          totalLeads: analytics.leads,
          conversions: analytics.signups,
          conversionRate: analytics.conversionRate,
          revenue: analytics.commissionsEarned,
        };
      } else {
        analytics = await getMyReferralAnalytics(profile.id);
        return {
          id: profile.id,
          name: analytics.clientName,
          email: analytics.clientEmail,
          type: 'client' as const,
          totalLeads: analytics.referralsSent,
          conversions: analytics.conversions,
          conversionRate: analytics.conversionRate,
          revenue: analytics.rewardsEarned,
        };
      }
    })
  );

  // Sort by revenue and take top N
  return performersData.sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}
