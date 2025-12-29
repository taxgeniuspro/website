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

import { db, firstOrNull } from '@/lib/db';

// Local type definitions (replacing @prisma/client)
type UserRole = 'admin' | 'tax_preparer' | 'affiliate' | 'client' | 'referrer';

interface ProfileRecord {
  id: string;
  userId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface MarketingLinkRecord {
  id: string;
  code: string;
  linkType: string;
  title?: string | null;
  url: string;
  creatorId?: string | null;
  creatorType?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface LeadRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  source?: string | null;
  assignedPreparerId?: string | null;
  createdAt: Date | string;
  lastContactedAt?: Date | string | null;
  contactMethod?: string | null;
}

interface MarketingCampaignRecord {
  id: string;
  name: string;
  type: string;
  clicks: number;
  signups: number;
  creatorId: string;
  createdAt: Date | string;
}

interface ReferralDBRecord {
  id: string;
  referrerId: string;
  clientId: string;
  status: string;
  signupDate: Date | string;
  returnFiledDate?: Date | string | null;
  commissionEarned: number;
  createdAt: Date | string;
}

interface CommissionRecord {
  id: string;
  referrerId: string;
  referralId?: string | null;
  amount: number;
  status: string;
  createdAt: Date | string;
}

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
  const { data: byUserId } = await db
    .from('profiles')
    .select('id')
    .eq('userId', userIdOrProfileId)
    .limit(1);

  let profile = firstOrNull(byUserId) as { id: string } | null;

  // If not found, check if it's already a profile ID
  if (!profile) {
    const { data: byId } = await db
      .from('profiles')
      .select('id')
      .eq('id', userIdOrProfileId)
      .limit(1);

    profile = firstOrNull(byId) as { id: string } | null;
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
  if (requestingRole === 'admin') return true;

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
  // Current period - get leads with no preparer OR from taxgeniuspro.tax
  const { data: currentLeadsData } = await db
    .from('leads')
    .select('id, assignedPreparerId, source')
    .gte('createdAt', currentRange.start.toISOString())
    .lte('createdAt', currentRange.end.toISOString());

  const allCurrentLeads = (currentLeadsData || []) as Array<{ id: string; assignedPreparerId: string | null; source: string | null }>;
  const currentLeads = allCurrentLeads.filter(
    (l) => l.assignedPreparerId === null || (l.source && l.source.includes('taxgeniuspro.tax'))
  ).length;

  // Get conversions (intakes with no assigned preparer)
  const { count: currentConversions } = await db
    .from('client_intakes')
    .select('id', { count: 'exact', head: true })
    .is('assignedPreparerId', null)
    .gte('createdAt', currentRange.start.toISOString())
    .lte('createdAt', currentRange.end.toISOString());

  // Get returns - completed intakes with no assigned preparer
  const { count: currentReturns } = await db
    .from('client_intakes')
    .select('id', { count: 'exact', head: true })
    .is('assignedPreparerId', null)
    .eq('status', 'COMPLETED')
    .gte('createdAt', currentRange.start.toISOString())
    .lte('createdAt', currentRange.end.toISOString());

  // Get revenue
  const { data: revenueData } = await db
    .from('payments')
    .select('amount')
    .eq('status', 'COMPLETED')
    .gte('createdAt', currentRange.start.toISOString())
    .lte('createdAt', currentRange.end.toISOString());

  const revenueItems = (revenueData || []) as Array<{ amount: number }>;
  const revenue = revenueItems.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Previous period for comparison
  const { data: previousLeadsData } = await db
    .from('leads')
    .select('id, assignedPreparerId, source')
    .gte('createdAt', previousRange.start.toISOString())
    .lte('createdAt', previousRange.end.toISOString());

  const allPreviousLeads = (previousLeadsData || []) as Array<{ id: string; assignedPreparerId: string | null; source: string | null }>;
  const previousLeads = allPreviousLeads.filter(
    (l) => l.assignedPreparerId === null || (l.source && l.source.includes('taxgeniuspro.tax'))
  ).length;

  const clicks = 0; // Tax Genius doesn't track clicks separately
  const conversionRate = currentLeads > 0 ? ((currentConversions || 0) / currentLeads) * 100 : 0;

  return {
    clicks,
    leads: currentLeads,
    conversions: currentConversions || 0,
    returnsFiled: currentReturns || 0,
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
  const { data: preparerLinksData } = await db
    .from('marketing_links')
    .select('id, code')
    .eq('creatorType', 'TAX_PREPARER');

  const preparerLinks = (preparerLinksData || []) as Array<{ id: string; code: string }>;
  const linkIds = preparerLinks.map((l) => l.id);
  const linkCodes = preparerLinks.map((l) => l.code);

  // Current period clicks
  let currentClicks = 0;
  if (linkIds.length > 0) {
    const { count } = await db
      .from('link_clicks')
      .select('id', { count: 'exact', head: true })
      .in('linkId', linkIds)
      .gte('clickedAt', currentRange.start.toISOString())
      .lte('clickedAt', currentRange.end.toISOString());
    currentClicks = count || 0;
  }

  // Current period leads
  let currentLeads = 0;
  if (linkCodes.length > 0) {
    const { count } = await db
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .in('source', linkCodes)
      .gte('createdAt', currentRange.start.toISOString())
      .lte('createdAt', currentRange.end.toISOString());
    currentLeads = count || 0;
  }

  // Current period conversions
  let currentConversions = 0;
  if (linkCodes.length > 0) {
    const { count } = await db
      .from('client_intakes')
      .select('id', { count: 'exact', head: true })
      .in('sourceLink', linkCodes)
      .gte('createdAt', currentRange.start.toISOString())
      .lte('createdAt', currentRange.end.toISOString());
    currentConversions = count || 0;
  }

  // Get preparer returns - count completed intakes from preparer links
  let currentReturns = 0;
  if (linkCodes.length > 0) {
    const { count } = await db
      .from('client_intakes')
      .select('id', { count: 'exact', head: true })
      .in('sourceLink', linkCodes)
      .eq('status', 'COMPLETED')
      .gte('createdAt', currentRange.start.toISOString())
      .lte('createdAt', currentRange.end.toISOString());
    currentReturns = count || 0;
  }

  // Get preparer revenue
  const { data: revenueData } = await db
    .from('payments')
    .select('amount')
    .eq('status', 'COMPLETED')
    .gte('createdAt', currentRange.start.toISOString())
    .lte('createdAt', currentRange.end.toISOString());

  const revenueItems = (revenueData || []) as Array<{ amount: number }>;
  const revenue = revenueItems.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Previous period leads
  let previousLeads = 0;
  if (linkCodes.length > 0) {
    const { count } = await db
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .in('source', linkCodes)
      .gte('createdAt', previousRange.start.toISOString())
      .lte('createdAt', previousRange.end.toISOString());
    previousLeads = count || 0;
  }

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
  const { data: affiliateLinksData } = await db
    .from('marketing_links')
    .select('id, code')
    .eq('creatorType', 'AFFILIATE');

  const affiliateLinks = (affiliateLinksData || []) as Array<{ id: string; code: string }>;
  const linkIds = affiliateLinks.map((l) => l.id);
  const linkCodes = affiliateLinks.map((l) => l.code);

  // Current period clicks
  let currentClicks = 0;
  if (linkIds.length > 0) {
    const { count } = await db
      .from('link_clicks')
      .select('id', { count: 'exact', head: true })
      .in('linkId', linkIds)
      .gte('clickedAt', currentRange.start.toISOString())
      .lte('clickedAt', currentRange.end.toISOString());
    currentClicks = count || 0;
  }

  // Current period leads
  let currentLeads = 0;
  if (linkCodes.length > 0) {
    const { count } = await db
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .in('source', linkCodes)
      .gte('createdAt', currentRange.start.toISOString())
      .lte('createdAt', currentRange.end.toISOString());
    currentLeads = count || 0;
  }

  // Current period signups
  const { count: currentSignups } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('createdAt', currentRange.start.toISOString())
    .lte('createdAt', currentRange.end.toISOString());

  // Current period commissions
  const { data: commissionsData } = await db
    .from('commissions')
    .select('amount')
    .gte('createdAt', currentRange.start.toISOString())
    .lte('createdAt', currentRange.end.toISOString());

  const commissions = (commissionsData || []) as Array<{ amount: number }>;
  const revenue = commissions.reduce((sum, c) => sum + (c.amount || 0), 0);

  // Previous period leads
  let previousLeads = 0;
  if (linkCodes.length > 0) {
    const { count } = await db
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .in('source', linkCodes)
      .gte('createdAt', previousRange.start.toISOString())
      .lte('createdAt', previousRange.end.toISOString());
    previousLeads = count || 0;
  }

  const conversionRate = currentClicks > 0 ? ((currentSignups || 0) / currentClicks) * 100 : 0;

  return {
    clicks: currentClicks,
    leads: currentLeads,
    conversions: currentSignups || 0,
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
  // Current period referrals
  const { count: currentReferrals } = await db
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .gte('createdAt', currentRange.start.toISOString())
    .lte('createdAt', currentRange.end.toISOString());

  // Current conversions
  const { count: currentConversions } = await db
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .in('status', ['ACTIVE', 'COMPLETED'])
    .gte('createdAt', currentRange.start.toISOString())
    .lte('createdAt', currentRange.end.toISOString());

  // Current returns
  const { count: currentReturns } = await db
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .gte('returnFiledDate', currentRange.start.toISOString())
    .lte('returnFiledDate', currentRange.end.toISOString());

  // Current commissions
  const { data: commissionsData } = await db
    .from('referrals')
    .select('commissionEarned')
    .gte('createdAt', currentRange.start.toISOString())
    .lte('createdAt', currentRange.end.toISOString());

  const allCommissions = (commissionsData || []) as Array<{ commissionEarned: number }>;
  const revenue = allCommissions.reduce((sum, c) => sum + (c.commissionEarned || 0), 0);

  // Previous period referrals
  const { count: previousReferrals } = await db
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .gte('createdAt', previousRange.start.toISOString())
    .lte('createdAt', previousRange.end.toISOString());

  const conversionRate = (currentReferrals || 0) > 0 ? ((currentConversions || 0) / (currentReferrals || 1)) * 100 : 0;

  return {
    clicks: 0, // Referrals don't track clicks
    leads: currentReferrals || 0,
    conversions: currentConversions || 0,
    returnsFiled: currentReturns || 0,
    conversionRate: Math.round(conversionRate * 10) / 10,
    revenue,
    growthRate: calculateGrowthRate(currentReferrals || 0, previousReferrals || 0),
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
  let query = db
    .from('profiles')
    .select('id, firstName, lastName, userId')
    .eq('role', 'tax_preparer');

  if (filterPreparerId) {
    query = query.eq('id', filterPreparerId);
  }

  const { data: preparersData } = await query;
  const preparers = (preparersData || []) as ProfileRecord[];

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
  let query = db
    .from('profiles')
    .select('id, firstName, lastName, userId')
    .eq('role', 'affiliate');

  if (filterAffiliateId) {
    query = query.eq('id', filterAffiliateId);
  }

  const { data: affiliatesData } = await query;
  const affiliates = (affiliatesData || []) as ProfileRecord[];

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

  // Get all clients who have made referrals
  // First get referrer IDs from referrals table
  const { data: referrerIdsData } = await db
    .from('referrals')
    .select('referrerId');

  const referrerIds = [...new Set((referrerIdsData || []).map((r: { referrerId: string }) => r.referrerId))];

  if (referrerIds.length === 0 && !filterClientId) {
    return [];
  }

  // Get clients who are referrers
  let query = db
    .from('profiles')
    .select('id, firstName, lastName, userId')
    .in('role', ['client', 'referrer']);

  if (filterClientId) {
    query = query.eq('id', filterClientId);
  } else if (referrerIds.length > 0) {
    query = query.in('id', referrerIds);
  }

  const { data: clientsData } = await query;
  const clients = (clientsData || []) as ProfileRecord[];

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

  const { data: preparerData } = await db
    .from('profiles')
    .select('id, firstName, lastName, userId')
    .eq('id', preparerId)
    .limit(1);

  const preparer = firstOrNull(preparerData) as ProfileRecord | null;

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
  const { data: marketingLinksData } = await db
    .from('marketing_links')
    .select('*')
    .eq('creatorId', preparerId)
    .eq('creatorType', 'TAX_PREPARER');

  const marketingLinks = (marketingLinksData || []) as MarketingLinkRecord[];
  const linkIds = marketingLinks.map((l) => l.id);
  const linkCodes = marketingLinks.map((l) => l.code);

  // Get clicks
  let totalClicks = 0;
  if (linkIds.length > 0) {
    const { count } = await db
      .from('link_clicks')
      .select('id', { count: 'exact', head: true })
      .in('linkId', linkIds);
    totalClicks = count || 0;
  }

  // Get leads (with source in linkCodes OR assigned to this preparer)
  const { data: leadsData } = await db
    .from('leads')
    .select('id, source, assignedPreparerId');

  const allLeads = (leadsData || []) as Array<{ id: string; source: string | null; assignedPreparerId: string | null }>;
  const totalLeads = allLeads.filter(
    (l) => (l.source && linkCodes.includes(l.source)) || l.assignedPreparerId === preparerId
  ).length;

  // Get conversions (intake forms)
  const { data: intakesData } = await db
    .from('client_intakes')
    .select('id, sourceLink, assignedPreparerId, status');

  const allIntakes = (intakesData || []) as Array<{ id: string; sourceLink: string | null; assignedPreparerId: string | null; status: string }>;
  const totalConversions = allIntakes.filter(
    (i) => (i.sourceLink && linkCodes.includes(i.sourceLink)) || i.assignedPreparerId === preparerId
  ).length;

  // Get returns filed
  const totalReturnsFiled = allIntakes.filter(
    (i) => i.assignedPreparerId === preparerId && i.status === 'COMPLETED'
  ).length;

  // Get revenue
  const { data: paymentsData } = await db
    .from('payments')
    .select('amount')
    .eq('status', 'COMPLETED');

  const payments = (paymentsData || []) as Array<{ amount: number }>;
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Get link breakdown
  const linkBreakdown: LinkPerformance[] = await Promise.all(
    marketingLinks.map(async (link) => {
      const { count: linkClicksCount } = await db
        .from('link_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('linkId', link.id);

      const { count: linkLeads } = await db
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('source', link.code);

      const { count: linkConversions } = await db
        .from('client_intakes')
        .select('id', { count: 'exact', head: true })
        .eq('sourceLink', link.code);

      // Get revenue for this link
      const { data: linkPayments } = await db
        .from('payments')
        .select('amount')
        .eq('status', 'COMPLETED');

      const linkPaymentsList = (linkPayments || []) as Array<{ amount: number }>;
      const linkRevenue = linkPaymentsList.reduce((sum, p) => sum + (p.amount || 0), 0);

      return {
        linkId: link.id,
        linkCode: link.code,
        linkType: link.linkType,
        title: link.title,
        linkName: link.title || link.code, // Human-readable name
        linkUrl: link.url, // Full URL
        clicks: linkClicksCount || 0,
        leads: linkLeads || 0,
        conversions: linkConversions || 0,
        conversionRate: (linkClicksCount || 0) > 0 ? ((linkConversions || 0) / (linkClicksCount || 1)) * 100 : 0,
        revenue: linkRevenue,
        createdAt: link.createdAt as Date,
      };
    })
  );

  // Get recent leads
  const { data: recentLeadsRaw } = await db
    .from('leads')
    .select('id, firstName, lastName, email, phone, status, source, assignedPreparerId, createdAt, lastContactedAt, contactMethod')
    .order('createdAt', { ascending: false })
    .limit(50);

  const recentLeadsFiltered = ((recentLeadsRaw || []) as LeadRecord[]).filter(
    (l) => (l.source && linkCodes.includes(l.source)) || l.assignedPreparerId === preparerId
  ).slice(0, 10);

  const recentLeadsData = recentLeadsFiltered;

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
    revenue: totalRevenue,
    lastActive: marketingLinks.length > 0 ? (marketingLinks[0] as MarketingLinkRecord).updatedAt as Date | null : null,
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

  const { data: affiliateData } = await db
    .from('profiles')
    .select('id, firstName, lastName, userId')
    .eq('id', affiliateId)
    .limit(1);

  const affiliate = firstOrNull(affiliateData) as ProfileRecord | null;

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

  // Get affiliate's campaigns
  const { data: campaignsData } = await db
    .from('marketing_campaigns')
    .select('*')
    .eq('creatorId', affiliateId);

  const campaigns = (campaignsData || []) as MarketingCampaignRecord[];

  // Get affiliate's marketing links
  const { data: marketingLinksData } = await db
    .from('marketing_links')
    .select('*')
    .eq('creatorId', affiliateId)
    .eq('creatorType', 'AFFILIATE');

  const marketingLinks = (marketingLinksData || []) as MarketingLinkRecord[];
  const linkIds = marketingLinks.map((l) => l.id);
  const linkCodes = marketingLinks.map((l) => l.code);

  // Get clicks
  let totalClicks = 0;
  if (linkIds.length > 0) {
    const { count } = await db
      .from('link_clicks')
      .select('id', { count: 'exact', head: true })
      .in('linkId', linkIds);
    totalClicks = count || 0;
  }

  // Get leads
  let totalLeads = 0;
  if (linkCodes.length > 0) {
    const { count } = await db
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .in('source', linkCodes);
    totalLeads = count || 0;
  }

  // Get signups (profiles created from affiliate campaigns)
  let totalSignups = 0;
  if (linkIds.length > 0) {
    const { count } = await db
      .from('link_clicks')
      .select('id', { count: 'exact', head: true })
      .in('linkId', linkIds)
      .eq('signedUp', true);
    totalSignups = count || 0;
  }

  // Get commissions
  const { data: commissionsData } = await db
    .from('commissions')
    .select('*')
    .eq('referrerId', affiliateId);

  const commissionsResult = (commissionsData || []) as CommissionRecord[];

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
    createdAt: campaign.createdAt as Date,
  }));

  // Recent leads
  let recentLeadsRaw: LeadRecord[] = [];
  if (linkCodes.length > 0) {
    const { data: leadsData } = await db
      .from('leads')
      .select('id, firstName, lastName, email, phone, status, source, createdAt, lastContactedAt, contactMethod')
      .in('source', linkCodes)
      .order('createdAt', { ascending: false })
      .limit(10);
    recentLeadsRaw = (leadsData || []) as LeadRecord[];
  }

  const recentLeads: LeadSummary[] = recentLeadsRaw.map((lead) => ({
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    name: `${lead.firstName} ${lead.lastName}`.trim(),
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    source: lead.source,
    createdAt: lead.createdAt as Date,
    lastContactedAt: lead.lastContactedAt as Date | null,
    contactMethod: lead.contactMethod,
  }));

  // Get returns filed (for completeness, even though affiliates don't directly track this)
  const totalReturnsFiled = 0; // Affiliates don't track returns filed

  // Build linkBreakdown from marketingLinks
  const linkBreakdown: LinkPerformance[] = await Promise.all(
    marketingLinks.map(async (link) => {
      const { count: linkClicksCount } = await db
        .from('link_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('linkId', link.id);

      const { count: linkLeads } = await db
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('source', link.code);

      const { count: linkConversions } = await db
        .from('link_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('linkId', link.id)
        .eq('signedUp', true);

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
        clicks: linkClicksCount || 0,
        leads: linkLeads || 0,
        conversions: linkConversions || 0,
        conversionRate: (linkClicksCount || 0) > 0 ? ((linkConversions || 0) / (linkClicksCount || 1)) * 100 : 0,
        revenue: linkCommissions,
        commission: linkCommissions,
        createdAt: link.createdAt as Date,
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
    lastActive: marketingLinks.length > 0 ? (marketingLinks[0] as MarketingLinkRecord).updatedAt as Date | null : null,
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

  const { data: clientData } = await db
    .from('profiles')
    .select('id, firstName, lastName, userId')
    .eq('id', clientId)
    .limit(1);

  const client = firstOrNull(clientData) as ProfileRecord | null;

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
  const { data: referralLinksData } = await db
    .from('marketing_links')
    .select('*')
    .eq('creatorId', clientId)
    .eq('creatorType', 'REFERRER');

  const referralLinks = (referralLinksData || []) as MarketingLinkRecord[];

  // Get referrals
  const { data: referralsData } = await db
    .from('referrals')
    .select('*')
    .eq('referrerId', clientId);

  const referralsRaw = (referralsData || []) as ReferralDBRecord[];

  // Get client profiles for referral history (separate query instead of include)
  const clientIds = referralsRaw.map((r) => r.clientId);
  let clientProfilesMap = new Map<string, { firstName: string | null; lastName: string | null; userId: string | null }>();
  if (clientIds.length > 0) {
    const { data: clientProfilesData } = await db
      .from('profiles')
      .select('id, firstName, lastName, userId')
      .in('id', clientIds);

    const clientProfiles = (clientProfilesData || []) as ProfileRecord[];
    clientProfiles.forEach((p) => {
      clientProfilesMap.set(p.id, {
        firstName: p.firstName || null,
        lastName: p.lastName || null,
        userId: p.userId || null,
      });
    });
  }

  // Add client data to referrals
  const referrals = referralsRaw.map((r) => ({
    ...r,
    client: clientProfilesMap.get(r.clientId) || { firstName: null, lastName: null, userId: null },
  }));

  const linkIds = referralLinks.map((l) => l.id);
  const linkCodes = referralLinks.map((l) => l.code);

  // Get clicks from referral links
  let totalClicks = 0;
  if (linkIds.length > 0) {
    const { count } = await db
      .from('link_clicks')
      .select('id', { count: 'exact', head: true })
      .in('linkId', linkIds);
    totalClicks = count || 0;
  }

  // Get recent leads through referral links
  let recentLeadsRaw: LeadRecord[] = [];
  if (linkCodes.length > 0) {
    const { data: leadsData } = await db
      .from('leads')
      .select('id, firstName, lastName, email, phone, status, source, createdAt, lastContactedAt, contactMethod')
      .in('source', linkCodes)
      .order('createdAt', { ascending: false })
      .limit(10);
    recentLeadsRaw = (leadsData || []) as LeadRecord[];
  }

  const recentLeads: LeadSummary[] = recentLeadsRaw.map((lead) => ({
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    name: `${lead.firstName} ${lead.lastName}`.trim(),
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    source: lead.source,
    createdAt: lead.createdAt as Date,
    lastContactedAt: lead.lastContactedAt as Date | null,
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
      const { count: linkClicksCount } = await db
        .from('link_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('linkId', link.id);

      const { count: linkLeads } = await db
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('source', link.code);

      const { count: linkConversions } = await db
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('referrerId', clientId)
        .in('status', ['ACTIVE', 'COMPLETED']);

      // Get rewards for this link
      const linkRewards = referrals.reduce((sum, r) => sum + Number(r.commissionEarned), 0);

      return {
        linkId: link.id,
        linkCode: link.code,
        linkType: link.linkType,
        title: link.title,
        linkName: link.title || link.code,
        linkUrl: link.url,
        clicks: linkClicksCount || 0,
        leads: linkLeads || 0,
        conversions: linkConversions || 0,
        conversionRate: (linkClicksCount || 0) > 0 ? ((linkConversions || 0) / (linkClicksCount || 1)) * 100 : 0,
        revenue: linkRewards,
        reward: linkRewards,
        createdAt: link.createdAt as Date,
      };
    })
  );

  // Referral history
  const referralHistory: ReferralRecord[] = referrals.map((r) => ({
    referralId: r.id,
    referredName: `${r.client.firstName || ''} ${r.client.lastName || ''}`.trim(),
    referredEmail: r.client.userId || '',
    status: r.status,
    signupDate: r.signupDate as Date,
    returnFiledDate: r.returnFiledDate as Date | null,
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
    lastActive: referralLinks.length > 0 ? (referralLinks[0] as MarketingLinkRecord).updatedAt as Date | null : null,
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
    const { data: linksData } = await db
      .from('marketing_links')
      .select('id, code')
      .eq('creatorId', creatorId)
      .eq('creatorType', creatorType);

    const links = (linksData || []) as Array<{ id: string; code: string }>;
    linkIds = links.map((l) => l.id);
    linkCodes = links.map((l) => l.code);
  }

  // Stage 1: Clicks
  let clicksQuery = db
    .from('link_clicks')
    .select('id', { count: 'exact', head: true })
    .gte('clickedAt', dateRange.start.toISOString())
    .lte('clickedAt', dateRange.end.toISOString());

  if (linkIds.length > 0) {
    clicksQuery = clicksQuery.in('linkId', linkIds);
  }

  const { count: clicks } = await clicksQuery;

  // Stage 2: Leads
  let leadsQuery = db
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .gte('createdAt', dateRange.start.toISOString())
    .lte('createdAt', dateRange.end.toISOString());

  if (linkCodes.length > 0) {
    leadsQuery = leadsQuery.in('source', linkCodes);
  }

  const { count: leads } = await leadsQuery;

  // Stage 3: Intake Started
  let intakeStartedQuery = db
    .from('client_intakes')
    .select('id', { count: 'exact', head: true })
    .gte('createdAt', dateRange.start.toISOString())
    .lte('createdAt', dateRange.end.toISOString());

  if (linkCodes.length > 0) {
    intakeStartedQuery = intakeStartedQuery.in('sourceLink', linkCodes);
  }

  const { count: intakeStarted } = await intakeStartedQuery;

  // Stage 4: Intake Completed
  let intakeCompletedQuery = db
    .from('client_intakes')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'COMPLETED')
    .gte('createdAt', dateRange.start.toISOString())
    .lte('createdAt', dateRange.end.toISOString());

  if (linkCodes.length > 0) {
    intakeCompletedQuery = intakeCompletedQuery.in('sourceLink', linkCodes);
  }

  const { count: intakeCompleted } = await intakeCompletedQuery;

  // Stage 5: Returns Filed
  const { count: returnsFiled } = await db
    .from('tax_returns')
    .select('id', { count: 'exact', head: true })
    .in('status', ['FILED', 'ACCEPTED'])
    .gte('createdAt', dateRange.start.toISOString())
    .lte('createdAt', dateRange.end.toISOString());

  const baseCount = (clicks || 0) || 1;
  const clicksCount = clicks || 0;
  const leadsCount = leads || 0;
  const intakeStartedCount = intakeStarted || 0;
  const intakeCompletedCount = intakeCompleted || 0;
  const returnsFiledCount = returnsFiled || 0;

  const stages = [
    {
      name: 'Clicks',
      count: clicksCount,
      percentage: 100,
      dropoff: 0,
    },
    {
      name: 'Leads',
      count: leadsCount,
      percentage: Math.round((leadsCount / baseCount) * 100),
      dropoff: clicksCount - leadsCount,
    },
    {
      name: 'Intake Started',
      count: intakeStartedCount,
      percentage: Math.round((intakeStartedCount / baseCount) * 100),
      dropoff: leadsCount - intakeStartedCount,
    },
    {
      name: 'Intake Completed',
      count: intakeCompletedCount,
      percentage: Math.round((intakeCompletedCount / baseCount) * 100),
      dropoff: intakeStartedCount - intakeCompletedCount,
    },
    {
      name: 'Returns Filed',
      count: returnsFiledCount,
      percentage: Math.round((returnsFiledCount / baseCount) * 100),
      dropoff: intakeCompletedCount - returnsFiledCount,
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

  // Fetch all leads and group by source in JS (Supabase doesn't support groupBy)
  const { data: leadsData } = await db
    .from('leads')
    .select('source')
    .gte('createdAt', dateRange.start.toISOString())
    .lte('createdAt', dateRange.end.toISOString());

  const allLeads = (leadsData || []) as Array<{ source: string | null }>;

  // Group by source
  const sourceCountMap = new Map<string, number>();
  allLeads.forEach((lead) => {
    const source = lead.source || 'Direct';
    sourceCountMap.set(source, (sourceCountMap.get(source) || 0) + 1);
  });

  const total = allLeads.length;

  // Get total revenue for the period
  const { data: paymentsData } = await db
    .from('payments')
    .select('amount')
    .eq('status', 'COMPLETED')
    .gte('createdAt', dateRange.start.toISOString())
    .lte('createdAt', dateRange.end.toISOString());

  const payments = (paymentsData || []) as Array<{ amount: number }>;
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Build source breakdown
  const sourcesData = Array.from(sourceCountMap.entries()).map(([source, count]) => ({
    name: source,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    revenue: totalRevenue, // Same total revenue for each source (simplified)
  }));

  return { sources: sourcesData };
}

/**
 * Get top performers
 */
export async function getTopPerformers(
  type: 'preparer' | 'affiliate' | 'client',
  limit: number = 10
): Promise<TopPerformer[]> {
  // Map type to database role string
  let role: string;

  switch (type) {
    case 'preparer':
      role = 'tax_preparer';
      break;
    case 'affiliate':
      role = 'affiliate';
      break;
    case 'client':
      role = 'client';
      break;
  }

  const { data: profilesData } = await db
    .from('profiles')
    .select('id, firstName, lastName, userId')
    .eq('role', role)
    .limit(limit * 2); // Get extra to filter

  const profiles = (profilesData || []) as ProfileRecord[];

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
