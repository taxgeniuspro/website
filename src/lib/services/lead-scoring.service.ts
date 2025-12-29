/**
 * Lead Scoring Service
 *
 * Automatically calculates lead scores (0-100) based on multiple factors:
 * - Profile completeness
 * - Engagement level (email opens, clicks)
 * - Lead source quality
 * - Time to first contact
 * - Response rate
 * - Income indicators
 *
 * @module lib/services/lead-scoring
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
type LeadUrgency = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

// Re-export for consumers
export { LeadUrgency };

interface TaxIntakeLead {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  state?: string | null;
  filing_status?: string | null;
  source?: string | null;
  emailOpens: number;
  emailClicks: number;
  estimated_income?: number | null;
  previous_year_agi?: number | null;
  leadScore?: number | null;
  urgency?: LeadUrgency | null;
  convertedToClient: boolean;
  created_at: string;
  activities?: LeadActivity[];
  tasks?: LeadTask[];
}

interface LeadActivity {
  id: string;
  createdAt: string;
}

interface LeadTask {
  id: string;
  status: string;
}

export interface LeadScoreFactors {
  profileCompleteness: number; // 0-25 points
  engagement: number; // 0-25 points
  sourceQuality: number; // 0-20 points
  timing: number; // 0-15 points
  demographics: number; // 0-15 points
}

export interface LeadScoreResult {
  score: number;
  factors: LeadScoreFactors;
  urgency: LeadUrgency;
  reason: string;
}

/**
 * Calculate lead score for a specific lead
 *
 * @example
 * ```typescript
 * const result = await calculateLeadScore('lead_123');
 * // { score: 85, urgency: 'HIGH', factors: {...} }
 * ```
 */
export async function calculateLeadScore(leadId: string): Promise<LeadScoreResult> {
  try {
    // Get lead with activities and tasks
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select('*')
      .eq('id', leadId)
      .limit(1);

    const lead = firstOrNull(leads) as TaxIntakeLead | null;

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Get recent activities
    const { data: activities } = await db
      .from('lead_activities')
      .select('id, createdAt')
      .eq('leadId', leadId)
      .order('createdAt', { ascending: false })
      .limit(50);

    // Get open tasks
    const { data: tasks } = await db
      .from('lead_tasks')
      .select('id, status')
      .eq('leadId', leadId)
      .in('status', ['TODO', 'IN_PROGRESS']);

    lead.activities = (activities || []) as LeadActivity[];
    lead.tasks = (tasks || []) as LeadTask[];

    const factors: LeadScoreFactors = {
      profileCompleteness: calculateProfileCompleteness(lead),
      engagement: calculateEngagement(lead),
      sourceQuality: calculateSourceQuality(lead),
      timing: calculateTiming(lead),
      demographics: calculateDemographics(lead),
    };

    const totalScore = Math.round(
      factors.profileCompleteness +
        factors.engagement +
        factors.sourceQuality +
        factors.timing +
        factors.demographics
    );

    // Cap at 100
    const score = Math.min(totalScore, 100);

    // Determine urgency based on score and other factors
    const urgency = determineUrgency(score, lead);

    // Generate explanation
    const reason = generateScoreReason(factors, score);

    // Update lead score in database
    await db
      .from('tax_intake_leads')
      .update({
        leadScore: score,
        leadScoreUpdatedAt: new Date().toISOString(),
        urgency,
      })
      .eq('id', leadId);

    logger.info(`Lead ${leadId} scored: ${score} (${urgency})`);

    return {
      score,
      factors,
      urgency,
      reason,
    };
  } catch (error) {
    logger.error('Error calculating lead score:', error);
    throw error;
  }
}

/**
 * Calculate profile completeness score (0-25 points)
 */
function calculateProfileCompleteness(lead: TaxIntakeLead): number {
  let score = 0;

  // Required fields (5 points each)
  if (lead.first_name) score += 5;
  if (lead.last_name) score += 5;
  if (lead.email) score += 5;
  if (lead.phone) score += 5;

  // Additional fields (2.5 points each)
  if (lead.state) score += 2.5;
  if (lead.filing_status) score += 2.5;

  return Math.min(score, 25);
}

/**
 * Calculate engagement score (0-25 points)
 */
function calculateEngagement(lead: TaxIntakeLead): number {
  let score = 0;

  // Email engagement (up to 10 points)
  if (lead.emailOpens > 0) {
    score += Math.min(lead.emailOpens * 2, 10);
  }

  // Email clicks (up to 10 points)
  if (lead.emailClicks > 0) {
    score += Math.min(lead.emailClicks * 3, 10);
  }

  // Recent activity (up to 5 points)
  if (lead.activities && lead.activities.length > 0) {
    const recentActivityCount = lead.activities.filter((activity) => {
      const daysSince =
        (Date.now() - new Date(activity.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    }).length;

    score += Math.min(recentActivityCount, 5);
  }

  return Math.min(score, 25);
}

/**
 * Calculate source quality score (0-20 points)
 */
function calculateSourceQuality(lead: TaxIntakeLead): number {
  // Score based on lead source
  const sourceScores: Record<string, number> = {
    referral: 20, // Highest quality
    website: 15,
    organic: 15,
    paid_search: 12,
    social_media: 10,
    email_campaign: 10,
    direct: 8,
    other: 5,
  };

  const source = lead.source?.toLowerCase() || 'other';

  // Check for exact match or partial match
  for (const [key, value] of Object.entries(sourceScores)) {
    if (source.includes(key)) {
      return value;
    }
  }

  return 5; // Default score
}

/**
 * Calculate timing score (0-15 points)
 */
function calculateTiming(lead: TaxIntakeLead): number {
  let score = 0;

  // Time since creation (fresher leads score higher)
  const hoursSinceCreation =
    (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60);

  if (hoursSinceCreation < 1) {
    score += 15; // Super fresh
  } else if (hoursSinceCreation < 24) {
    score += 12; // Within 24 hours
  } else if (hoursSinceCreation < 72) {
    score += 8; // Within 3 days
  } else if (hoursSinceCreation < 168) {
    score += 4; // Within 1 week
  } else {
    score += 1; // Older leads
  }

  return score;
}

/**
 * Calculate demographics score (0-15 points)
 */
function calculateDemographics(lead: TaxIntakeLead): number {
  let score = 0;

  // Filing status (higher complexity = higher value)
  const filingStatusScores: Record<string, number> = {
    married_filing_jointly: 5,
    head_of_household: 4,
    married_filing_separately: 4,
    single: 3,
    qualifying_widow: 4,
  };

  const filingStatus = lead.filing_status?.toLowerCase();
  if (filingStatus && filingStatusScores[filingStatus]) {
    score += filingStatusScores[filingStatus];
  }

  // Income indicators (if available)
  if (lead.estimated_income || lead.previous_year_agi) {
    const income = lead.estimated_income || lead.previous_year_agi || 0;

    if (income > 150000) {
      score += 10; // High-value client
    } else if (income > 75000) {
      score += 7;
    } else if (income > 40000) {
      score += 4;
    } else {
      score += 2;
    }
  }

  return Math.min(score, 15);
}

/**
 * Determine urgency level based on score and factors
 */
function determineUrgency(score: number, lead: TaxIntakeLead): LeadUrgency {
  // High score always gets priority
  if (score >= 80) {
    return 'URGENT';
  }

  if (score >= 60) {
    return 'HIGH';
  }

  // Check for time-sensitive factors
  const hoursSinceCreation =
    (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60);

  // Very fresh high-engagement leads
  if (hoursSinceCreation < 2 && (lead.emailOpens > 0 || lead.emailClicks > 0)) {
    return 'HIGH';
  }

  if (score >= 40) {
    return 'NORMAL';
  }

  return 'LOW';
}

/**
 * Generate human-readable score explanation
 */
function generateScoreReason(factors: LeadScoreFactors, totalScore: number): string {
  const reasons = [];

  if (factors.profileCompleteness >= 20) {
    reasons.push('Complete profile');
  } else if (factors.profileCompleteness < 10) {
    reasons.push('Incomplete profile');
  }

  if (factors.engagement >= 15) {
    reasons.push('Highly engaged');
  } else if (factors.engagement >= 8) {
    reasons.push('Moderately engaged');
  } else {
    reasons.push('Low engagement');
  }

  if (factors.sourceQuality >= 15) {
    reasons.push('Quality source');
  }

  if (factors.timing >= 10) {
    reasons.push('Recent lead');
  }

  if (factors.demographics >= 10) {
    reasons.push('High-value potential');
  }

  return reasons.join(', ');
}

/**
 * Recalculate scores for all leads
 */
export async function recalculateAllLeadScores() {
  try {
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select('id')
      .eq('convertedToClient', false);

    if (!leads) {
      return { success: true, total: 0, successful: 0, failed: 0 };
    }

    logger.info(`Recalculating scores for ${leads.length} leads`);

    let successful = 0;
    let failed = 0;

    for (const lead of leads as { id: string }[]) {
      try {
        await calculateLeadScore(lead.id);
        successful++;
      } catch (error) {
        logger.error(`Error scoring lead ${lead.id}:`, error);
        failed++;
      }
    }

    logger.info(`Scoring complete: ${successful} successful, ${failed} failed`);

    return {
      success: true,
      total: leads.length,
      successful,
      failed,
    };
  } catch (error) {
    logger.error('Error recalculating all lead scores:', error);
    return { success: false, error: 'Failed to recalculate scores' };
  }
}

/**
 * Get top-scoring leads
 */
export async function getTopLeads(limit: number = 10, preparerId?: string) {
  try {
    let query = db
      .from('tax_intake_leads')
      .select('id, first_name, last_name, email, leadScore, urgency, source, created_at')
      .eq('convertedToClient', false)
      .not('leadScore', 'is', null);

    if (preparerId) {
      query = query.eq('assignedTo', preparerId);
    }

    const { data: leads } = await query
      .order('leadScore', { ascending: false })
      .order('urgency', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    return { success: true, leads: leads || [] };
  } catch (error) {
    logger.error('Error getting top leads:', error);
    return { success: false, error: 'Failed to get top leads' };
  }
}

/**
 * Get lead score distribution
 */
export async function getScoreDistribution() {
  try {
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select('leadScore, urgency')
      .eq('convertedToClient', false)
      .not('leadScore', 'is', null);

    if (!leads) {
      return {
        success: true,
        distribution: {
          hot: 0,
          warm: 0,
          cold: 0,
          urgent: 0,
          high: 0,
          normal: 0,
          low: 0,
        },
      };
    }

    const typedLeads = leads as { leadScore: number; urgency: LeadUrgency }[];

    const distribution = {
      hot: typedLeads.filter((l) => l.leadScore >= 80).length, // 80-100
      warm: typedLeads.filter((l) => l.leadScore >= 60 && l.leadScore < 80).length, // 60-79
      cold: typedLeads.filter((l) => l.leadScore < 60).length, // 0-59
      urgent: typedLeads.filter((l) => l.urgency === 'URGENT').length,
      high: typedLeads.filter((l) => l.urgency === 'HIGH').length,
      normal: typedLeads.filter((l) => l.urgency === 'NORMAL').length,
      low: typedLeads.filter((l) => l.urgency === 'LOW').length,
    };

    return { success: true, distribution };
  } catch (error) {
    logger.error('Error getting score distribution:', error);
    return { success: false, error: 'Failed to get distribution' };
  }
}
