/**
 * Commission Service
 *
 * Handles commission calculations, earnings tracking, and payout management
 * for affiliates, referrers, and bonded tax preparers
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
type CommissionType = 'PERCENTAGE' | 'FLAT' | 'TIERED';
type PaymentStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED';

interface LeadRecord {
  id: string;
  status: string;
  referrerUsername?: string | null;
  referrerType?: string | null;
  commissionRate?: number | null;
  commissionRateLockedAt?: string | null;
  updatedAt: string;
}

interface CommissionDbRecord {
  id: string;
  leadId?: string | null;
  referrerId?: string | null;
  referrerUsername?: string | null;
  referrerType?: string | null;
  amount: number;
  status: PaymentStatus;
  leadStatus?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  grossAmount?: number | null;
  commissionType?: CommissionType | null;
  commissionRate?: number | null;
  rateAtCreation?: number | null;
  rateSource?: string | null;
  groupIdAtCreation?: string | null;
  calculatedAmount?: number | null;
  pendingAt?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  approvalNotes?: string | null;
  paidAt?: string | null;
  payoutRequestId?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface ProfileRecord {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  affiliateGroupId?: string | null;
}

/**
 * Commission status types
 */
export type CommissionStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';

/**
 * Payout status types
 */
export type PayoutStatus = 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';

/**
 * Commission record interface
 */
export interface CommissionRecord {
  id: string;
  leadId: string;
  referrerUsername: string;
  referrerType: 'AFFILIATE' | 'REFERRER' | 'TAX_PREPARER';
  amount: number;
  status: CommissionStatus;
  leadStatus: string;
  createdAt: Date;
  approvedAt?: Date | null;
  paidAt?: Date | null;
  notes?: string | null;
}

/**
 * Earnings summary interface
 */
export interface EarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  approvedEarnings: number;
  paidEarnings: number;
  totalLeads: number;
  convertedLeads: number;
  averageCommission: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
}

/**
 * Calculate commission when a lead reaches CONVERTED status
 */
export async function calculateCommission(leadId: string): Promise<CommissionRecord | null> {
  try {
    const { data: leadData } = await db
      .from('leads')
      .select('id, status, referrerUsername, referrerType, commissionRate, commissionRateLockedAt')
      .eq('id', leadId)
      .limit(1);

    const lead = firstOrNull(leadData) as LeadRecord | null;

    if (!lead) {
      logger.error('Lead not found for commission calculation', { leadId });
      return null;
    }

    if (lead.status !== 'CONVERTED') {
      logger.warn('Attempted to calculate commission for non-converted lead', {
        leadId,
        status: lead.status,
      });
      return null;
    }

    if (!lead.referrerUsername || !lead.commissionRate) {
      logger.warn('Lead missing referrer or commission rate', {
        leadId,
        referrerUsername: lead.referrerUsername,
        commissionRate: lead.commissionRate,
      });
      return null;
    }

    // Check if commission already exists
    const { data: existingData } = await db
      .from('commissions')
      .select('*')
      .eq('leadId', leadId)
      .limit(1);

    const existingCommission = firstOrNull(existingData) as CommissionDbRecord | null;

    if (existingCommission) {
      logger.info('Commission already exists for lead', {
        leadId,
        commissionId: existingCommission.id,
      });
      return {
        id: existingCommission.id,
        leadId: existingCommission.leadId || '',
        referrerUsername: existingCommission.referrerUsername || '',
        referrerType: (existingCommission.referrerType || 'REFERRER') as 'AFFILIATE' | 'REFERRER' | 'TAX_PREPARER',
        amount: Number(existingCommission.amount),
        status: existingCommission.status as CommissionStatus,
        leadStatus: existingCommission.leadStatus || '',
        createdAt: new Date(existingCommission.createdAt),
        approvedAt: existingCommission.approvedAt ? new Date(existingCommission.approvedAt) : null,
        paidAt: existingCommission.paidAt ? new Date(existingCommission.paidAt) : null,
        notes: existingCommission.notes,
      };
    }

    // Create commission record
    const { data: commissionData, error } = await db
      .from('commissions')
      .insert({
        leadId: lead.id,
        referrerUsername: lead.referrerUsername,
        referrerType: lead.referrerType || 'REFERRER',
        amount: lead.commissionRate,
        status: 'PENDING',
        leadStatus: lead.status,
        notes: `Commission locked at ${lead.commissionRate} on ${lead.commissionRateLockedAt}`,
      })
      .select()
      .single();

    if (error) throw error;
    const commission = commissionData as CommissionDbRecord;

    logger.info('Commission calculated and created', {
      leadId,
      commissionId: commission.id,
      amount: commission.amount,
      referrerUsername: commission.referrerUsername,
    });

    return {
      id: commission.id,
      leadId: commission.leadId || '',
      referrerUsername: commission.referrerUsername || '',
      referrerType: (commission.referrerType || 'REFERRER') as 'AFFILIATE' | 'REFERRER' | 'TAX_PREPARER',
      amount: Number(commission.amount),
      status: commission.status as CommissionStatus,
      leadStatus: commission.leadStatus || '',
      createdAt: new Date(commission.createdAt),
      approvedAt: commission.approvedAt ? new Date(commission.approvedAt) : null,
      paidAt: commission.paidAt ? new Date(commission.paidAt) : null,
      notes: commission.notes,
    };
  } catch (error) {
    logger.error('Error calculating commission', { leadId, error });
    return null;
  }
}

/**
 * Update commission status when lead status changes
 */
export async function updateCommissionStatus(
  leadId: string,
  newLeadStatus: string
): Promise<CommissionRecord | null> {
  try {
    const { data: commissionData } = await db
      .from('commissions')
      .select('*')
      .eq('leadId', leadId)
      .limit(1);

    const commission = firstOrNull(commissionData) as CommissionDbRecord | null;

    if (!commission) {
      if (newLeadStatus === 'CONVERTED') {
        return await calculateCommission(leadId);
      }
      return null;
    }

    // If lead reverted from CONVERTED, cancel commission
    if (newLeadStatus !== 'CONVERTED' && commission.status === 'PENDING') {
      const { data: updated, error } = await db
        .from('commissions')
        .update({
          status: 'CANCELLED',
          leadStatus: newLeadStatus,
          notes: `Commission cancelled due to lead status change to ${newLeadStatus}`,
        })
        .eq('id', commission.id)
        .select()
        .single();

      if (error) throw error;

      logger.info('Commission cancelled due to lead status change', {
        commissionId: commission.id,
        leadId,
        newStatus: newLeadStatus,
      });

      const result = updated as CommissionDbRecord;
      return {
        id: result.id,
        leadId: result.leadId || '',
        referrerUsername: result.referrerUsername || '',
        referrerType: (result.referrerType || 'REFERRER') as 'AFFILIATE' | 'REFERRER' | 'TAX_PREPARER',
        amount: Number(result.amount),
        status: result.status as CommissionStatus,
        leadStatus: result.leadStatus || '',
        createdAt: new Date(result.createdAt),
        approvedAt: result.approvedAt ? new Date(result.approvedAt) : null,
        paidAt: result.paidAt ? new Date(result.paidAt) : null,
        notes: result.notes,
      };
    }

    // Update lead status in commission record
    const { data: updated } = await db
      .from('commissions')
      .update({ leadStatus: newLeadStatus })
      .eq('id', commission.id)
      .select()
      .single();

    const result = updated as CommissionDbRecord;
    return {
      id: result.id,
      leadId: result.leadId || '',
      referrerUsername: result.referrerUsername || '',
      referrerType: (result.referrerType || 'REFERRER') as 'AFFILIATE' | 'REFERRER' | 'TAX_PREPARER',
      amount: Number(result.amount),
      status: result.status as CommissionStatus,
      leadStatus: result.leadStatus || '',
      createdAt: new Date(result.createdAt),
      approvedAt: result.approvedAt ? new Date(result.approvedAt) : null,
      paidAt: result.paidAt ? new Date(result.paidAt) : null,
      notes: result.notes,
    };
  } catch (error) {
    logger.error('Error updating commission status', { leadId, newLeadStatus, error });
    return null;
  }
}

/**
 * Auto-approve commissions for leads that have been CONVERTED for 30+ days
 */
export async function autoApproveCommissions(): Promise<number> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find leads that have been converted for 30+ days
    const { data: leadsData } = await db
      .from('leads')
      .select('id')
      .eq('status', 'CONVERTED')
      .lte('updatedAt', thirtyDaysAgo.toISOString());

    const leadIds = (leadsData || []).map((l: { id: string }) => l.id);

    if (leadIds.length === 0) return 0;

    // Update pending commissions for these leads
    let count = 0;
    for (const leadId of leadIds) {
      const { error } = await db
        .from('commissions')
        .update({
          status: 'APPROVED',
          approvedAt: new Date().toISOString(),
        })
        .eq('leadId', leadId)
        .eq('status', 'PENDING');

      if (!error) count++;
    }

    logger.info('Auto-approved commissions', { count });
    return count;
  } catch (error) {
    logger.error('Error auto-approving commissions', { error });
    return 0;
  }
}

/**
 * Get earnings summary for a referrer
 */
export async function getEarningsSummary(username: string): Promise<EarningsSummary> {
  try {
    const { data: commissionsData } = await db
      .from('commissions')
      .select('amount, status, createdAt')
      .eq('referrerUsername', username);

    const commissions = (commissionsData || []) as { amount: number; status: string; createdAt: string }[];

    const { data: leadsData } = await db
      .from('leads')
      .select('id, status, createdAt')
      .eq('referrerUsername', username);

    const leads = (leadsData || []) as { id: string; status: string; createdAt: string }[];

    // Calculate totals by status
    const totalEarnings = commissions.reduce((sum, c) => sum + Number(c.amount), 0);
    const pendingEarnings = commissions
      .filter((c) => c.status === 'PENDING')
      .reduce((sum, c) => sum + Number(c.amount), 0);
    const approvedEarnings = commissions
      .filter((c) => c.status === 'APPROVED')
      .reduce((sum, c) => sum + Number(c.amount), 0);
    const paidEarnings = commissions
      .filter((c) => c.status === 'PAID')
      .reduce((sum, c) => sum + Number(c.amount), 0);

    // Calculate lead metrics
    const totalLeads = leads.length;
    const convertedLeads = leads.filter((l) => l.status === 'CONVERTED').length;
    const averageCommission = commissions.length > 0 ? totalEarnings / commissions.length : 0;

    // Calculate monthly earnings
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthEarnings = commissions
      .filter((c) => new Date(c.createdAt) >= thisMonthStart)
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const lastMonthEarnings = commissions
      .filter((c) => {
        const d = new Date(c.createdAt);
        return d >= lastMonthStart && d <= lastMonthEnd;
      })
      .reduce((sum, c) => sum + Number(c.amount), 0);

    return {
      totalEarnings,
      pendingEarnings,
      approvedEarnings,
      paidEarnings,
      totalLeads,
      convertedLeads,
      averageCommission,
      thisMonthEarnings,
      lastMonthEarnings,
    };
  } catch (error) {
    logger.error('Error getting earnings summary', { username, error });
    return {
      totalEarnings: 0,
      pendingEarnings: 0,
      approvedEarnings: 0,
      paidEarnings: 0,
      totalLeads: 0,
      convertedLeads: 0,
      averageCommission: 0,
      thisMonthEarnings: 0,
      lastMonthEarnings: 0,
    };
  }
}

/**
 * Get commission history for a referrer
 */
export async function getCommissionHistory(
  username: string,
  limit: number = 50
): Promise<CommissionRecord[]> {
  try {
    const { data: commissionsData } = await db
      .from('commissions')
      .select('*')
      .eq('referrerUsername', username)
      .order('createdAt', { ascending: false })
      .limit(limit);

    const commissions = (commissionsData || []) as CommissionDbRecord[];

    return commissions.map((c) => ({
      id: c.id,
      leadId: c.leadId || '',
      referrerUsername: c.referrerUsername || '',
      referrerType: (c.referrerType || 'REFERRER') as 'AFFILIATE' | 'REFERRER' | 'TAX_PREPARER',
      amount: Number(c.amount),
      status: c.status as CommissionStatus,
      leadStatus: c.leadStatus || '',
      createdAt: new Date(c.createdAt),
      approvedAt: c.approvedAt ? new Date(c.approvedAt) : null,
      paidAt: c.paidAt ? new Date(c.paidAt) : null,
      notes: c.notes,
    }));
  } catch (error) {
    logger.error('Error getting commission history', { username, error });
    return [];
  }
}

/**
 * Request a payout
 */
export async function requestPayout(
  username: string,
  amount: number,
  paymentMethod: string,
  paymentDetails: string
): Promise<{ success: boolean; payoutId?: string; error?: string }> {
  try {
    const summary = await getEarningsSummary(username);

    if (summary.approvedEarnings < amount) {
      return {
        success: false,
        error: `Insufficient approved earnings. Available: $${summary.approvedEarnings}`,
      };
    }

    const { data: payout, error } = await db
      .from('payouts')
      .insert({
        referrerUsername: username,
        amount,
        status: 'REQUESTED',
        paymentMethod,
        paymentDetails,
        requestedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Payout requested', {
      payoutId: payout.id,
      username,
      amount,
    });

    return {
      success: true,
      payoutId: payout.id,
    };
  } catch (error) {
    logger.error('Error requesting payout', { username, amount, error });
    return {
      success: false,
      error: 'Failed to create payout request',
    };
  }
}

/**
 * Get payout history for a referrer
 */
export async function getPayoutHistory(username: string, limit: number = 20): Promise<unknown[]> {
  try {
    const { data: payouts } = await db
      .from('payouts')
      .select('*')
      .eq('referrerUsername', username)
      .order('requestedAt', { ascending: false })
      .limit(limit);

    return payouts || [];
  } catch (error) {
    logger.error('Error getting payout history', { username, error });
    return [];
  }
}

// ============ Enhanced Commission System (Affiliate System Enhancement) ============

import {
  getEffectiveCommissionRate,
  calculateCommissionAmount,
  updateAffiliateStats,
  type EffectiveRate,
} from './tiered-commission.service';

/**
 * Enhanced commission record with source tracking
 */
export interface EnhancedCommissionRecord {
  id: string;
  referrerId: string;
  referrerName?: string;
  amount: number;
  status: PaymentStatus;
  sourceType?: string;
  sourceId?: string;
  clientName?: string;
  clientEmail?: string;
  commissionType?: CommissionType;
  commissionRate?: number;
  rateSource?: string;
  groupId?: string;
  createdAt: Date;
  approvedAt?: Date | null;
  paidAt?: Date | null;
}

/**
 * Create a commission for a profile-based referral (new system)
 */
export async function createEnhancedCommission(
  referrerProfileId: string,
  grossAmount: number,
  sourceType: string,
  sourceId: string,
  clientName?: string,
  clientEmail?: string
): Promise<EnhancedCommissionRecord | null> {
  try {
    // IDEMPOTENCY CHECK: Prevent duplicate commissions
    const { data: existingData } = await db
      .from('commissions')
      .select('*')
      .eq('referrerId', referrerProfileId)
      .eq('sourceType', sourceType)
      .eq('sourceId', sourceId)
      .limit(1);

    const existingCommission = firstOrNull(existingData) as CommissionDbRecord | null;

    if (existingCommission) {
      logger.info('Commission already exists for this source, returning existing', {
        commissionId: existingCommission.id,
        referrerId: referrerProfileId,
        sourceType,
        sourceId,
      });

      const { data: profileData } = await db
        .from('profiles')
        .select('firstName, lastName')
        .eq('id', referrerProfileId)
        .limit(1);

      const profile = firstOrNull(profileData) as ProfileRecord | null;

      return {
        id: existingCommission.id,
        referrerId: existingCommission.referrerId || '',
        referrerName: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim(),
        amount: Number(existingCommission.amount),
        status: existingCommission.status,
        sourceType: existingCommission.sourceType || undefined,
        sourceId: existingCommission.sourceId || undefined,
        clientName: existingCommission.clientName || undefined,
        clientEmail: existingCommission.clientEmail || undefined,
        commissionType: existingCommission.commissionType || undefined,
        commissionRate: existingCommission.commissionRate || undefined,
        rateSource: existingCommission.rateSource || undefined,
        groupId: existingCommission.groupIdAtCreation || undefined,
        createdAt: new Date(existingCommission.createdAt),
        approvedAt: existingCommission.approvedAt ? new Date(existingCommission.approvedAt) : null,
        paidAt: existingCommission.paidAt ? new Date(existingCommission.paidAt) : null,
      };
    }

    // Get effective commission rate
    const effectiveRate = await getEffectiveCommissionRate(referrerProfileId);
    const calculation = calculateCommissionAmount(grossAmount, effectiveRate);

    // Get referrer profile
    const { data: profileData } = await db
      .from('profiles')
      .select('id, affiliateGroupId, firstName, lastName')
      .eq('id', referrerProfileId)
      .limit(1);

    const profile = firstOrNull(profileData) as ProfileRecord | null;

    if (!profile) {
      logger.error('Profile not found for commission creation', { referrerProfileId });
      return null;
    }

    // Create the commission record
    const { data: commissionData, error } = await db
      .from('commissions')
      .insert({
        referrerId: referrerProfileId,
        amount: calculation.finalAmount,
        status: 'PENDING',
        sourceType,
        sourceId,
        clientName,
        clientEmail,
        grossAmount,
        commissionType: calculation.commissionType,
        commissionRate: calculation.rate,
        rateAtCreation: calculation.rate,
        rateSource: calculation.rateSource,
        groupIdAtCreation: calculation.groupId,
        calculatedAmount: calculation.finalAmount,
        pendingAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    const commission = commissionData as CommissionDbRecord;

    logger.info('Enhanced commission created', {
      commissionId: commission.id,
      referrerId: referrerProfileId,
      amount: calculation.finalAmount,
      rateSource: calculation.rateSource,
    });

    // Update affiliate stats
    await updateAffiliateStats(referrerProfileId, calculation.finalAmount);

    return {
      id: commission.id,
      referrerId: commission.referrerId || '',
      referrerName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
      amount: Number(commission.amount),
      status: commission.status,
      sourceType: commission.sourceType || undefined,
      sourceId: commission.sourceId || undefined,
      clientName: commission.clientName || undefined,
      clientEmail: commission.clientEmail || undefined,
      commissionType: commission.commissionType || undefined,
      commissionRate: commission.commissionRate || undefined,
      rateSource: commission.rateSource || undefined,
      groupId: commission.groupIdAtCreation || undefined,
      createdAt: new Date(commission.createdAt),
      approvedAt: commission.approvedAt ? new Date(commission.approvedAt) : null,
      paidAt: commission.paidAt ? new Date(commission.paidAt) : null,
    };
  } catch (error) {
    logger.error('Error creating enhanced commission', {
      referrerProfileId,
      grossAmount,
      error,
    });
    return null;
  }
}

/**
 * Get commission summary for a profile (new system)
 */
export async function getProfileCommissionSummary(
  profileId: string
): Promise<{
  totalEarnings: number;
  pendingEarnings: number;
  approvedEarnings: number;
  paidEarnings: number;
  availableForPayout: number;
  totalCommissions: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  effectiveRate: EffectiveRate;
}> {
  try {
    const { data: commissionsData } = await db
      .from('commissions')
      .select('amount, status, createdAt')
      .eq('referrerId', profileId);

    const commissions = (commissionsData || []) as { amount: number; status: string; createdAt: string }[];

    const effectiveRate = await getEffectiveCommissionRate(profileId);

    const totalEarnings = commissions.reduce((sum, c) => sum + Number(c.amount), 0);
    const pendingEarnings = commissions
      .filter((c) => c.status === 'PENDING')
      .reduce((sum, c) => sum + Number(c.amount), 0);
    const approvedEarnings = commissions
      .filter((c) => c.status === 'APPROVED')
      .reduce((sum, c) => sum + Number(c.amount), 0);
    const paidEarnings = commissions
      .filter((c) => c.status === 'PAID')
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const availableForPayout = approvedEarnings;

    // Monthly earnings
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthEarnings = commissions
      .filter((c) => new Date(c.createdAt) >= thisMonthStart)
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const lastMonthEarnings = commissions
      .filter((c) => {
        const d = new Date(c.createdAt);
        return d >= lastMonthStart && d <= lastMonthEnd;
      })
      .reduce((sum, c) => sum + Number(c.amount), 0);

    return {
      totalEarnings,
      pendingEarnings,
      approvedEarnings,
      paidEarnings,
      availableForPayout,
      totalCommissions: commissions.length,
      thisMonthEarnings,
      lastMonthEarnings,
      effectiveRate,
    };
  } catch (error) {
    logger.error('Error getting profile commission summary', { profileId, error });
    const effectiveRate = await getEffectiveCommissionRate(profileId);
    return {
      totalEarnings: 0,
      pendingEarnings: 0,
      approvedEarnings: 0,
      paidEarnings: 0,
      availableForPayout: 0,
      totalCommissions: 0,
      thisMonthEarnings: 0,
      lastMonthEarnings: 0,
      effectiveRate,
    };
  }
}

/**
 * Get commission history for a profile with pagination
 */
export async function getProfileCommissionHistory(
  profileId: string,
  options: { page?: number; limit?: number; status?: PaymentStatus } = {}
): Promise<{
  commissions: EnhancedCommissionRecord[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const { page = 1, limit = 20, status } = options;
  const offset = (page - 1) * limit;

  try {
    let query = db
      .from('commissions')
      .select('*')
      .eq('referrerId', profileId);

    if (status) {
      query = query.eq('status', status);
    }

    let countQuery = db
      .from('commissions')
      .select('id', { count: 'exact', head: true })
      .eq('referrerId', profileId);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const [{ data: commissionsData }, { count: total }] = await Promise.all([
      query.order('createdAt', { ascending: false }).range(offset, offset + limit - 1),
      countQuery,
    ]);

    const commissions = (commissionsData || []) as CommissionDbRecord[];

    return {
      commissions: commissions.map((c) => ({
        id: c.id,
        referrerId: c.referrerId || '',
        amount: Number(c.amount),
        status: c.status,
        sourceType: c.sourceType || undefined,
        sourceId: c.sourceId || undefined,
        clientName: c.clientName || undefined,
        clientEmail: c.clientEmail || undefined,
        commissionType: c.commissionType || undefined,
        commissionRate: c.commissionRate || undefined,
        rateSource: c.rateSource || undefined,
        groupId: c.groupIdAtCreation || undefined,
        createdAt: new Date(c.createdAt),
        approvedAt: c.approvedAt ? new Date(c.approvedAt) : null,
        paidAt: c.paidAt ? new Date(c.paidAt) : null,
      })),
      total: total || 0,
      page,
      totalPages: Math.ceil((total || 0) / limit),
    };
  } catch (error) {
    logger.error('Error getting profile commission history', { profileId, error });
    return {
      commissions: [],
      total: 0,
      page,
      totalPages: 0,
    };
  }
}

/**
 * Request payout for a profile (new system)
 */
export async function requestProfilePayout(
  profileId: string,
  amount: number,
  paymentMethod: string
): Promise<{ success: boolean; payoutId?: string; error?: string }> {
  try {
    const summary = await getProfileCommissionSummary(profileId);

    if (summary.availableForPayout < amount) {
      return {
        success: false,
        error: `Insufficient approved earnings. Available: $${summary.availableForPayout.toFixed(2)}`,
      };
    }

    if (amount < summary.effectiveRate.minimumPayout) {
      return {
        success: false,
        error: `Minimum payout amount is $${summary.effectiveRate.minimumPayout}`,
      };
    }

    // Get approved commissions
    const { data: approvedCommissions } = await db
      .from('commissions')
      .select('id, amount')
      .eq('referrerId', profileId)
      .eq('status', 'APPROVED')
      .is('payoutRequestId', null)
      .order('createdAt', { ascending: true });

    // Select commissions up to amount
    let runningTotal = 0;
    const commissionIds: string[] = [];
    for (const commission of (approvedCommissions || []) as { id: string; amount: number }[]) {
      if (runningTotal >= amount) break;
      commissionIds.push(commission.id);
      runningTotal += Number(commission.amount);
    }

    // Create payout request
    const { data: payout, error } = await db
      .from('payout_requests')
      .insert({
        referrerId: profileId,
        amount,
        commissionIds,
        status: 'PENDING',
        paymentMethod,
        requestedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Link commissions to payout
    for (const commissionId of commissionIds) {
      await db
        .from('commissions')
        .update({ payoutRequestId: payout.id })
        .eq('id', commissionId);
    }

    logger.info('Profile payout requested', {
      payoutId: payout.id,
      profileId,
      amount,
      commissionCount: commissionIds.length,
    });

    return {
      success: true,
      payoutId: payout.id,
    };
  } catch (error) {
    logger.error('Error requesting profile payout', { profileId, amount, error });
    return {
      success: false,
      error: 'Failed to create payout request',
    };
  }
}

/**
 * Approve a commission (admin action)
 */
export async function approveCommission(
  commissionId: string,
  approvedBy: string,
  notes?: string
): Promise<boolean> {
  try {
    const { error } = await db
      .from('commissions')
      .update({
        status: 'APPROVED',
        approvedAt: new Date().toISOString(),
        approvedBy,
        approvalNotes: notes,
      })
      .eq('id', commissionId);

    if (error) throw error;

    logger.info('Commission approved', { commissionId, approvedBy });
    return true;
  } catch (error) {
    logger.error('Error approving commission', { commissionId, error });
    return false;
  }
}

/**
 * Bulk approve commissions (admin action)
 */
export async function bulkApproveCommissions(
  commissionIds: string[],
  approvedBy: string
): Promise<number> {
  try {
    let count = 0;
    for (const id of commissionIds) {
      const { error } = await db
        .from('commissions')
        .update({
          status: 'APPROVED',
          approvedAt: new Date().toISOString(),
          approvedBy,
        })
        .eq('id', id)
        .eq('status', 'PENDING');

      if (!error) count++;
    }

    logger.info('Bulk commissions approved', { count, approvedBy });
    return count;
  } catch (error) {
    logger.error('Error bulk approving commissions', { commissionIds, error });
    return 0;
  }
}

/**
 * Auto-approve commissions based on pending duration (enhanced)
 */
export async function autoApproveEnhancedCommissions(
  daysThreshold: number = 30
): Promise<number> {
  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    // Get pending commissions older than threshold
    const { data: pendingData } = await db
      .from('commissions')
      .select('id')
      .eq('status', 'PENDING')
      .lte('pendingAt', thresholdDate.toISOString());

    const pendingIds = ((pendingData || []) as { id: string }[]).map((c) => c.id);

    let count = 0;
    for (const id of pendingIds) {
      const { error } = await db
        .from('commissions')
        .update({
          status: 'APPROVED',
          approvedAt: new Date().toISOString(),
          approvalNotes: `Auto-approved after ${daysThreshold} days`,
        })
        .eq('id', id);

      if (!error) count++;
    }

    logger.info('Auto-approved enhanced commissions', {
      count,
      daysThreshold,
    });
    return count;
  } catch (error) {
    logger.error('Error auto-approving enhanced commissions', { error });
    return 0;
  }
}
