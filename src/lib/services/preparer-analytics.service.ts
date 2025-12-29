/**
 * Preparer Analytics Service
 *
 * Individual preparer performance metrics and dashboard data
 * Used by tax preparer dashboards and admin oversight
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
interface ProfileRecord {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  userId?: string | null;
  role?: string | null;
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
  contactRequested?: boolean;
}

interface TaxIntakeLeadRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  assignedPreparerId?: string | null;
  contactRequested?: boolean;
  lastContactedAt?: Date | string | null;
  contactMethod?: string | null;
  created_at: Date | string;
  completed?: boolean;
  attributionMethod?: string | null;
}

interface MarketingLinkRecord {
  id: string;
  code: string;
  title?: string | null;
  url: string;
  creatorId?: string | null;
  creatorType?: string | null;
  isActive: boolean;
  clicks: number;
  conversions: number;
  conversionRate?: number | null;
  intakeStarts?: number;
  intakeCompletes?: number;
  updatedAt?: Date | string;
}

interface LinkClickRecord {
  id: string;
  linkId: string;
  clickedAt: Date | string;
  converted?: boolean;
  signedUp?: boolean;
  userEmail?: string | null;
  userPhone?: string | null;
}

interface AppointmentRecord {
  id: string;
  preparerId: string;
  clientName: string;
  status: string;
  scheduledFor?: Date | string | null;
  requestedAt: Date | string;
}

interface PaymentRecord {
  id: string;
  profileId?: string | null;
  amount: number;
  status: string;
  type?: string | null;
  createdAt: Date | string;
}

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
    const { count: totalIntakeForms } = await db
      .from('client_intakes')
      .select('id', { count: 'exact', head: true })
      .eq('assignedPreparerId', preparerId);

    // Count referrals - get client IDs for this preparer, then count referrals for those clients
    const { data: preparerClientsData } = await db
      .from('preparer_clients')
      .select('clientId')
      .eq('preparerId', preparerId);
    const clientIds = (preparerClientsData || []).map((pc: { clientId: string }) => pc.clientId);

    let totalReferrals = 0;
    if (clientIds.length > 0) {
      const { count } = await db
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .in('clientId', clientIds);
      totalReferrals = count || 0;
    }

    // Get profile IDs for this preparer's clients for tax returns queries
    let profileIds: string[] = [];
    if (clientIds.length > 0) {
      const { data: profilesData } = await db
        .from('profiles')
        .select('id')
        .in('id', clientIds);
      profileIds = (profilesData || []).map((p: { id: string }) => p.id);
    }

    // Count returns in progress
    let returnsInProgress = 0;
    if (profileIds.length > 0) {
      const { count } = await db
        .from('tax_returns')
        .select('id', { count: 'exact', head: true })
        .in('profileId', profileIds)
        .in('status', ['DRAFT', 'IN_REVIEW']);
      returnsInProgress = count || 0;
    }

    // Count returns completed
    let returnsCompleted = 0;
    if (profileIds.length > 0) {
      const { count } = await db
        .from('tax_returns')
        .select('id', { count: 'exact', head: true })
        .in('profileId', profileIds)
        .in('status', ['FILED', 'ACCEPTED']);
      returnsCompleted = count || 0;
    }

    // Calculate earnings this month (if preparers earn commissions)
    const { data: earningsThisMonthData } = await db
      .from('payments')
      .select('amount')
      .eq('profileId', preparerId)
      .eq('status', 'COMPLETED')
      .gte('createdAt', startOfMonth.toISOString());

    const earningsThisMonthTotal = ((earningsThisMonthData || []) as PaymentRecord[])
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // Total earnings
    const { data: totalEarningsData } = await db
      .from('payments')
      .select('amount')
      .eq('profileId', preparerId)
      .eq('status', 'COMPLETED');

    const totalEarningsSum = ((totalEarningsData || []) as PaymentRecord[])
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // Calculate average response time
    const avgResponseTime = await calculateAverageResponseTime(preparerId);

    // Count missed follow-ups
    const missedFollowUps = await getMissedFollowUpsCount(preparerId);

    return {
      totalIntakesForms: totalIntakeForms || 0,
      totalReferrals,
      returnsInProgress,
      returnsCompleted,
      earningsThisMonth: earningsThisMonthTotal,
      totalEarnings: totalEarningsSum,
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
    const { data: leadsData } = await db
      .from('leads')
      .select('createdAt, lastContactedAt')
      .eq('assignedPreparerId', preparerId)
      .not('lastContactedAt', 'is', null);

    const leads = (leadsData || []) as Array<{ createdAt: string | Date; lastContactedAt: string | Date | null }>;

    if (leads.length === 0) return 0;

    // Calculate average time difference
    const totalHours = leads.reduce((sum, lead) => {
      if (!lead.lastContactedAt) return sum;
      const createdAt = new Date(lead.createdAt);
      const contactedAt = new Date(lead.lastContactedAt);
      const diff = contactedAt.getTime() - createdAt.getTime();
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
    // Count leads that requested contact but haven't been contacted
    const { count: missedLeads } = await db
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('assignedPreparerId', preparerId)
      .eq('contactRequested', true)
      .is('lastContactedAt', null);

    // Count tax intakes that requested contact but haven't been contacted
    const { count: missedIntakes } = await db
      .from('tax_intake_leads')
      .select('id', { count: 'exact', head: true })
      .eq('assignedPreparerId', preparerId)
      .eq('contactRequested', true)
      .is('lastContactedAt', null);

    return (missedLeads || 0) + (missedIntakes || 0);
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
    const { data: leadsData } = await db
      .from('leads')
      .select('*')
      .eq('assignedPreparerId', preparerId)
      .eq('contactRequested', true)
      .is('lastContactedAt', null)
      .order('createdAt', { ascending: true });

    const leads = (leadsData || []) as LeadRecord[];

    leads.forEach((lead) => {
      const createdAt = new Date(lead.createdAt);
      const daysWaiting = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      results.push({
        id: lead.id,
        clientId: lead.id,
        clientName: `${lead.firstName} ${lead.lastName}`,
        clientEmail: lead.email,
        clientPhone: lead.phone,
        contactMethod: lead.contactMethod || 'UNKNOWN',
        daysWaiting,
        requestedAt: createdAt,
        source: 'Lead',
      });
    });

    // Get tax intakes that need follow-up
    const { data: intakesData } = await db
      .from('tax_intake_leads')
      .select('*')
      .eq('assignedPreparerId', preparerId)
      .eq('contactRequested', true)
      .is('lastContactedAt', null)
      .order('created_at', { ascending: true });

    const intakes = (intakesData || []) as TaxIntakeLeadRecord[];

    intakes.forEach((intake) => {
      const createdAt = new Date(intake.created_at);
      const daysWaiting = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      results.push({
        id: intake.id,
        clientId: intake.id,
        clientName: `${intake.first_name} ${intake.last_name}`,
        clientEmail: intake.email,
        clientPhone: intake.phone,
        contactMethod: intake.contactMethod || 'UNKNOWN',
        daysWaiting,
        requestedAt: createdAt,
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
    // Get client IDs for this preparer
    const { data: preparerClientsData } = await db
      .from('preparer_clients')
      .select('clientId')
      .eq('preparerId', preparerId);
    const clientIds = (preparerClientsData || []).map((pc: { clientId: string }) => pc.clientId);

    if (clientIds.length === 0) return [];

    // Get referrals for those clients
    const { data: referralsData } = await db
      .from('referrals')
      .select('referrerId, status')
      .in('clientId', clientIds);

    const allReferrals = (referralsData || []) as Array<{ referrerId: string; status: string }>;

    // Group by referrerId in JS
    const referrerCountMap = new Map<string, { total: number; completed: number }>();
    allReferrals.forEach((r) => {
      const current = referrerCountMap.get(r.referrerId) || { total: 0, completed: 0 };
      current.total++;
      if (r.status === 'COMPLETED') current.completed++;
      referrerCountMap.set(r.referrerId, current);
    });

    const referrerIds = Array.from(referrerCountMap.keys());
    if (referrerIds.length === 0) return [];

    // Get referrer profiles
    const { data: referrersData } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .in('id', referrerIds);

    const referrers = (referrersData || []) as ProfileRecord[];

    const topReferrers: TopReferrer[] = referrers.map((referrer) => {
      const counts = referrerCountMap.get(referrer.id) || { total: 0, completed: 0 };
      const conversionRate =
        counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;

      return {
        id: referrer.id,
        name: `${referrer.firstName || ''} ${referrer.lastName || ''}`.trim() || 'Unknown',
        referralCount: counts.total,
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
    const { data: linksData } = await db
      .from('marketing_links')
      .select('id, code, title, clicks, conversions, conversionRate')
      .eq('creatorId', preparerId)
      .eq('isActive', true)
      .order('conversions', { ascending: false })
      .limit(limit);

    const links = (linksData || []) as MarketingLinkRecord[];

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
    // Get all tax preparers
    const { data: preparersData } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .eq('role', 'tax_preparer');

    const preparers = (preparersData || []) as ProfileRecord[];
    const preparerIds = preparers.map(p => p.id);

    if (preparerIds.length === 0) return [];

    // Get all preparer_clients for these preparers
    const { data: preparerClientsData } = await db
      .from('preparer_clients')
      .select('preparerId, clientId')
      .in('preparerId', preparerIds);

    const allPreparerClients = (preparerClientsData || []) as Array<{ preparerId: string; clientId: string }>;

    // Get unique client IDs
    const allClientIds = [...new Set(allPreparerClients.map(pc => pc.clientId))];

    // Get tax returns for all clients
    let taxReturnsMap = new Map<string, Array<{ status: string }>>();
    if (allClientIds.length > 0) {
      const { data: taxReturnsData } = await db
        .from('tax_returns')
        .select('profileId, status')
        .in('profileId', allClientIds);

      const taxReturns = (taxReturnsData || []) as Array<{ profileId: string; status: string }>;
      taxReturns.forEach(tr => {
        const existing = taxReturnsMap.get(tr.profileId) || [];
        existing.push({ status: tr.status });
        taxReturnsMap.set(tr.profileId, existing);
      });
    }

    // Get completed payments for all clients
    let paymentsMap = new Map<string, number>();
    if (allClientIds.length > 0) {
      const { data: paymentsData } = await db
        .from('payments')
        .select('profileId, amount')
        .in('profileId', allClientIds)
        .eq('status', 'COMPLETED');

      const payments = (paymentsData || []) as Array<{ profileId: string; amount: number }>;
      payments.forEach(p => {
        const existing = paymentsMap.get(p.profileId) || 0;
        paymentsMap.set(p.profileId, existing + Number(p.amount || 0));
      });
    }

    // Build preparer stats
    const preparerStats = preparers.map((preparer) => {
      const clientRelations = allPreparerClients.filter(pc => pc.preparerId === preparer.id);
      const totalClients = clientRelations.length;

      let totalReturns = 0;
      let totalRevenue = 0;

      clientRelations.forEach((pc) => {
        const clientReturns = taxReturnsMap.get(pc.clientId) || [];
        const filedReturns = clientReturns.filter(
          (tr) => tr.status === 'FILED' || tr.status === 'ACCEPTED'
        );
        totalReturns += filedReturns.length;

        totalRevenue += paymentsMap.get(pc.clientId) || 0;
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
    const { count: allPreparers } = await db
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'tax_preparer');

    const { count: totalIntakes } = await db
      .from('client_intakes')
      .select('id', { count: 'exact', head: true });

    const { count: totalReturns } = await db
      .from('tax_returns')
      .select('id', { count: 'exact', head: true })
      .in('status', ['FILED', 'ACCEPTED']);

    const preparerCount = allPreparers || 0;
    const avgIntakesPerPreparer = preparerCount > 0 ? Math.round((totalIntakes || 0) / preparerCount) : 0;
    const avgReturnsPerPreparer = preparerCount > 0 ? Math.round((totalReturns || 0) / preparerCount) : 0;

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
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    // Get preparer's marketing links
    const { data: preparerLinksData } = await db
      .from('marketing_links')
      .select('id')
      .eq('creatorId', preparerId);
    const linkIds = (preparerLinksData || []).map((l: { id: string }) => l.id);

    // Today's appointments - fetch all and group in JS
    const { data: todayAppointmentsData } = await db
      .from('appointments')
      .select('id, status')
      .eq('preparerId', preparerId)
      .gte('scheduledFor', startOfToday.toISOString())
      .lt('scheduledFor', endOfToday.toISOString());

    const todayAppointmentsList = (todayAppointmentsData || []) as Array<{ id: string; status: string }>;

    const appointments: TodayScheduleData = {
      scheduled: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
    };

    todayAppointmentsList.forEach(apt => {
      if (apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED') {
        appointments.scheduled++;
      } else if (apt.status === 'PENDING_APPROVAL' || apt.status === 'REQUESTED') {
        appointments.pending++;
      } else if (apt.status === 'COMPLETED') {
        appointments.completed++;
      } else if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') {
        appointments.cancelled++;
      }
    });

    // Link clicks today vs yesterday
    let clicksToday = 0;
    let clicksYesterday = 0;
    if (linkIds.length > 0) {
      const { count: todayCount } = await db
        .from('link_clicks')
        .select('id', { count: 'exact', head: true })
        .in('linkId', linkIds)
        .gte('clickedAt', startOfToday.toISOString());
      clicksToday = todayCount || 0;

      const { count: yesterdayCount } = await db
        .from('link_clicks')
        .select('id', { count: 'exact', head: true })
        .in('linkId', linkIds)
        .gte('clickedAt', startOfYesterday.toISOString())
        .lt('clickedAt', startOfToday.toISOString());
      clicksYesterday = yesterdayCount || 0;
    }

    // Intake forms today vs yesterday
    const { count: intakesTodayCount } = await db
      .from('tax_intake_leads')
      .select('id', { count: 'exact', head: true })
      .eq('assignedPreparerId', preparerId)
      .gte('created_at', startOfToday.toISOString());
    const intakesToday = intakesTodayCount || 0;

    const { count: intakesYesterdayCount } = await db
      .from('tax_intake_leads')
      .select('id', { count: 'exact', head: true })
      .eq('assignedPreparerId', preparerId)
      .gte('created_at', startOfYesterday.toISOString())
      .lt('created_at', startOfToday.toISOString());
    const intakesYesterday = intakesYesterdayCount || 0;

    // Appointments booked today vs yesterday
    const { count: bookedTodayCount } = await db
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('preparerId', preparerId)
      .gte('requestedAt', startOfToday.toISOString());
    const bookedToday = bookedTodayCount || 0;

    const { count: bookedYesterdayCount } = await db
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('preparerId', preparerId)
      .gte('requestedAt', startOfYesterday.toISOString())
      .lt('requestedAt', startOfToday.toISOString());
    const bookedYesterday = bookedYesterdayCount || 0;

    // Earnings today vs yesterday
    const { data: earningsTodayData } = await db
      .from('payments')
      .select('amount')
      .eq('profileId', preparerId)
      .eq('status', 'COMPLETED')
      .gte('createdAt', startOfToday.toISOString());
    const earningsTodaySum = ((earningsTodayData || []) as PaymentRecord[])
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const { data: earningsYesterdayData } = await db
      .from('payments')
      .select('amount')
      .eq('profileId', preparerId)
      .eq('status', 'COMPLETED')
      .gte('createdAt', startOfYesterday.toISOString())
      .lt('createdAt', startOfToday.toISOString());
    const earningsYesterdaySum = ((earningsYesterdayData || []) as PaymentRecord[])
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return {
      appointments,
      linkClicks: calculateTrend(clicksToday, clicksYesterday),
      intakeForms: calculateTrend(intakesToday, intakesYesterday),
      appointmentsBooked: calculateTrend(bookedToday, bookedYesterday),
      earnings: calculateTrend(earningsTodaySum, earningsYesterdaySum),
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
    const { data: preparerLinksData } = await db
      .from('marketing_links')
      .select('id, clicks, intakeStarts, intakeCompletes')
      .eq('creatorId', preparerId);
    const linkIds = (preparerLinksData || []).map((l: { id: string }) => l.id);

    // Link clicks in period
    let linkClicks = 0;
    if (linkIds.length > 0) {
      const { count } = await db
        .from('link_clicks')
        .select('id', { count: 'exact', head: true })
        .in('linkId', linkIds)
        .gte('clickedAt', startDate.toISOString());
      linkClicks = count || 0;
    }

    // Intakes started (has referrer matching preparer)
    const { count: intakesStartedCount } = await db
      .from('tax_intake_leads')
      .select('id', { count: 'exact', head: true })
      .eq('assignedPreparerId', preparerId)
      .gte('created_at', startDate.toISOString());
    const intakesStarted = intakesStartedCount || 0;

    // Intakes completed
    const { count: intakesCompletedCount } = await db
      .from('tax_intake_leads')
      .select('id', { count: 'exact', head: true })
      .eq('assignedPreparerId', preparerId)
      .eq('completed', true)
      .gte('created_at', startDate.toISOString());
    const intakesCompleted = intakesCompletedCount || 0;

    // Appointments booked
    const { count: appointmentsBookedCount } = await db
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('preparerId', preparerId)
      .gte('requestedAt', startDate.toISOString())
      .in('status', ['SCHEDULED', 'CONFIRMED', 'COMPLETED']);
    const appointmentsBooked = appointmentsBookedCount || 0;

    // Returns filed - need to get client IDs for this preparer first
    let returnsFiled = 0;
    const { data: preparerClientsData } = await db
      .from('preparer_clients')
      .select('clientId')
      .eq('preparerId', preparerId);
    const clientIds = (preparerClientsData || []).map((pc: { clientId: string }) => pc.clientId);

    if (clientIds.length > 0) {
      const { count } = await db
        .from('tax_returns')
        .select('id', { count: 'exact', head: true })
        .in('profileId', clientIds)
        .in('status', ['FILED', 'ACCEPTED'])
        .gte('createdAt', startDate.toISOString());
      returnsFiled = count || 0;
    }

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

    // Build query for intakes
    let query = db
      .from('tax_intake_leads')
      .select('attributionMethod')
      .eq('assignedPreparerId', preparerId);

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data: intakesData } = await query;
    const allIntakes = (intakesData || []) as Array<{ attributionMethod: string | null }>;

    // Group by attribution method in JS
    const intakesGrouped = new Map<string, number>();
    allIntakes.forEach((intake) => {
      const method = intake.attributionMethod || 'unknown';
      intakesGrouped.set(method, (intakesGrouped.get(method) || 0) + 1);
    });

    const intakes = Array.from(intakesGrouped.entries()).map(([attributionMethod, count]) => ({
      attributionMethod,
      _count: count,
    }));

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

    // Build query for payments
    let query = db
      .from('payments')
      .select('type, amount')
      .eq('profileId', preparerId)
      .eq('status', 'COMPLETED');

    if (startDate) {
      query = query.gte('createdAt', startDate.toISOString());
    }

    const { data: paymentsData } = await query;
    const allPayments = (paymentsData || []) as Array<{ type: string | null; amount: number }>;

    // Group by type and sum amounts in JS
    const paymentsGrouped = new Map<string, number>();
    allPayments.forEach((payment) => {
      const type = payment.type || 'OTHER';
      const current = paymentsGrouped.get(type) || 0;
      paymentsGrouped.set(type, current + Number(payment.amount || 0));
    });

    const payments = Array.from(paymentsGrouped.entries()).map(([type, sumAmount]) => ({
      type,
      _sum: { amount: sumAmount },
    }));

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
    const { data: preparerLinksData } = await db
      .from('marketing_links')
      .select('id, code, title')
      .eq('creatorId', preparerId);

    const preparerLinks = (preparerLinksData || []) as Array<{ id: string; code: string; title: string | null }>;
    const linkIds = preparerLinks.map(l => l.id);
    const linkMap = new Map(preparerLinks.map(l => [l.id, { code: l.code, title: l.title }]));

    if (linkIds.length === 0) return [];

    // Get recent clicks that haven't converted
    // Note: We need OR condition for userEmail or userPhone not null
    // In Supabase, we'll fetch all and filter in JS for the OR condition
    const { data: clicksData } = await db
      .from('link_clicks')
      .select('id, linkId, clickedAt, converted, userEmail, userPhone')
      .in('linkId', linkIds)
      .gte('clickedAt', twentyFourHoursAgo.toISOString())
      .eq('converted', false)
      .order('clickedAt', { ascending: false })
      .limit(limit * 2); // Fetch more to account for filtering

    const allClicks = (clicksData || []) as LinkClickRecord[];

    // Filter for clicks with identifying info
    const recentClicks = allClicks
      .filter(click => click.userEmail || click.userPhone)
      .slice(0, limit);

    const now = new Date();
    return recentClicks.map(click => {
      const linkInfo = linkMap.get(click.linkId);
      const clickedAt = new Date(click.clickedAt);
      const hoursAgo = Math.floor((now.getTime() - clickedAt.getTime()) / (1000 * 60 * 60));
      return {
        id: click.id,
        name: click.userEmail?.split('@')[0] || 'Unknown',
        email: click.userEmail || '',
        phone: click.userPhone || '',
        clickedAt,
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
    const { data: preparerLinksData } = await db
      .from('marketing_links')
      .select('id, code, title')
      .eq('creatorId', preparerId);

    const preparerLinks = (preparerLinksData || []) as Array<{ id: string; code: string; title: string | null }>;
    const linkIds = preparerLinks.map(l => l.id);
    const linkMap = new Map(preparerLinks.map(l => [l.id, { code: l.code, title: l.title }]));

    // Recent link clicks
    if (linkIds.length > 0) {
      const { data: recentClicksData } = await db
        .from('link_clicks')
        .select('id, linkId, clickedAt')
        .in('linkId', linkIds)
        .order('clickedAt', { ascending: false })
        .limit(5);

      const recentClicks = (recentClicksData || []) as Array<{ id: string; linkId: string; clickedAt: string }>;

      recentClicks.forEach(click => {
        const linkInfo = linkMap.get(click.linkId);
        const clickedAt = new Date(click.clickedAt);
        activities.push({
          id: `click-${click.id}`,
          type: 'link_click',
          description: `Someone clicked ${linkInfo?.code || 'your link'}`,
          timestamp: clickedAt,
          timeAgo: formatTimeAgo(clickedAt),
          metadata: { linkCode: linkInfo?.code },
        });
      });
    }

    // Recent intake submissions
    const { data: recentIntakesData } = await db
      .from('tax_intake_leads')
      .select('id, first_name, last_name, completed, created_at')
      .eq('assignedPreparerId', preparerId)
      .order('created_at', { ascending: false })
      .limit(5);

    const recentIntakes = (recentIntakesData || []) as TaxIntakeLeadRecord[];

    recentIntakes.forEach(intake => {
      const createdAt = new Date(intake.created_at);
      activities.push({
        id: `intake-${intake.id}`,
        type: intake.completed ? 'intake_submitted' : 'intake_started',
        description: `${intake.first_name} ${intake.last_name} ${intake.completed ? 'submitted intake form' : 'started intake form'}`,
        timestamp: createdAt,
        timeAgo: formatTimeAgo(createdAt),
        metadata: { clientName: `${intake.first_name} ${intake.last_name}` },
      });
    });

    // Recent appointments
    const { data: recentAppointmentsData } = await db
      .from('appointments')
      .select('id, clientName, scheduledFor, requestedAt, status')
      .eq('preparerId', preparerId)
      .in('status', ['SCHEDULED', 'CONFIRMED'])
      .order('requestedAt', { ascending: false })
      .limit(5);

    const recentAppointments = (recentAppointmentsData || []) as AppointmentRecord[];

    recentAppointments.forEach(apt => {
      const scheduledFor = apt.scheduledFor ? new Date(apt.scheduledFor) : null;
      const scheduledTime = scheduledFor
        ? scheduledFor.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : 'TBD';
      const requestedAt = new Date(apt.requestedAt);
      activities.push({
        id: `apt-${apt.id}`,
        type: 'appointment_booked',
        description: `${apt.clientName} booked appointment`,
        timestamp: requestedAt,
        timeAgo: formatTimeAgo(requestedAt),
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

    // Get preparer's active links
    const { data: linksData } = await db
      .from('marketing_links')
      .select('id, code, title')
      .eq('creatorId', preparerId)
      .eq('isActive', true);

    const links = (linksData || []) as MarketingLinkRecord[];
    if (links.length === 0) return [];

    const linkIds = links.map(l => l.id);

    // Get all today's clicks for these links in one query
    const { data: clicksData } = await db
      .from('link_clicks')
      .select('linkId, converted')
      .in('linkId', linkIds)
      .gte('clickedAt', startOfToday.toISOString());

    const clicks = (clicksData || []) as Array<{ linkId: string; converted: boolean }>;

    // Group clicks by link in JS
    const clicksByLink = new Map<string, { clicks: number; conversions: number }>();
    clicks.forEach(click => {
      const current = clicksByLink.get(click.linkId) || { clicks: 0, conversions: 0 };
      current.clicks++;
      if (click.converted) current.conversions++;
      clicksByLink.set(click.linkId, current);
    });

    // Build performance data
    const linkPerformance: PreparerLinkPerformance[] = links.map(link => {
      const stats = clicksByLink.get(link.id) || { clicks: 0, conversions: 0 };
      return {
        linkId: link.id,
        title: link.title || link.code,
        clicks: stats.clicks,
        conversions: stats.conversions,
        conversionRate: stats.clicks > 0
          ? Math.round((stats.conversions / stats.clicks) * 100)
          : 0,
      };
    });

    // Sort by clicks descending
    linkPerformance.sort((a, b) => b.clicks - a.clicks);
    return linkPerformance.slice(0, limit);
  } catch (error) {
    logger.error('Error fetching top links today:', error);
    return [];
  }
}
