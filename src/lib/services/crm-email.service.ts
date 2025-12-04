/**
 * CRM Email Service
 *
 * Manages email campaigns, sequences, and activity tracking
 * Integrates with Resend API for sending emails
 */

import { prisma } from '@/lib/prisma';
import { CampaignStatus, EmailActivityStatus, PipelineStage, type Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface CreateCampaignInput {
  name: string;
  subject: string;
  htmlBody: string;
  plainTextBody?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  segmentRules?: Prisma.JsonValue; // JSON rules for targeting
  createdBy?: string;
}

export interface SendCampaignInput {
  campaignId: string;
  scheduleAt?: Date;
  testMode?: boolean;
  testEmail?: string;
}

export interface CreateEmailActivityInput {
  contactId: string;
  campaignId?: string;
  subject: string;
  emailId?: string;
  messageId?: string;
  status?: EmailActivityStatus;
}

export class CRMEmailService {
  /**
   * Create email campaign
   */
  static async createCampaign(data: CreateCampaignInput) {
    try {
      logger.info('[CRMEmailService] Creating campaign', { name: data.name });

      const campaign = await prisma.cRMEmailCampaign.create({
        data: {
          name: data.name,
          subject: data.subject,
          htmlBody: data.htmlBody,
          plainTextBody: data.plainTextBody,
          fromName: data.fromName || 'TaxGeniusPro',
          fromEmail: data.fromEmail || 'noreply@taxgeniuspro.tax',
          replyTo: data.replyTo,
          segmentRules: data.segmentRules,
          status: CampaignStatus.DRAFT,
          createdBy: data.createdBy,
        },
      });

      logger.info('[CRMEmailService] Campaign created', { campaignId: campaign.id });
      return campaign;
    } catch (error: unknown) {
      logger.error('[CRMEmailService] Error creating campaign', { error: error.message });
      throw new Error(`Failed to create campaign: ${error.message}`);
    }
  }

  /**
   * Get campaign by ID
   */
  static async getCampaignById(campaignId: string) {
    try {
      const campaign = await prisma.cRMEmailCampaign.findUnique({
        where: { id: campaignId },
        include: {
          activities: {
            take: 10,
            orderBy: { sentAt: 'desc' },
            include: {
              contact: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              activities: true,
            },
          },
        },
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      return campaign;
    } catch (error: unknown) {
      logger.error('[CRMEmailService] Error getting campaign', { error: error.message });
      throw error;
    }
  }

  /**
   * List campaigns
   */
  static async listCampaigns(
    filters: { status?: CampaignStatus; createdBy?: string } = {},
    pagination: { page?: number; limit?: number } = {}
  ) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;

      const where: Prisma.CRMEmailCampaignWhereInput = {};
      if (filters.status) where.status = filters.status;
      if (filters.createdBy) where.createdBy = filters.createdBy;

      const [campaigns, total] = await Promise.all([
        prisma.cRMEmailCampaign.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                activities: true,
              },
            },
          },
        }),
        prisma.cRMEmailCampaign.count({ where }),
      ]);

      return {
        campaigns,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: unknown) {
      logger.error('[CRMEmailService] Error listing campaigns', { error: error.message });
      throw new Error(`Failed to list campaigns: ${error.message}`);
    }
  }

  /**
   * Get recipients for campaign based on segment rules
   */
  static async getCampaignRecipients(campaignId: string) {
    try {
      const campaign = await this.getCampaignById(campaignId);

      // Build where clause from segment rules
      const where: Prisma.CRMContactWhereInput = {};

      if (campaign.segmentRules) {
        const rules = campaign.segmentRules as any;

        if (rules.stages && Array.isArray(rules.stages)) {
          where.stage = { in: rules.stages as PipelineStage[] };
        }

        if (rules.contactTypes && Array.isArray(rules.contactTypes)) {
          where.contactType = { in: rules.contactTypes };
        }

        if (rules.tags && Array.isArray(rules.tags)) {
          where.tags = {
            some: {
              tagId: { in: rules.tags },
            },
          };
        }

        if (rules.leadScoreMin !== undefined) {
          where.leadScore = { gte: rules.leadScoreMin };
        }

        if (rules.leadScoreMax !== undefined) {
          where.leadScore = { ...where.leadScore, lte: rules.leadScoreMax };
        }
      }

      const recipients = await prisma.cRMContact.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      return recipients;
    } catch (error: unknown) {
      logger.error('[CRMEmailService] Error getting recipients', { error: error.message });
      throw new Error(`Failed to get recipients: ${error.message}`);
    }
  }

  /**
   * Send campaign to recipients
   */
  static async sendCampaign(input: SendCampaignInput) {
    try {
      const campaign = await this.getCampaignById(input.campaignId);

      // Test mode - send to single email
      if (input.testMode && input.testEmail) {
        const result = await this.sendEmailToContact(
          input.testEmail,
          'Test',
          'User',
          campaign.subject,
          campaign.htmlBody,
          campaign.fromName!,
          campaign.fromEmail!
        );

        return { success: true, testEmailId: result.emailId };
      }

      // Get recipients
      const recipients = await this.getCampaignRecipients(input.campaignId);

      logger.info('[CRMEmailService] Sending campaign', {
        campaignId: input.campaignId,
        recipientCount: recipients.length,
      });

      // Update campaign status
      await prisma.cRMEmailCampaign.update({
        where: { id: input.campaignId },
        data: {
          status: input.scheduleAt ? CampaignStatus.SCHEDULED : CampaignStatus.SENDING,
          scheduledAt: input.scheduleAt,
          recipientCount: recipients.length,
        },
      });

      // If scheduled, return early (would need cron job to send later)
      if (input.scheduleAt) {
        return {
          success: true,
          scheduled: true,
          scheduledAt: input.scheduleAt,
          recipientCount: recipients.length,
        };
      }

      // Send emails in batches
      let sentCount = 0;
      const batchSize = 10;

      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);

        const sendPromises = batch.map(async (recipient) => {
          try {
            const result = await this.sendEmailToContact(
              recipient.email,
              recipient.firstName,
              recipient.lastName,
              campaign.subject,
              campaign.htmlBody,
              campaign.fromName!,
              campaign.fromEmail!
            );

            // Track email activity
            await this.createEmailActivity({
              contactId: recipient.id,
              campaignId: input.campaignId,
              subject: campaign.subject,
              emailId: result.emailId,
              status: EmailActivityStatus.SENT,
            });

            sentCount++;
          } catch (error: unknown) {
            logger.error('[CRMEmailService] Error sending to recipient', {
              email: recipient.email,
              error: error.message,
            });

            // Track failed email
            await this.createEmailActivity({
              contactId: recipient.id,
              campaignId: input.campaignId,
              subject: campaign.subject,
              status: EmailActivityStatus.FAILED,
            });
          }
        });

        await Promise.all(sendPromises);

        // Small delay between batches to avoid rate limits
        if (i + batchSize < recipients.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // Update campaign with final stats
      await prisma.cRMEmailCampaign.update({
        where: { id: input.campaignId },
        data: {
          status: CampaignStatus.SENT,
          sentAt: new Date(),
          sentCount,
        },
      });

      logger.info('[CRMEmailService] Campaign sent', {
        campaignId: input.campaignId,
        sentCount,
      });

      return {
        success: true,
        sentCount,
        recipientCount: recipients.length,
      };
    } catch (error: unknown) {
      logger.error('[CRMEmailService] Error sending campaign', { error: error.message });
      throw new Error(`Failed to send campaign: ${error.message}`);
    }
  }

  /**
   * Send individual email via Resend
   */
  private static async sendEmailToContact(
    email: string,
    firstName: string,
    lastName: string,
    subject: string,
    htmlBody: string,
    fromName: string,
    fromEmail: string
  ) {
    try {
      // Replace personalization tokens
      const personalizedBody = htmlBody
        .replace(/{{firstName}}/g, firstName)
        .replace(/{{lastName}}/g, lastName)
        .replace(/{{fullName}}/g, `${firstName} ${lastName}`);

      const personalizedSubject = subject
        .replace(/{{firstName}}/g, firstName)
        .replace(/{{lastName}}/g, lastName);

      const result = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject: personalizedSubject,
        html: personalizedBody,
      });

      return {
        success: true,
        emailId: result.data?.id,
      };
    } catch (error: unknown) {
      logger.error('[CRMEmailService] Error sending email', {
        email,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create email activity record
   */
  static async createEmailActivity(data: CreateEmailActivityInput) {
    try {
      const activity = await prisma.cRMEmailActivity.create({
        data: {
          contactId: data.contactId,
          campaignId: data.campaignId,
          subject: data.subject,
          emailId: data.emailId,
          messageId: data.messageId,
          status: data.status || EmailActivityStatus.SENT,
        },
      });

      return activity;
    } catch (error: unknown) {
      logger.error('[CRMEmailService] Error creating email activity', {
        error: error.message,
      });
      throw new Error(`Failed to create email activity: ${error.message}`);
    }
  }

  /**
   * Track email open
   */
  static async trackEmailOpen(emailId: string) {
    try {
      const activity = await prisma.cRMEmailActivity.findUnique({
        where: { emailId },
      });

      if (!activity) {
        logger.warn('[CRMEmailService] Email activity not found for open tracking', { emailId });
        return;
      }

      // Only update if not already opened
      if (!activity.openedAt) {
        await prisma.cRMEmailActivity.update({
          where: { emailId },
          data: {
            status: EmailActivityStatus.OPENED,
            openedAt: new Date(),
          },
        });

        // Update campaign stats
        if (activity.campaignId) {
          await prisma.cRMEmailCampaign.update({
            where: { id: activity.campaignId },
            data: {
              openedCount: { increment: 1 },
            },
          });
        }
      }
    } catch (error: unknown) {
      logger.error('[CRMEmailService] Error tracking email open', { error: error.message });
    }
  }

  /**
   * Track email click
   */
  static async trackEmailClick(emailId: string, url: string) {
    try {
      const activity = await prisma.cRMEmailActivity.findUnique({
        where: { emailId },
      });

      if (!activity) {
        logger.warn('[CRMEmailService] Email activity not found for click tracking', { emailId });
        return;
      }

      // Add URL to clicked URLs
      const clickedUrls = (activity.clickedUrls as any[]) || [];
      clickedUrls.push({ url, clickedAt: new Date() });

      await prisma.cRMEmailActivity.update({
        where: { emailId },
        data: {
          status: EmailActivityStatus.CLICKED,
          clickedAt: activity.clickedAt || new Date(),
          clickedUrls,
        },
      });

      // Update campaign stats
      if (activity.campaignId && !activity.clickedAt) {
        await prisma.cRMEmailCampaign.update({
          where: { id: activity.campaignId },
          data: {
            clickedCount: { increment: 1 },
          },
        });
      }
    } catch (error: unknown) {
      logger.error('[CRMEmailService] Error tracking email click', { error: error.message });
    }
  }

  /**
   * Get campaign statistics
   */
  static async getCampaignStats(campaignId: string) {
    try {
      const campaign = await prisma.cRMEmailCampaign.findUnique({
        where: { id: campaignId },
        select: {
          sentCount: true,
          openedCount: true,
          clickedCount: true,
          bouncedCount: true,
        },
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const openRate =
        campaign.sentCount > 0 ? (campaign.openedCount / campaign.sentCount) * 100 : 0;
      const clickRate =
        campaign.sentCount > 0 ? (campaign.clickedCount / campaign.sentCount) * 100 : 0;
      const bounceRate =
        campaign.sentCount > 0 ? (campaign.bouncedCount / campaign.sentCount) * 100 : 0;

      return {
        ...campaign,
        openRate: Math.round(openRate * 10) / 10,
        clickRate: Math.round(clickRate * 10) / 10,
        bounceRate: Math.round(bounceRate * 10) / 10,
        clickToOpenRate:
          campaign.openedCount > 0
            ? Math.round(((campaign.clickedCount / campaign.openedCount) * 100 * 10) / 10)
            : 0,
      };
    } catch (error: unknown) {
      logger.error('[CRMEmailService] Error getting campaign stats', { error: error.message });
      throw new Error(`Failed to get campaign stats: ${error.message}`);
    }
  }
}
