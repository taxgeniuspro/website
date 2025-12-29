/**
 * CRM Lead Scoring Service
 *
 * Automatically calculates and updates lead scores based on:
 * - Email engagement (opens, clicks)
 * - Interaction frequency
 * - Pipeline stage
 * - Time since last contact
 * - Form submissions
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
type PipelineStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'DOCUMENTS' | 'FILED' | 'CLOSED' | 'LOST';
type EmailActivityStatus = 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'BOUNCED' | 'FAILED' | 'UNSUBSCRIBED';

interface ContactRecord {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  stage: PipelineStage;
  leadScore?: number | null;
  lastContactedAt?: string | null;
  lastScoredAt?: string | null;
}

interface EmailActivityRecord {
  id: string;
  contactId: string;
  status: EmailActivityStatus;
  sentAt: string;
}

interface InteractionRecord {
  id: string;
  contactId: string;
  type: string;
  occurredAt: string;
}

interface LeadScoreRecord {
  id: string;
  contactId: string;
  score: number;
  breakdown?: Record<string, number> | null;
  reason?: string | null;
  changedBy: string;
  createdAt: string;
}

export interface ScoreBreakdown {
  emailEngagement: number; // 0-25 points
  interactions: number; // 0-25 points
  stage: number; // 0-30 points
  recency: number; // 0-20 points
  total: number; // 0-100 points
}

export class CRMLeadScoringService {
  /**
   * Calculate lead score for a contact
   */
  static async calculateLeadScore(contactId: string): Promise<ScoreBreakdown> {
    try {
      // Get contact
      const { data: contactData } = await db
        .from('crm_contacts')
        .select('*')
        .eq('id', contactId)
        .limit(1);

      const contact = firstOrNull(contactData) as ContactRecord | null;

      if (!contact) {
        throw new Error('Contact not found');
      }

      // Get email activities
      const { data: emailActivitiesData } = await db
        .from('crm_email_activities')
        .select('*')
        .eq('contactId', contactId)
        .order('sentAt', { ascending: false })
        .limit(50);

      const emailActivities = (emailActivitiesData || []) as EmailActivityRecord[];

      // Get interactions
      const { data: interactionsData } = await db
        .from('crm_interactions')
        .select('*')
        .eq('contactId', contactId)
        .order('occurredAt', { ascending: false })
        .limit(20);

      const interactions = (interactionsData || []) as InteractionRecord[];

      // Calculate each component
      const emailEngagement = this.calculateEmailEngagementScore(emailActivities);
      const interactionScore = this.calculateInteractionScore(interactions);
      const stage = this.calculateStageScore(contact.stage);
      const recency = this.calculateRecencyScore(contact.lastContactedAt);

      const total = Math.min(100, emailEngagement + interactionScore + stage + recency);

      const breakdown: ScoreBreakdown = {
        emailEngagement,
        interactions: interactionScore,
        stage,
        recency,
        total: Math.round(total),
      };

      logger.info('[CRMLeadScoringService] Lead score calculated', {
        contactId,
        score: breakdown.total,
      });

      return breakdown;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMLeadScoringService] Error calculating score', { error: errorMessage });
      throw new Error(`Failed to calculate lead score: ${errorMessage}`);
    }
  }

  /**
   * Calculate email engagement score (0-25 points)
   */
  private static calculateEmailEngagementScore(emailActivities: EmailActivityRecord[]): number {
    if (!emailActivities || emailActivities.length === 0) return 0;

    const totalEmails = emailActivities.length;
    const openedEmails = emailActivities.filter(
      (e) => e.status === 'OPENED' || e.status === 'CLICKED'
    ).length;
    const clickedEmails = emailActivities.filter((e) => e.status === 'CLICKED').length;

    // Calculate rates
    const openRate = openedEmails / totalEmails;
    const clickRate = clickedEmails / totalEmails;

    // Score calculation
    // Open rate contributes 15 points max
    // Click rate contributes 10 points max
    const openScore = Math.min(15, openRate * 25);
    const clickScore = Math.min(10, clickRate * 50);

    return Math.round(openScore + clickScore);
  }

  /**
   * Calculate interaction score (0-25 points)
   */
  private static calculateInteractionScore(interactions: InteractionRecord[]): number {
    if (!interactions || interactions.length === 0) return 0;

    const interactionCount = interactions.length;

    // Recent interactions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentInteractions = interactions.filter(
      (i) => new Date(i.occurredAt) > thirtyDaysAgo
    ).length;

    // Score based on total and recent interactions
    // 1-3 interactions: 10 points
    // 4-6 interactions: 15 points
    // 7-10 interactions: 20 points
    // 11+ interactions: 25 points

    let baseScore = 0;
    if (interactionCount >= 11) baseScore = 20;
    else if (interactionCount >= 7) baseScore = 15;
    else if (interactionCount >= 4) baseScore = 12;
    else if (interactionCount >= 1) baseScore = 8;

    // Bonus for recent activity (up to 5 points)
    const recencyBonus = Math.min(5, recentInteractions * 1.5);

    return Math.round(Math.min(25, baseScore + recencyBonus));
  }

  /**
   * Calculate stage score (0-30 points)
   */
  private static calculateStageScore(stage: PipelineStage): number {
    const stageScores: Record<PipelineStage, number> = {
      NEW: 5,
      CONTACTED: 10,
      QUALIFIED: 20,
      DOCUMENTS: 25,
      FILED: 30,
      CLOSED: 15, // Lower because they're already converted
      LOST: 0,
    };

    return stageScores[stage] || 0;
  }

  /**
   * Calculate recency score (0-20 points)
   */
  private static calculateRecencyScore(lastContactedAt?: string | null): number {
    if (!lastContactedAt) return 0;

    const now = new Date();
    const lastContact = new Date(lastContactedAt);
    const daysSinceContact = Math.floor(
      (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Score decreases with time
    // 0-7 days: 20 points
    // 8-14 days: 15 points
    // 15-30 days: 10 points
    // 31-60 days: 5 points
    // 61+ days: 0 points

    if (daysSinceContact <= 7) return 20;
    if (daysSinceContact <= 14) return 15;
    if (daysSinceContact <= 30) return 10;
    if (daysSinceContact <= 60) return 5;
    return 0;
  }

  /**
   * Update contact's lead score
   */
  static async updateContactScore(contactId: string, changedBy: string = 'system') {
    try {
      const breakdown = await this.calculateLeadScore(contactId);

      // Update contact
      await db
        .from('crm_contacts')
        .update({
          leadScore: breakdown.total,
          lastScoredAt: new Date().toISOString(),
        })
        .eq('id', contactId);

      // Create score history record
      await db.from('crm_lead_scores').insert({
        contactId,
        score: breakdown.total,
        breakdown,
        changedBy,
        reason: 'Automatic score calculation',
      });

      logger.info('[CRMLeadScoringService] Contact score updated', {
        contactId,
        score: breakdown.total,
      });

      return breakdown;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMLeadScoringService] Error updating score', { error: errorMessage });
      throw new Error(`Failed to update contact score: ${errorMessage}`);
    }
  }

  /**
   * Manually adjust contact score
   */
  static async manualScoreAdjustment(
    contactId: string,
    newScore: number,
    reason: string,
    changedBy: string
  ) {
    try {
      // Validate score range
      if (newScore < 0 || newScore > 100) {
        throw new Error('Score must be between 0 and 100');
      }

      // Update contact
      await db
        .from('crm_contacts')
        .update({
          leadScore: newScore,
          lastScoredAt: new Date().toISOString(),
        })
        .eq('id', contactId);

      // Create score history record
      await db.from('crm_lead_scores').insert({
        contactId,
        score: newScore,
        reason,
        changedBy,
      });

      logger.info('[CRMLeadScoringService] Manual score adjustment', {
        contactId,
        newScore,
        changedBy,
      });

      return { success: true, newScore };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMLeadScoringService] Error adjusting score', { error: errorMessage });
      throw new Error(`Failed to adjust score: ${errorMessage}`);
    }
  }

  /**
   * Batch update scores for all contacts
   */
  static async batchUpdateScores(limit: number = 100) {
    try {
      logger.info('[CRMLeadScoringService] Starting batch score update', { limit });

      // Get contacts that need scoring (not scored recently)
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      // Query for contacts not scored or scored more than 1 hour ago
      // and not in CLOSED or LOST stage
      const { data: contactsWithOldScores } = await db
        .from('crm_contacts')
        .select('id')
        .or(`lastScoredAt.is.null,lastScoredAt.lt.${oneHourAgo.toISOString()}`)
        .not('stage', 'in', '(CLOSED,LOST)')
        .limit(limit);

      const contacts = (contactsWithOldScores || []) as { id: string }[];

      logger.info('[CRMLeadScoringService] Found contacts to score', {
        count: contacts.length,
      });

      let successCount = 0;
      let errorCount = 0;

      for (const contact of contacts) {
        try {
          await this.updateContactScore(contact.id, 'system_batch');
          successCount++;
        } catch (error) {
          errorCount++;
          logger.error('[CRMLeadScoringService] Error scoring contact', {
            contactId: contact.id,
          });
        }

        // Small delay to avoid overwhelming database
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      logger.info('[CRMLeadScoringService] Batch score update complete', {
        total: contacts.length,
        success: successCount,
        errors: errorCount,
      });

      return {
        total: contacts.length,
        success: successCount,
        errors: errorCount,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMLeadScoringService] Error in batch update', { error: errorMessage });
      throw new Error(`Failed to batch update scores: ${errorMessage}`);
    }
  }

  /**
   * Get score history for a contact
   */
  static async getScoreHistory(contactId: string, limit: number = 20) {
    try {
      const { data: history, error } = await db
        .from('crm_lead_scores')
        .select('*')
        .eq('contactId', contactId)
        .order('createdAt', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (history || []) as LeadScoreRecord[];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMLeadScoringService] Error getting score history', {
        error: errorMessage,
      });
      throw new Error(`Failed to get score history: ${errorMessage}`);
    }
  }

  /**
   * Get contacts by score range
   */
  static async getContactsByScoreRange(minScore: number, maxScore: number) {
    try {
      const { data: contacts, error } = await db
        .from('crm_contacts')
        .select('id, firstName, lastName, email, leadScore, stage, lastContactedAt')
        .gte('leadScore', minScore)
        .lte('leadScore', maxScore)
        .order('leadScore', { ascending: false });

      if (error) throw error;

      return (contacts || []) as ContactRecord[];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMLeadScoringService] Error getting contacts by score', {
        error: errorMessage,
      });
      throw new Error(`Failed to get contacts by score: ${errorMessage}`);
    }
  }

  /**
   * Get score insights for all contacts
   */
  static async getScoreInsights() {
    try {
      // Get all active contacts and calculate stats in JavaScript
      const { data: contactsData } = await db
        .from('crm_contacts')
        .select('id, leadScore, stage')
        .not('stage', 'in', '(CLOSED,LOST)');

      const contacts = (contactsData || []) as { id: string; leadScore: number | null; stage: string }[];

      // Calculate average score
      const scoresArray = contacts
        .map((c) => c.leadScore)
        .filter((s): s is number => s !== null);
      const avgScore =
        scoresArray.length > 0
          ? scoresArray.reduce((a, b) => a + b, 0) / scoresArray.length
          : 0;

      // Count by score range
      const total = contacts.length;
      const hotLeads = contacts.filter((c) => (c.leadScore || 0) >= 70).length;
      const warmLeads = contacts.filter((c) => {
        const score = c.leadScore || 0;
        return score >= 40 && score < 70;
      }).length;
      const coldLeads = contacts.filter((c) => (c.leadScore || 0) < 40).length;

      return {
        averageScore: Math.round(avgScore),
        total,
        hotLeads, // 70-100 score
        warmLeads, // 40-69 score
        coldLeads, // 0-39 score
        distribution: {
          hot: total > 0 ? Math.round((hotLeads / total) * 100) : 0,
          warm: total > 0 ? Math.round((warmLeads / total) * 100) : 0,
          cold: total > 0 ? Math.round((coldLeads / total) * 100) : 0,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMLeadScoringService] Error getting insights', { error: errorMessage });
      throw new Error(`Failed to get score insights: ${errorMessage}`);
    }
  }
}
