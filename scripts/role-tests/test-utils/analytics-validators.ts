/**
 * Analytics Validators
 *
 * Direct wrappers around analytics service functions for test validation.
 * Provides comparison utilities for before/after analytics states.
 */

import {
  getLeadPipelineSummary,
  getConversionFunnel,
  getTopPerformers,
  getCommissionSummary,
  getAllPreparersLeadPerformance,
  getAllAffiliatesLeadPerformance,
  getLeadsBySource,
  getRecentLeads,
  Period,
} from '../../../src/lib/services/lead-flow-analytics.service';

import { prisma } from './test-data-factory';
import { LeadStatus, PaymentStatus } from '@prisma/client';

export interface PipelineSnapshot {
  pipeline: Record<LeadStatus, number>;
  total: number;
}

export interface FunnelSnapshot {
  clicks: number;
  leads: number;
  intakeStarts: number;
  intakeCompletes: number;
  returnsFiled: number;
  conversionRates: {
    clickToLead: number;
    leadToIntake: number;
    intakeToComplete: number;
    overallConversion: number;
  };
}

export interface CommissionSnapshot {
  total: { amount: number; count: number };
  pending: { amount: number; count: number };
  approved: { amount: number; count: number };
  paid: { amount: number; count: number };
}

/**
 * Take a snapshot of the current lead pipeline
 */
export async function snapshotLeadPipeline(period: Period = '30d'): Promise<PipelineSnapshot> {
  return getLeadPipelineSummary(period);
}

/**
 * Take a snapshot of the conversion funnel
 */
export async function snapshotConversionFunnel(period: Period = '30d'): Promise<FunnelSnapshot> {
  return getConversionFunnel(period);
}

/**
 * Take a snapshot of commission summary
 */
export async function snapshotCommissionSummary(period: Period = '30d'): Promise<CommissionSnapshot> {
  return getCommissionSummary(period);
}

/**
 * Validate that pipeline counts match expected values
 */
export function validatePipeline(
  actual: PipelineSnapshot,
  expected: Partial<Record<LeadStatus, number>>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [status, expectedCount] of Object.entries(expected)) {
    const actualCount = actual.pipeline[status as LeadStatus];
    if (actualCount !== expectedCount) {
      errors.push(`Pipeline ${status}: expected ${expectedCount}, got ${actualCount}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that commission summary matches expected values
 */
export function validateCommissionSummary(
  actual: CommissionSnapshot,
  expected: {
    pending?: { amount?: number; count?: number };
    approved?: { amount?: number; count?: number };
    paid?: { amount?: number; count?: number };
  }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (expected.pending) {
    if (expected.pending.amount !== undefined && actual.pending.amount !== expected.pending.amount) {
      errors.push(`Pending amount: expected ${expected.pending.amount}, got ${actual.pending.amount}`);
    }
    if (expected.pending.count !== undefined && actual.pending.count !== expected.pending.count) {
      errors.push(`Pending count: expected ${expected.pending.count}, got ${actual.pending.count}`);
    }
  }

  if (expected.approved) {
    if (expected.approved.amount !== undefined && actual.approved.amount !== expected.approved.amount) {
      errors.push(`Approved amount: expected ${expected.approved.amount}, got ${actual.approved.amount}`);
    }
    if (expected.approved.count !== undefined && actual.approved.count !== expected.approved.count) {
      errors.push(`Approved count: expected ${expected.approved.count}, got ${actual.approved.count}`);
    }
  }

  if (expected.paid) {
    if (expected.paid.amount !== undefined && actual.paid.amount !== expected.paid.amount) {
      errors.push(`Paid amount: expected ${expected.paid.amount}, got ${actual.paid.amount}`);
    }
    if (expected.paid.count !== undefined && actual.paid.count !== expected.paid.count) {
      errors.push(`Paid count: expected ${expected.paid.count}, got ${actual.paid.count}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Compare two pipeline snapshots and return the differences
 */
export function comparePipelines(
  before: PipelineSnapshot,
  after: PipelineSnapshot
): { status: LeadStatus; change: number }[] {
  const changes: { status: LeadStatus; change: number }[] = [];

  for (const status of Object.keys(before.pipeline) as LeadStatus[]) {
    const change = after.pipeline[status] - before.pipeline[status];
    if (change !== 0) {
      changes.push({ status, change });
    }
  }

  return changes;
}

/**
 * Compare two commission snapshots and return the differences
 */
export function compareCommissions(
  before: CommissionSnapshot,
  after: CommissionSnapshot
): {
  pendingChange: { amount: number; count: number };
  approvedChange: { amount: number; count: number };
  paidChange: { amount: number; count: number };
} {
  return {
    pendingChange: {
      amount: after.pending.amount - before.pending.amount,
      count: after.pending.count - before.pending.count,
    },
    approvedChange: {
      amount: after.approved.amount - before.approved.amount,
      count: after.approved.count - before.approved.count,
    },
    paidChange: {
      amount: after.paid.amount - before.paid.amount,
      count: after.paid.count - before.paid.count,
    },
  };
}

/**
 * Validate top performers list contains expected user
 */
export async function validateTopPerformers(
  expectedUsername: string,
  expectedMinLeads: number,
  period: Period = '30d'
): Promise<{ valid: boolean; performer: unknown; error?: string }> {
  const performers = await getTopPerformers(50, period);
  const found = performers.find((p) => p.username === expectedUsername);

  if (!found) {
    return {
      valid: false,
      performer: null,
      error: `User ${expectedUsername} not found in top performers`,
    };
  }

  if (found.leads < expectedMinLeads) {
    return {
      valid: false,
      performer: found,
      error: `User ${expectedUsername} has ${found.leads} leads, expected at least ${expectedMinLeads}`,
    };
  }

  return { valid: true, performer: found };
}

/**
 * Get preparer performance for validation
 */
export async function getPreparerPerformance(username: string, period: Period = '30d') {
  const allPreparers = await getAllPreparersLeadPerformance(period);
  return allPreparers.find((p) => p.username === username);
}

/**
 * Get affiliate performance for validation
 */
export async function getAffiliatePerformance(username: string, period: Period = '30d') {
  const allAffiliates = await getAllAffiliatesLeadPerformance(period);
  return allAffiliates.find((a) => a.username === username);
}

/**
 * Direct database count validation - bypasses service layer
 */
export async function directCountValidation(): Promise<{
  leads: Record<LeadStatus, number>;
  commissions: Record<PaymentStatus, number>;
  totalUsers: number;
  usersByRole: Record<string, number>;
}> {
  // Count leads by status
  const leadCounts = await prisma.lead.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const leads: Record<LeadStatus, number> = {
    NEW: 0,
    CONTACTED: 0,
    QUALIFIED: 0,
    CONVERTED: 0,
    DISQUALIFIED: 0,
  };

  leadCounts.forEach((item) => {
    leads[item.status] = item._count.id;
  });

  // Count commissions by status
  const commissionCounts = await prisma.commission.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const commissions: Record<PaymentStatus, number> = {
    PENDING: 0,
    APPROVED: 0,
    PROCESSING: 0,
    PAID: 0,
    COMPLETED: 0,
    FAILED: 0,
    REFUNDED: 0,
    CANCELLED: 0,
  };

  commissionCounts.forEach((item) => {
    commissions[item.status] = item._count.id;
  });

  // Count users by role
  const roleCounts = await prisma.profile.groupBy({
    by: ['role'],
    _count: { id: true },
  });

  const usersByRole: Record<string, number> = {};
  roleCounts.forEach((item) => {
    usersByRole[item.role] = item._count.id;
  });

  const totalUsers = await prisma.user.count();

  return {
    leads,
    commissions,
    totalUsers,
    usersByRole,
  };
}

/**
 * Assert analytics service matches direct database queries
 */
export async function assertAnalyticsConsistency(
  period: Period = '30d'
): Promise<{ consistent: boolean; discrepancies: string[] }> {
  const discrepancies: string[] = [];

  // Get service results
  const servicePipeline = await snapshotLeadPipeline(period);
  const serviceCommissions = await snapshotCommissionSummary(period);

  // Get direct counts (for 'all' period only - direct counts don't filter by date)
  if (period === 'all') {
    const directCounts = await directCountValidation();

    // Compare lead pipeline
    for (const status of Object.keys(servicePipeline.pipeline) as LeadStatus[]) {
      if (servicePipeline.pipeline[status] !== directCounts.leads[status]) {
        discrepancies.push(
          `Lead ${status}: service=${servicePipeline.pipeline[status]}, direct=${directCounts.leads[status]}`
        );
      }
    }

    // Compare commission counts
    if (serviceCommissions.pending.count !== directCounts.commissions.PENDING) {
      discrepancies.push(
        `Commission PENDING: service=${serviceCommissions.pending.count}, direct=${directCounts.commissions.PENDING}`
      );
    }
  }

  return {
    consistent: discrepancies.length === 0,
    discrepancies,
  };
}

// Re-export analytics functions for convenience
export {
  getLeadPipelineSummary,
  getConversionFunnel,
  getTopPerformers,
  getCommissionSummary,
  getAllPreparersLeadPerformance,
  getAllAffiliatesLeadPerformance,
  getLeadsBySource,
  getRecentLeads,
};
