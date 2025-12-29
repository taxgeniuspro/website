/**
 * Admin Analytics Service
 *
 * Provides Top 15 rankings and platform-wide analytics for Super Admin dashboard.
 * Optimized queries with proper indexing for < 500ms response times.
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6.3
 */

import { db, firstOrNull } from '../db';

// Local type definitions (replacing @prisma/client)
interface MarketingLinkRecord {
  id: string;
  code: string;
  title?: string | null;
  linkType: string;
  location?: string | null;
  creatorId: string;
  creatorType: string;
  isActive: boolean;
  clicks: number;
  intakeStarts?: number | null;
  intakeCompletes?: number | null;
  returnsFiled?: number | null;
  filedConversionRate?: number | null;
  createdAt: string;
}

interface ProfileRecord {
  id: string;
  userId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
}

interface CommissionRecord {
  id: string;
  amount: number;
  referrerId: string;
  status: string;
  paidAt?: string | null;
  createdAt: string;
}

interface LinkClickRecord {
  id: string;
  city?: string | null;
  state?: string | null;
  converted?: number | null;
  signedUp?: number | null;
  clickedAt: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface PayoutRequestRecord {
  id: string;
  profileId: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface ReferralRecord {
  id: string;
  referrerId: string;
  status: string;
}

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
  // Build query for marketing links
  let linksQuery = db.from('marketing_links').select('clicks, intakeStarts, intakeCompletes, returnsFiled').eq('isActive', true);

  if (dateRange) {
    linksQuery = linksQuery
      .gte('createdAt', dateRange.start.toISOString())
      .lte('createdAt', dateRange.end.toISOString());
  }

  const { data: linksData } = await linksQuery;
  const links = (linksData || []) as MarketingLinkRecord[];

  // Aggregate link stats manually
  let totalClicks = 0;
  let intakeStarts = 0;
  let intakeCompletes = 0;
  let returnsFiled = 0;

  for (const link of links) {
    totalClicks += link.clicks || 0;
    intakeStarts += link.intakeStarts || 0;
    intakeCompletes += link.intakeCompletes || 0;
    returnsFiled += link.returnsFiled || 0;
  }

  // Count active users by role
  const [{ count: preparersCount }, { count: affiliatesCount }, { count: referrersCount }] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'TAX_PREPARER'),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'AFFILIATE'),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'REFERRER'),
  ]);

  // Get commission totals
  let commissionsQuery = db.from('commissions').select('amount, status, paidAt');
  if (dateRange) {
    commissionsQuery = commissionsQuery
      .gte('createdAt', dateRange.start.toISOString())
      .lte('createdAt', dateRange.end.toISOString());
  }

  const { data: commissionsData } = await commissionsQuery;
  const commissions = (commissionsData || []) as CommissionRecord[];

  let totalCommissionsOwed = 0;
  let totalCommissionsPaid = 0;

  for (const c of commissions) {
    totalCommissionsOwed += Number(c.amount) || 0;
    if (c.status === 'COMPLETED') {
      totalCommissionsPaid += Number(c.amount) || 0;
    }
  }

  // Calculate previous period for comparison
  let totalClicksChange = 0;
  if (dateRange) {
    const periodLength = dateRange.end.getTime() - dateRange.start.getTime();
    const previousPeriodEnd = new Date(dateRange.start.getTime());
    const previousPeriodStart = new Date(dateRange.start.getTime() - periodLength);

    const { data: previousData } = await db
      .from('marketing_links')
      .select('clicks')
      .eq('isActive', true)
      .gte('createdAt', previousPeriodStart.toISOString())
      .lte('createdAt', previousPeriodEnd.toISOString());

    const previousClicks = ((previousData || []) as MarketingLinkRecord[]).reduce((sum, l) => sum + (l.clicks || 0), 0);

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
    totalCommissionsOwed,
    totalCommissionsPaid,
    activeUsers: {
      preparers: preparersCount || 0,
      affiliates: affiliatesCount || 0,
      referrers: referrersCount || 0,
    },
  };
}

/**
 * Get Top 15 Preparers
 */
export async function getTop15Preparers(dateRange?: DateRange): Promise<TopPerformer[]> {
  // Query materials created by preparers
  let query = db
    .from('marketing_links')
    .select('creatorId, clicks, intakeStarts, intakeCompletes, returnsFiled')
    .eq('creatorType', 'TAX_PREPARER')
    .eq('isActive', true);

  if (dateRange) {
    query = query
      .gte('createdAt', dateRange.start.toISOString())
      .lte('createdAt', dateRange.end.toISOString());
  }

  const { data: materialsData } = await query;
  const materials = (materialsData || []) as MarketingLinkRecord[];

  // Group by creatorId and aggregate
  const preparerStats = new Map<string, { clicks: number; intakeStarts: number; intakeCompletes: number; returnsFiled: number }>();

  for (const m of materials) {
    const stats = preparerStats.get(m.creatorId) || { clicks: 0, intakeStarts: 0, intakeCompletes: 0, returnsFiled: 0 };
    stats.clicks += m.clicks || 0;
    stats.intakeStarts += m.intakeStarts || 0;
    stats.intakeCompletes += m.intakeCompletes || 0;
    stats.returnsFiled += m.returnsFiled || 0;
    preparerStats.set(m.creatorId, stats);
  }

  // Sort by returnsFiled and take top 15
  const sortedPreparers = Array.from(preparerStats.entries())
    .sort((a, b) => b[1].returnsFiled - a[1].returnsFiled)
    .slice(0, 15);

  if (sortedPreparers.length === 0) {
    return [];
  }

  // Get preparer details
  const preparerIds = sortedPreparers.map(([id]) => id);
  const { data: profilesData } = await db
    .from('profiles')
    .select('id, userId, firstName, lastName, avatarUrl')
    .in('userId', preparerIds);

  const profiles = (profilesData || []) as ProfileRecord[];

  return sortedPreparers.map(([creatorId, stats], idx) => {
    const preparer = profiles.find((p) => p.userId === creatorId);
    const clicks = stats.clicks || 0;
    const returnsFiled = stats.returnsFiled || 0;

    return {
      rank: idx + 1,
      id: creatorId,
      name: preparer ? `${preparer.firstName} ${preparer.lastName}` : 'Unknown',
      avatarUrl: preparer?.avatarUrl || undefined,
      metrics: {
        clicks,
        intakeStarts: stats.intakeStarts || 0,
        intakeCompletes: stats.intakeCompletes || 0,
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
  let query = db
    .from('marketing_links')
    .select('creatorId, clicks, intakeStarts, intakeCompletes, returnsFiled')
    .eq('creatorType', 'AFFILIATE')
    .eq('isActive', true);

  if (dateRange) {
    query = query
      .gte('createdAt', dateRange.start.toISOString())
      .lte('createdAt', dateRange.end.toISOString());
  }

  const { data: materialsData } = await query;
  const materials = (materialsData || []) as MarketingLinkRecord[];

  // Group by creatorId
  const affiliateStats = new Map<string, { clicks: number; intakeStarts: number; intakeCompletes: number; returnsFiled: number }>();

  for (const m of materials) {
    const stats = affiliateStats.get(m.creatorId) || { clicks: 0, intakeStarts: 0, intakeCompletes: 0, returnsFiled: 0 };
    stats.clicks += m.clicks || 0;
    stats.intakeStarts += m.intakeStarts || 0;
    stats.intakeCompletes += m.intakeCompletes || 0;
    stats.returnsFiled += m.returnsFiled || 0;
    affiliateStats.set(m.creatorId, stats);
  }

  const sortedAffiliates = Array.from(affiliateStats.entries())
    .sort((a, b) => b[1].returnsFiled - a[1].returnsFiled)
    .slice(0, 15);

  if (sortedAffiliates.length === 0) {
    return [];
  }

  const affiliateIds = sortedAffiliates.map(([id]) => id);
  const { data: profilesData } = await db
    .from('profiles')
    .select('id, userId, firstName, lastName, avatarUrl')
    .in('userId', affiliateIds);

  const profiles = (profilesData || []) as ProfileRecord[];

  return sortedAffiliates.map(([creatorId, stats], idx) => {
    const affiliate = profiles.find((a) => a.userId === creatorId);
    const clicks = stats.clicks || 0;
    const returnsFiled = stats.returnsFiled || 0;

    return {
      rank: idx + 1,
      id: creatorId,
      name: affiliate ? `${affiliate.firstName} ${affiliate.lastName}` : 'Unknown',
      avatarUrl: affiliate?.avatarUrl || undefined,
      metrics: {
        clicks,
        intakeStarts: stats.intakeStarts || 0,
        intakeCompletes: stats.intakeCompletes || 0,
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
  let query = db
    .from('marketing_links')
    .select('creatorId, clicks, intakeStarts, intakeCompletes, returnsFiled')
    .eq('creatorType', 'REFERRER')
    .eq('isActive', true);

  if (dateRange) {
    query = query
      .gte('createdAt', dateRange.start.toISOString())
      .lte('createdAt', dateRange.end.toISOString());
  }

  const { data: materialsData } = await query;
  const materials = (materialsData || []) as MarketingLinkRecord[];

  // Group by creatorId
  const referrerStats = new Map<string, { clicks: number; intakeStarts: number; intakeCompletes: number; returnsFiled: number }>();

  for (const m of materials) {
    const stats = referrerStats.get(m.creatorId) || { clicks: 0, intakeStarts: 0, intakeCompletes: 0, returnsFiled: 0 };
    stats.clicks += m.clicks || 0;
    stats.intakeStarts += m.intakeStarts || 0;
    stats.intakeCompletes += m.intakeCompletes || 0;
    stats.returnsFiled += m.returnsFiled || 0;
    referrerStats.set(m.creatorId, stats);
  }

  const sortedReferrers = Array.from(referrerStats.entries())
    .sort((a, b) => b[1].returnsFiled - a[1].returnsFiled)
    .slice(0, 15);

  if (sortedReferrers.length === 0) {
    return [];
  }

  const referrerIds = sortedReferrers.map(([id]) => id);
  const { data: profilesData } = await db
    .from('profiles')
    .select('id, userId, firstName, lastName, avatarUrl')
    .in('userId', referrerIds);

  const profiles = (profilesData || []) as ProfileRecord[];

  return sortedReferrers.map(([creatorId, stats], idx) => {
    const referrer = profiles.find((r) => r.userId === creatorId);
    const clicks = stats.clicks || 0;
    const returnsFiled = stats.returnsFiled || 0;

    return {
      rank: idx + 1,
      id: creatorId,
      name: referrer ? `${referrer.firstName} ${referrer.lastName}` : 'Unknown',
      avatarUrl: referrer?.avatarUrl || undefined,
      metrics: {
        clicks,
        intakeStarts: stats.intakeStarts || 0,
        intakeCompletes: stats.intakeCompletes || 0,
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
  let query = db
    .from('marketing_links')
    .select('id, title, code, linkType, location, creatorId, clicks, intakeStarts, intakeCompletes, returnsFiled, filedConversionRate')
    .eq('isActive', true)
    .order('returnsFiled', { ascending: false })
    .limit(15);

  if (dateRange) {
    query = query
      .gte('createdAt', dateRange.start.toISOString())
      .lte('createdAt', dateRange.end.toISOString());
  }

  const { data: materialsData } = await query;
  const materials = (materialsData || []) as MarketingLinkRecord[];

  if (materials.length === 0) {
    return [];
  }

  // Get creator names
  const creatorIds = materials.map((m) => m.creatorId);
  const { data: creatorsData } = await db
    .from('profiles')
    .select('userId, firstName, lastName')
    .in('userId', creatorIds);

  const creators = (creatorsData || []) as ProfileRecord[];

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
  let query = db
    .from('link_clicks')
    .select('city, state, converted, signedUp')
    .not('city', 'is', null)
    .not('state', 'is', null);

  if (dateRange) {
    query = query
      .gte('clickedAt', dateRange.start.toISOString())
      .lte('clickedAt', dateRange.end.toISOString());
  }

  const { data: clicksData } = await query;
  const clicks = (clicksData || []) as LinkClickRecord[];

  // Group by city+state
  const locationStats = new Map<string, { city: string; state: string; totalClicks: number; conversions: number; signups: number }>();

  for (const click of clicks) {
    const key = `${click.city}|${click.state}`;
    const stats = locationStats.get(key) || { city: click.city || 'Unknown', state: click.state || '', totalClicks: 0, conversions: 0, signups: 0 };
    stats.totalClicks += 1;
    stats.conversions += click.converted || 0;
    stats.signups += click.signedUp || 0;
    locationStats.set(key, stats);
  }

  // Sort by totalClicks and take top 15
  const sorted = Array.from(locationStats.values())
    .sort((a, b) => b.totalClicks - a.totalClicks)
    .slice(0, 15);

  return sorted.map((loc, idx) => ({
    rank: idx + 1,
    city: loc.city,
    state: loc.state,
    totalClicks: loc.totalClicks,
    conversions: loc.conversions,
    signups: loc.signups,
    conversionRate: loc.totalClicks > 0 ? (loc.conversions / loc.totalClicks) * 100 : 0,
    badge: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : undefined,
  }));
}

/**
 * Get Top 15 Material Types by performance
 */
export async function getTop15MaterialTypes(dateRange?: DateRange): Promise<Array<{
  rank: number;
  type: string;
  materialCount: number;
  metrics: {
    clicks: number;
    intakeStarts: number;
    intakeCompletes: number;
    returnsFiled: number;
    conversionRate: number;
  };
  badge?: string;
}>> {
  let query = db
    .from('marketing_links')
    .select('linkType, clicks, intakeStarts, intakeCompletes, returnsFiled')
    .eq('isActive', true);

  if (dateRange) {
    query = query
      .gte('createdAt', dateRange.start.toISOString())
      .lte('createdAt', dateRange.end.toISOString());
  }

  const { data: linksData } = await query;
  const links = (linksData || []) as MarketingLinkRecord[];

  // Group by linkType
  const typeStats = new Map<string, { count: number; clicks: number; intakeStarts: number; intakeCompletes: number; returnsFiled: number }>();

  for (const link of links) {
    const stats = typeStats.get(link.linkType) || { count: 0, clicks: 0, intakeStarts: 0, intakeCompletes: 0, returnsFiled: 0 };
    stats.count += 1;
    stats.clicks += link.clicks || 0;
    stats.intakeStarts += link.intakeStarts || 0;
    stats.intakeCompletes += link.intakeCompletes || 0;
    stats.returnsFiled += link.returnsFiled || 0;
    typeStats.set(link.linkType, stats);
  }

  // Sort by returnsFiled
  const sorted = Array.from(typeStats.entries())
    .sort((a, b) => b[1].returnsFiled - a[1].returnsFiled)
    .slice(0, 15);

  return sorted.map(([type, stats], idx) => ({
    rank: idx + 1,
    type,
    materialCount: stats.count,
    metrics: {
      clicks: stats.clicks,
      intakeStarts: stats.intakeStarts,
      intakeCompletes: stats.intakeCompletes,
      returnsFiled: stats.returnsFiled,
      conversionRate: stats.clicks > 0 ? (stats.returnsFiled / stats.clicks) * 100 : 0,
    },
    badge: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : undefined,
  }));
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
  const { data: totalPaymentsData } = await db
    .from('payments')
    .select('amount')
    .eq('status', 'COMPLETED');

  const totalRevenue = ((totalPaymentsData || []) as PaymentRecord[]).reduce((sum, p) => sum + Number(p.amount), 0);

  // Revenue this month
  const { data: monthlyPaymentsData } = await db
    .from('payments')
    .select('amount')
    .eq('status', 'COMPLETED')
    .gte('createdAt', startOfMonth.toISOString());

  const monthlyRevenue = ((monthlyPaymentsData || []) as PaymentRecord[]).reduce((sum, p) => sum + Number(p.amount), 0);

  // All commissions
  const { data: allCommissionsData } = await db
    .from('commissions')
    .select('amount');

  const allCommissions = (allCommissionsData || []) as CommissionRecord[];
  const totalCommissions = allCommissions.reduce((sum, c) => sum + Number(c.amount), 0);
  const averageCommission = allCommissions.length > 0 ? totalCommissions / allCommissions.length : 0;

  // Monthly commissions
  const { data: monthlyCommissionsData } = await db
    .from('commissions')
    .select('amount')
    .gte('createdAt', startOfMonth.toISOString());

  const monthlyCommissions = ((monthlyCommissionsData || []) as CommissionRecord[]).reduce((sum, c) => sum + Number(c.amount), 0);

  // Total payouts completed
  const { data: totalPayoutsData } = await db
    .from('payout_requests')
    .select('amount')
    .eq('status', 'COMPLETED');

  const totalPayouts = ((totalPayoutsData || []) as PayoutRequestRecord[]).reduce((sum, p) => sum + Number(p.amount), 0);

  // Pending payouts
  const { data: pendingPayoutsData } = await db
    .from('payout_requests')
    .select('amount')
    .eq('status', 'PENDING');

  const pendingPayouts = ((pendingPayoutsData || []) as PayoutRequestRecord[]).reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    totalRevenue,
    monthlyRevenue,
    totalCommissions,
    monthlyCommissions,
    averageCommission,
    totalPayouts,
    pendingPayouts,
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
  // Get all commissions
  const { data: commissionsData } = await db
    .from('commissions')
    .select('referrerId, amount');

  const commissions = (commissionsData || []) as CommissionRecord[];

  // Group by referrerId
  const earnerStats = new Map<string, { totalAmount: number; count: number }>();

  for (const c of commissions) {
    const stats = earnerStats.get(c.referrerId) || { totalAmount: 0, count: 0 };
    stats.totalAmount += Number(c.amount) || 0;
    stats.count += 1;
    earnerStats.set(c.referrerId, stats);
  }

  // Sort by earnings and take top limit
  const sortedEarners = Array.from(earnerStats.entries())
    .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
    .slice(0, limit);

  if (sortedEarners.length === 0) {
    return [];
  }

  // Get user details
  const userIds = sortedEarners.map(([id]) => id);
  const { data: usersData } = await db
    .from('profiles')
    .select('userId, firstName, lastName, role')
    .in('userId', userIds);

  const users = (usersData || []) as ProfileRecord[];

  // Build result
  const result: TopEarner[] = [];

  for (const [referrerId, stats] of sortedEarners) {
    const user = users.find((u) => u.userId === referrerId);
    if (!user) continue;

    // Count completed referrals
    const { count: conversions } = await db
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrerId', referrerId)
      .eq('status', 'COMPLETED');

    result.push({
      id: referrerId,
      name: `${user.firstName} ${user.lastName}`,
      role: (user.role || '').toLowerCase().replace('_', ' '),
      earnings: stats.totalAmount,
      returns: conversions || 0,
      referrals: stats.count,
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
  const { data: payoutsData } = await db
    .from('payout_requests')
    .select('id, profileId, amount, status, createdAt')
    .order('createdAt', { ascending: false })
    .limit(limit);

  const payouts = (payoutsData || []) as PayoutRequestRecord[];

  if (payouts.length === 0) {
    return [];
  }

  // Get profile details
  const profileIds = payouts.map((p) => p.profileId);
  const { data: profilesData } = await db
    .from('profiles')
    .select('id, firstName, lastName, role')
    .in('id', profileIds);

  const profiles = (profilesData || []) as ProfileRecord[];

  return payouts.map((payout) => {
    const profile = profiles.find((p) => p.id === payout.profileId);

    return {
      id: payout.id,
      name: profile ? `${profile.firstName} ${profile.lastName}` : 'Unknown',
      role: (profile?.role || '').toLowerCase().replace('_', ' '),
      amount: Number(payout.amount),
      date: payout.createdAt,
      status: payout.status.toLowerCase(),
    };
  });
}
