/**
 * Commission Service
 *
 * Handles commission calculations, earnings tracking, and payout management
 * for affiliates, referrers, and bonded tax preparers
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

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
 *
 * Commission is locked at lead creation time in lead.commissionRate
 * This function creates a commission record when the lead converts
 */
export async function calculateCommission(leadId: string): Promise<CommissionRecord | null> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        status: true,
        referrerUsername: true,
        referrerType: true,
        commissionRate: true,
        commissionRateLockedAt: true,
      },
    });

    if (!lead) {
      logger.error('Lead not found for commission calculation', { leadId });
      return null;
    }

    // Only calculate commission for CONVERTED leads
    if (lead.status !== 'CONVERTED') {
      logger.warn('Attempted to calculate commission for non-converted lead', {
        leadId,
        status: lead.status,
      });
      return null;
    }

    // Ensure we have a referrer and commission rate
    if (!lead.referrerUsername || !lead.commissionRate) {
      logger.warn('Lead missing referrer or commission rate', {
        leadId,
        referrerUsername: lead.referrerUsername,
        commissionRate: lead.commissionRate,
      });
      return null;
    }

    // Check if commission already exists
    const existingCommission = await prisma.commission.findFirst({
      where: { leadId },
    });

    if (existingCommission) {
      logger.info('Commission already exists for lead', {
        leadId,
        commissionId: existingCommission.id,
      });
      return existingCommission as CommissionRecord;
    }

    // Create commission record
    const commission = await prisma.commission.create({
      data: {
        leadId: lead.id,
        referrerUsername: lead.referrerUsername,
        referrerType: lead.referrerType || 'REFERRER',
        amount: lead.commissionRate,
        status: 'PENDING',
        leadStatus: lead.status,
        notes: `Commission locked at ${lead.commissionRate} on ${lead.commissionRateLockedAt?.toISOString()}`,
      },
    });

    logger.info('Commission calculated and created', {
      leadId,
      commissionId: commission.id,
      amount: commission.amount,
      referrerUsername: commission.referrerUsername,
    });

    return commission as CommissionRecord;
  } catch (error) {
    logger.error('Error calculating commission', { leadId, error });
    return null;
  }
}

/**
 * Update commission status when lead status changes
 *
 * - CONVERTED → PENDING commission
 * - Stay CONVERTED for 30 days → APPROVED commission
 * - Revert from CONVERTED → CANCELLED commission
 */
export async function updateCommissionStatus(
  leadId: string,
  newLeadStatus: string
): Promise<CommissionRecord | null> {
  try {
    const commission = await prisma.commission.findFirst({
      where: { leadId },
    });

    if (!commission) {
      // If lead just converted, create new commission
      if (newLeadStatus === 'CONVERTED') {
        return await calculateCommission(leadId);
      }
      return null;
    }

    // If lead reverted from CONVERTED, cancel commission
    if (newLeadStatus !== 'CONVERTED' && commission.status === 'PENDING') {
      const updated = await prisma.commission.update({
        where: { id: commission.id },
        data: {
          status: 'CANCELLED',
          leadStatus: newLeadStatus,
          notes: `Commission cancelled due to lead status change to ${newLeadStatus}`,
        },
      });

      logger.info('Commission cancelled due to lead status change', {
        commissionId: commission.id,
        leadId,
        newStatus: newLeadStatus,
      });

      return updated as CommissionRecord;
    }

    // Update lead status in commission record
    const updated = await prisma.commission.update({
      where: { id: commission.id },
      data: { leadStatus: newLeadStatus },
    });

    return updated as CommissionRecord;
  } catch (error) {
    logger.error('Error updating commission status', { leadId, newLeadStatus, error });
    return null;
  }
}

/**
 * Auto-approve commissions for leads that have been CONVERTED for 30+ days
 *
 * This should be run as a scheduled job (cron)
 */
export async function autoApproveCommissions(): Promise<number> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find pending commissions where lead has been converted for 30+ days
    const leads = await prisma.lead.findMany({
      where: {
        status: 'CONVERTED',
        updatedAt: { lte: thirtyDaysAgo },
      },
      select: { id: true },
    });

    const leadIds = leads.map((l) => l.id);

    const result = await prisma.commission.updateMany({
      where: {
        leadId: { in: leadIds },
        status: 'PENDING',
      },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });

    logger.info('Auto-approved commissions', { count: result.count });
    return result.count;
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
    const commissions = await prisma.commission.findMany({
      where: { referrerUsername: username },
      select: {
        amount: true,
        status: true,
        createdAt: true,
      },
    });

    const leads = await prisma.lead.findMany({
      where: { referrerUsername: username },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

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

    // Calculate this month and last month earnings
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthEarnings = commissions
      .filter((c) => c.createdAt >= thisMonthStart)
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const lastMonthEarnings = commissions
      .filter((c) => c.createdAt >= lastMonthStart && c.createdAt <= lastMonthEnd)
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
    const commissions = await prisma.commission.findMany({
      where: { referrerUsername: username },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return commissions as CommissionRecord[];
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
    // Verify available balance
    const summary = await getEarningsSummary(username);

    if (summary.approvedEarnings < amount) {
      return {
        success: false,
        error: `Insufficient approved earnings. Available: $${summary.approvedEarnings}`,
      };
    }

    // Create payout request
    const payout = await prisma.payout.create({
      data: {
        referrerUsername: username,
        amount,
        status: 'REQUESTED',
        paymentMethod,
        paymentDetails,
        requestedAt: new Date(),
      },
    });

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
export async function getPayoutHistory(username: string, limit: number = 20): Promise<any[]> {
  try {
    const payouts = await prisma.payout.findMany({
      where: { referrerUsername: username },
      orderBy: { requestedAt: 'desc' },
      take: limit,
    });

    return payouts;
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
  type CommissionCalculation,
} from './tiered-commission.service';
import { CommissionType, PaymentStatus } from '@prisma/client';

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
 * Uses the tiered commission service for rate calculation
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
    // Get effective commission rate using the hierarchy
    const effectiveRate = await getEffectiveCommissionRate(referrerProfileId);

    // Calculate commission amount
    const calculation = calculateCommissionAmount(grossAmount, effectiveRate);

    // Get referrer profile for linking
    const profile = await prisma.profile.findUnique({
      where: { id: referrerProfileId },
      select: {
        id: true,
        affiliateGroupId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!profile) {
      logger.error('Profile not found for commission creation', { referrerProfileId });
      return null;
    }

    // Create the commission record
    const commission = await prisma.commission.create({
      data: {
        referrerId: referrerProfileId,
        amount: calculation.finalAmount,
        status: PaymentStatus.PENDING,
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
        pendingAt: new Date(),
      },
    });

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
      referrerId: commission.referrerId,
      referrerName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
      amount: Number(commission.amount),
      status: commission.status,
      sourceType: commission.sourceType || undefined,
      sourceId: commission.sourceId || undefined,
      clientName: commission.clientName || undefined,
      clientEmail: commission.clientEmail || undefined,
      commissionType: commission.commissionType || undefined,
      commissionRate: commission.commissionRate?.toNumber(),
      rateSource: commission.rateSource || undefined,
      groupId: commission.groupIdAtCreation || undefined,
      createdAt: commission.createdAt,
      approvedAt: commission.approvedAt,
      paidAt: commission.paidAt,
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
    const commissions = await prisma.commission.findMany({
      where: { referrerId: profileId },
      select: {
        amount: true,
        status: true,
        createdAt: true,
      },
    });

    // Get effective rate
    const effectiveRate = await getEffectiveCommissionRate(profileId);

    // Calculate totals by status
    const totalEarnings = commissions.reduce((sum, c) => sum + Number(c.amount), 0);
    const pendingEarnings = commissions
      .filter((c) => c.status === PaymentStatus.PENDING)
      .reduce((sum, c) => sum + Number(c.amount), 0);
    const approvedEarnings = commissions
      .filter((c) => c.status === PaymentStatus.APPROVED)
      .reduce((sum, c) => sum + Number(c.amount), 0);
    const paidEarnings = commissions
      .filter((c) => c.status === PaymentStatus.PAID)
      .reduce((sum, c) => sum + Number(c.amount), 0);

    // Available for payout = approved but not yet paid
    const availableForPayout = approvedEarnings;

    // Calculate monthly earnings
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthEarnings = commissions
      .filter((c) => c.createdAt >= thisMonthStart)
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const lastMonthEarnings = commissions
      .filter((c) => c.createdAt >= lastMonthStart && c.createdAt <= lastMonthEnd)
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
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { referrerId: profileId };
  if (status) {
    where.status = status;
  }

  try {
    const [commissions, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.commission.count({ where }),
    ]);

    return {
      commissions: commissions.map((c) => ({
        id: c.id,
        referrerId: c.referrerId,
        amount: Number(c.amount),
        status: c.status,
        sourceType: c.sourceType || undefined,
        sourceId: c.sourceId || undefined,
        clientName: c.clientName || undefined,
        clientEmail: c.clientEmail || undefined,
        commissionType: c.commissionType || undefined,
        commissionRate: c.commissionRate?.toNumber(),
        rateSource: c.rateSource || undefined,
        groupId: c.groupIdAtCreation || undefined,
        createdAt: c.createdAt,
        approvedAt: c.approvedAt,
        paidAt: c.paidAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
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
    // Verify available balance
    const summary = await getProfileCommissionSummary(profileId);

    if (summary.availableForPayout < amount) {
      return {
        success: false,
        error: `Insufficient approved earnings. Available: $${summary.availableForPayout.toFixed(2)}`,
      };
    }

    // Check minimum payout threshold
    if (amount < summary.effectiveRate.minimumPayout) {
      return {
        success: false,
        error: `Minimum payout amount is $${summary.effectiveRate.minimumPayout}`,
      };
    }

    // Get approved commissions to include in payout
    const approvedCommissions = await prisma.commission.findMany({
      where: {
        referrerId: profileId,
        status: PaymentStatus.APPROVED,
        payoutRequestId: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Select commissions up to the requested amount
    let runningTotal = 0;
    const commissionIds: string[] = [];
    for (const commission of approvedCommissions) {
      if (runningTotal >= amount) break;
      commissionIds.push(commission.id);
      runningTotal += Number(commission.amount);
    }

    // Create payout request
    const payout = await prisma.payoutRequest.create({
      data: {
        referrerId: profileId,
        amount,
        commissionIds,
        status: 'PENDING',
        paymentMethod,
        requestedAt: new Date(),
      },
    });

    // Link commissions to this payout request
    await prisma.commission.updateMany({
      where: { id: { in: commissionIds } },
      data: { payoutRequestId: payout.id },
    });

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
    await prisma.commission.update({
      where: { id: commissionId },
      data: {
        status: PaymentStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy,
        approvalNotes: notes,
      },
    });

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
    const result = await prisma.commission.updateMany({
      where: {
        id: { in: commissionIds },
        status: PaymentStatus.PENDING,
      },
      data: {
        status: PaymentStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy,
      },
    });

    logger.info('Bulk commissions approved', { count: result.count, approvedBy });
    return result.count;
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

    const result = await prisma.commission.updateMany({
      where: {
        status: PaymentStatus.PENDING,
        pendingAt: { lte: thresholdDate },
      },
      data: {
        status: PaymentStatus.APPROVED,
        approvedAt: new Date(),
        approvalNotes: `Auto-approved after ${daysThreshold} days`,
      },
    });

    logger.info('Auto-approved enhanced commissions', {
      count: result.count,
      daysThreshold,
    });
    return result.count;
  } catch (error) {
    logger.error('Error auto-approving enhanced commissions', { error });
    return 0;
  }
}
