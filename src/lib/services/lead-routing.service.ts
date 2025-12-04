/**
 * Lead Routing Service
 *
 * Automatically assigns leads to tax preparers based on routing rules.
 * Supports round-robin, geographic, workload-based, and custom routing.
 *
 * @module lib/services/lead-routing
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { logLeadAssigned } from './activity.service';

export enum RoutingStrategy {
  ROUND_ROBIN = 'round_robin',        // Distribute leads evenly
  LEAST_BUSY = 'least_busy',          // Assign to preparer with fewest active leads
  GEOGRAPHIC = 'geographic',          // Match by state/location
  SKILL_BASED = 'skill_based',        // Match by preparer expertise
  CUSTOM = 'custom',                  // Custom business logic
}

export interface RoutingRule {
  id?: string;
  name: string;
  description?: string;
  strategy: RoutingStrategy;
  isActive: boolean;
  priority: number;
  conditions?: RoutingConditions;
  config?: RoutingConfig;
}

export interface RoutingConditions {
  states?: string[];                  // Only apply to these states
  leadSources?: string[];             // Only apply to these sources
  filingStatus?: string[];            // Single, Married, etc.
  minimumLeadScore?: number;          // Only route leads above this score
}

export interface RoutingConfig {
  preparerIds?: string[];             // Limit to specific preparers
  maxLeadsPerPreparer?: number;       // Cap on active leads
  excludePreparers?: string[];        // Exclude specific preparers
}

/**
 * Route a lead to the best available preparer
 *
 * @example
 * ```typescript
 * const result = await routeLead('lead_123');
 * // Lead assigned to preparer_456
 * ```
 */
export async function routeLead(leadId: string, manualPreparerId?: string) {
  try {
    // Get lead details
    const lead = await prisma.taxIntakeLead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return { success: false, error: 'Lead not found' };
    }

    // If lead is already assigned, skip
    if (lead.assignedTo) {
      logger.info(`Lead ${leadId} already assigned to ${lead.assignedTo}`);
      return { success: true, preparerId: lead.assignedTo, reason: 'Already assigned' };
    }

    // Manual assignment takes precedence
    if (manualPreparerId) {
      return await assignLeadToPreparer(leadId, manualPreparerId, 'Manual assignment');
    }

    // Find applicable routing rules
    const rules = await getApplicableRoutingRules(lead);

    if (rules.length === 0) {
      logger.warn(`No routing rules found for lead ${leadId}`);
      return { success: false, error: 'No routing rules configured' };
    }

    // Apply highest priority rule
    const rule = rules[0];
    logger.info(`Applying routing rule: ${rule.name} (${rule.strategy})`);

    // Execute routing strategy
    let preparerId: string | null = null;

    switch (rule.strategy) {
      case RoutingStrategy.ROUND_ROBIN:
        preparerId = await roundRobinRouting(lead, rule);
        break;

      case RoutingStrategy.LEAST_BUSY:
        preparerId = await leastBusyRouting(lead, rule);
        break;

      case RoutingStrategy.GEOGRAPHIC:
        preparerId = await geographicRouting(lead, rule);
        break;

      case RoutingStrategy.SKILL_BASED:
        preparerId = await skillBasedRouting(lead, rule);
        break;

      default:
        logger.error(`Unknown routing strategy: ${rule.strategy}`);
        return { success: false, error: 'Unknown routing strategy' };
    }

    if (!preparerId) {
      return { success: false, error: 'No suitable preparer found' };
    }

    // Assign lead to preparer
    return await assignLeadToPreparer(leadId, preparerId, `Routed via ${rule.name}`);
  } catch (error) {
    logger.error('Error routing lead:', error);
    return { success: false, error: 'Failed to route lead' };
  }
}

/**
 * Assign a lead to a specific preparer
 */
async function assignLeadToPreparer(
  leadId: string,
  preparerId: string,
  reason: string
) {
  try {
    // Get preparer details
    const preparer = await prisma.profile.findUnique({
      where: { id: preparerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!preparer || preparer.role !== 'tax_preparer') {
      return { success: false, error: 'Invalid preparer' };
    }

    const preparerName = [preparer.firstName, preparer.lastName].filter(Boolean).join(' ');

    // Update lead
    await prisma.taxIntakeLead.update({
      where: { id: leadId },
      data: {
        assignedTo: preparerId,
      },
    });

    // Log activity
    await logLeadAssigned(leadId, preparerName);

    logger.info(`Lead ${leadId} assigned to ${preparerId}`, { reason });

    return {
      success: true,
      preparerId,
      preparerName,
      reason,
    };
  } catch (error) {
    logger.error('Error assigning lead to preparer:', error);
    return { success: false, error: 'Failed to assign lead' };
  }
}

/**
 * Round-robin routing strategy
 */
async function roundRobinRouting(lead: any, rule: RoutingRule): Promise<string | null> {
  try {
    // Get all eligible preparers
    const preparers = await getEligiblePreparers(rule.config);

    if (preparers.length === 0) {
      return null;
    }

    // Get lead counts for each preparer
    const leadCounts = await Promise.all(
      preparers.map(async (preparer) => {
        const count = await prisma.taxIntakeLead.count({
          where: {
            assignedTo: preparer.id,
            convertedToClient: false, // Only count active leads
          },
        });

        return { preparerId: preparer.id, count };
      })
    );

    // Sort by count (ascending) and return preparer with least leads
    leadCounts.sort((a, b) => a.count - b.count);

    return leadCounts[0].preparerId;
  } catch (error) {
    logger.error('Error in round-robin routing:', error);
    return null;
  }
}

/**
 * Least busy routing strategy
 */
async function leastBusyRouting(lead: any, rule: RoutingRule): Promise<string | null> {
  // Same as round-robin for now
  return roundRobinRouting(lead, rule);
}

/**
 * Geographic routing strategy
 */
async function geographicRouting(lead: any, rule: RoutingRule): Promise<string | null> {
  try {
    if (!lead.state) {
      logger.warn('Lead has no state, falling back to round-robin');
      return roundRobinRouting(lead, rule);
    }

    // Get preparers in the same state
    const preparers = await prisma.profile.findMany({
      where: {
        role: 'tax_preparer',
        state: lead.state,
        id: rule.config?.preparerIds
          ? { in: rule.config.preparerIds }
          : rule.config?.excludePreparers
          ? { notIn: rule.config.excludePreparers }
          : undefined,
      },
      select: { id: true },
    });

    if (preparers.length === 0) {
      logger.warn(`No preparers found in state ${lead.state}, falling back to round-robin`);
      return roundRobinRouting(lead, rule);
    }

    // Among matching preparers, use least busy
    const leadCounts = await Promise.all(
      preparers.map(async (preparer) => {
        const count = await prisma.taxIntakeLead.count({
          where: {
            assignedTo: preparer.id,
            convertedToClient: false,
          },
        });

        return { preparerId: preparer.id, count };
      })
    );

    leadCounts.sort((a, b) => a.count - b.count);

    return leadCounts[0].preparerId;
  } catch (error) {
    logger.error('Error in geographic routing:', error);
    return null;
  }
}

/**
 * Skill-based routing strategy
 */
async function skillBasedRouting(lead: any, rule: RoutingRule): Promise<string | null> {
  try {
    // For now, this will fall back to round-robin
    // In production, you would match preparer skills/expertise with lead requirements
    logger.info('Skill-based routing not fully implemented, using round-robin');
    return roundRobinRouting(lead, rule);
  } catch (error) {
    logger.error('Error in skill-based routing:', error);
    return null;
  }
}

/**
 * Get eligible preparers based on config
 */
async function getEligiblePreparers(config?: RoutingConfig) {
  const where: any = {
    role: 'tax_preparer',
  };

  if (config?.preparerIds && config.preparerIds.length > 0) {
    where.id = { in: config.preparerIds };
  }

  if (config?.excludePreparers && config.excludePreparers.length > 0) {
    where.id = { notIn: config.excludePreparers };
  }

  const preparers = await prisma.profile.findMany({
    where,
    select: { id: true },
  });

  // Filter by max leads if specified
  if (config?.maxLeadsPerPreparer) {
    const filtered = [];

    for (const preparer of preparers) {
      const leadCount = await prisma.taxIntakeLead.count({
        where: {
          assignedTo: preparer.id,
          convertedToClient: false,
        },
      });

      if (leadCount < config.maxLeadsPerPreparer) {
        filtered.push(preparer);
      }
    }

    return filtered;
  }

  return preparers;
}

/**
 * Get applicable routing rules for a lead
 */
async function getApplicableRoutingRules(lead: any): Promise<RoutingRule[]> {
  // For now, return a default round-robin rule
  // In production, this would query a routing_rules table
  return [
    {
      name: 'Default Round Robin',
      strategy: RoutingStrategy.ROUND_ROBIN,
      isActive: true,
      priority: 0,
    },
  ];
}

/**
 * Bulk route multiple leads
 */
export async function bulkRoutLeads(leadIds: string[]) {
  const results = [];

  for (const leadId of leadIds) {
    const result = await routeLead(leadId);
    results.push({
      leadId,
      success: result.success,
      preparerId: result.success ? result.preparerId : null,
      error: result.error,
    });
  }

  return {
    total: leadIds.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

/**
 * Get preparer workload stats
 */
export async function getPreparerWorkload() {
  try {
    const preparers = await prisma.profile.findMany({
      where: { role: 'tax_preparer' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    const workload = await Promise.all(
      preparers.map(async (preparer) => {
        const activeLeads = await prisma.taxIntakeLead.count({
          where: {
            assignedTo: preparer.id,
            convertedToClient: false,
          },
        });

        const convertedClients = await prisma.taxIntakeLead.count({
          where: {
            assignedTo: preparer.id,
            convertedToClient: true,
          },
        });

        const totalLeads = activeLeads + convertedClients;

        return {
          preparerId: preparer.id,
          preparerName: [preparer.firstName, preparer.lastName].filter(Boolean).join(' '),
          activeLeads,
          convertedClients,
          totalLeads,
        };
      })
    );

    return { success: true, workload };
  } catch (error) {
    logger.error('Error getting preparer workload:', error);
    return { success: false, error: 'Failed to get workload stats' };
  }
}
