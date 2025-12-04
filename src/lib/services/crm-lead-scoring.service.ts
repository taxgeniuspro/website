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

import { prisma } from '@/lib/prisma';
import {
  PipelineStage,
  EmailActivityStatus,
  type Prisma,
  type CRMEmailActivity,
  type CRMInteraction,
} from '@prisma/client';
import { logger } from '@/lib/logger';

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
      const contact = await prisma.cRMContact.findUnique({
        where: { id: contactId },
        include: {
          emailActivities: {
            orderBy: { sentAt: 'desc' },
            take: 50, // Last 50 emails
          },
          interactions: {
            orderBy: { occurredAt: 'desc' },
            take: 20, // Last 20 interactions
          },
        },
      });

      if (!contact) {
        throw new Error('Contact not found');
      }

      // Calculate each component
      const emailEngagement = this.calculateEmailEngagementScore(contact.emailActivities);
      const interactions = this.calculateInteractionScore(contact.interactions);
      const stage = this.calculateStageScore(contact.stage);
      const recency = this.calculateRecencyScore(contact.lastContactedAt);

      const total = Math.min(100, emailEngagement + interactions + stage + recency);

      const breakdown: ScoreBreakdown = {
        emailEngagement,
        interactions,
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
      logger.error('[CRMLeadScoringService] Error calculating score', { error: error.message });
      throw new Error(`Failed to calculate lead score: ${error.message}`);
    }
  }

  /**
   * Calculate email engagement score (0-25 points)
   */
  private static calculateEmailEngagementScore(emailActivities: CRMEmailActivity[]): number {
    if (!emailActivities || emailActivities.length === 0) return 0;

    const totalEmails = emailActivities.length;
    const openedEmails = emailActivities.filter(
      (e) => e.status === EmailActivityStatus.OPENED || e.status === EmailActivityStatus.CLICKED
    ).length;
    const clickedEmails = emailActivities.filter(
      (e) => e.status === EmailActivityStatus.CLICKED
    ).length;

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
  private static calculateInteractionScore(interactions: CRMInteraction[]): number {
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
      [PipelineStage.NEW]: 5,
      [PipelineStage.CONTACTED]: 10,
      [PipelineStage.QUALIFIED]: 20,
      [PipelineStage.DOCUMENTS]: 25,
      [PipelineStage.FILED]: 30,
      [PipelineStage.CLOSED]: 15, // Lower because they're already converted
      [PipelineStage.LOST]: 0,
    };

    return stageScores[stage] || 0;
  }

  /**
   * Calculate recency score (0-20 points)
   */
  private static calculateRecencyScore(lastContactedAt?: Date | null): number {
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
      await prisma.cRMContact.update({
        where: { id: contactId },
        data: {
          leadScore: breakdown.total,
          lastScoredAt: new Date(),
        },
      });

      // Create score history record
      await prisma.cRMLeadScore.create({
        data: {
          contactId,
          score: breakdown.total,
          breakdown,
          changedBy,
          reason: 'Automatic score calculation',
        },
      });

      logger.info('[CRMLeadScoringService] Contact score updated', {
        contactId,
        score: breakdown.total,
      });

      return breakdown;
    } catch (error: unknown) {
      logger.error('[CRMLeadScoringService] Error updating score', { error: error.message });
      throw new Error(`Failed to update contact score: ${error.message}`);
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
      await prisma.cRMContact.update({
        where: { id: contactId },
        data: {
          leadScore: newScore,
          lastScoredAt: new Date(),
        },
      });

      // Create score history record
      await prisma.cRMLeadScore.create({
        data: {
          contactId,
          score: newScore,
          reason,
          changedBy,
        },
      });

      logger.info('[CRMLeadScoringService] Manual score adjustment', {
        contactId,
        newScore,
        changedBy,
      });

      return { success: true, newScore };
    } catch (error: unknown) {
      logger.error('[CRMLeadScoringService] Error adjusting score', { error: error.message });
      throw new Error(`Failed to adjust score: ${error.message}`);
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

      const contacts = await prisma.cRMContact.findMany({
        where: {
          OR: [{ lastScoredAt: null }, { lastScoredAt: { lt: oneHourAgo } }],
          stage: {
            notIn: [PipelineStage.CLOSED, PipelineStage.LOST],
          },
        },
        take: limit,
        select: {
          id: true,
        },
      });

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
      logger.error('[CRMLeadScoringService] Error in batch update', { error: error.message });
      throw new Error(`Failed to batch update scores: ${error.message}`);
    }
  }

  /**
   * Get score history for a contact
   */
  static async getScoreHistory(contactId: string, limit: number = 20) {
    try {
      const history = await prisma.cRMLeadScore.findMany({
        where: { contactId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return history;
    } catch (error: unknown) {
      logger.error('[CRMLeadScoringService] Error getting score history', {
        error: error.message,
      });
      throw new Error(`Failed to get score history: ${error.message}`);
    }
  }

  /**
   * Get contacts by score range
   */
  static async getContactsByScoreRange(minScore: number, maxScore: number) {
    try {
      const contacts = await prisma.cRMContact.findMany({
        where: {
          leadScore: {
            gte: minScore,
            lte: maxScore,
          },
        },
        orderBy: { leadScore: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          leadScore: true,
          stage: true,
          lastContactedAt: true,
        },
      });

      return contacts;
    } catch (error: unknown) {
      logger.error('[CRMLeadScoringService] Error getting contacts by score', {
        error: error.message,
      });
      throw new Error(`Failed to get contacts by score: ${error.message}`);
    }
  }

  /**
   * Get score insights for all contacts
   */
  static async getScoreInsights() {
    try {
      const [avgScore, hotLeads, warmLeads, coldLeads, total] = await Promise.all([
        prisma.cRMContact.aggregate({
          _avg: { leadScore: true },
          where: {
            stage: { notIn: [PipelineStage.CLOSED, PipelineStage.LOST] },
          },
        }),
        prisma.cRMContact.count({
          where: {
            leadScore: { gte: 70 },
            stage: { notIn: [PipelineStage.CLOSED, PipelineStage.LOST] },
          },
        }),
        prisma.cRMContact.count({
          where: {
            leadScore: { gte: 40, lt: 70 },
            stage: { notIn: [PipelineStage.CLOSED, PipelineStage.LOST] },
          },
        }),
        prisma.cRMContact.count({
          where: {
            leadScore: { lt: 40 },
            stage: { notIn: [PipelineStage.CLOSED, PipelineStage.LOST] },
          },
        }),
        prisma.cRMContact.count({
          where: {
            stage: { notIn: [PipelineStage.CLOSED, PipelineStage.LOST] },
          },
        }),
      ]);

      return {
        averageScore: Math.round(avgScore._avg.leadScore || 0),
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
      logger.error('[CRMLeadScoringService] Error getting insights', { error: error.message });
      throw new Error(`Failed to get score insights: ${error.message}`);
    }
  }
}
