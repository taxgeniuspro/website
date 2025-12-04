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
