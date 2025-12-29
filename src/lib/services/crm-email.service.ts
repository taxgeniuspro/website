/**
 * CRM Email Service
 *
 * Manages email campaigns, sequences, and activity tracking
 * Integrates with nodemailer for sending emails
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email';

// Local type definitions (replacing @prisma/client)
type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'PAUSED' | 'CANCELLED';
type EmailActivityStatus = 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'BOUNCED' | 'FAILED' | 'UNSUBSCRIBED';
type PipelineStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'DOCUMENTS' | 'FILED' | 'CLOSED' | 'LOST';

interface CampaignRecord {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  plainTextBody?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  replyTo?: string | null;
  segmentRules?: Record<string, unknown> | null;
  status: CampaignStatus;
  scheduledAt?: string | null;
  sentAt?: string | null;
  recipientCount: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EmailActivityRecord {
  id: string;
  contactId: string;
  campaignId?: string | null;
  subject: string;
  emailId?: string | null;
  messageId?: string | null;
  status: EmailActivityStatus;
  sentAt: string;
  openedAt?: string | null;
  clickedAt?: string | null;
  clickedUrls?: { url: string; clickedAt: string }[] | null;
  contact?: ContactBasic | null;
}

interface ContactBasic {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}

interface ContactRecord {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  stage: PipelineStage;
  contactType?: string | null;
  leadScore?: number | null;
}

export interface CreateCampaignInput {
  name: string;
  subject: string;
  htmlBody: string;
  plainTextBody?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  segmentRules?: Record<string, unknown>;
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

      const { data: campaign, error } = await db
        .from('crm_email_campaigns')
        .insert({
          name: data.name,
          subject: data.subject,
          htmlBody: data.htmlBody,
          plainTextBody: data.plainTextBody,
          fromName: data.fromName || 'TaxGeniusPro',
          fromEmail: data.fromEmail || 'noreply@taxgeniuspro.tax',
          replyTo: data.replyTo,
          segmentRules: data.segmentRules,
          status: 'DRAFT' as CampaignStatus,
          createdBy: data.createdBy,
          recipientCount: 0,
          sentCount: 0,
          openedCount: 0,
          clickedCount: 0,
          bouncedCount: 0,
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('[CRMEmailService] Campaign created', { campaignId: campaign?.id });
      return campaign as CampaignRecord;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMEmailService] Error creating campaign', { error: errorMessage });
      throw new Error(`Failed to create campaign: ${errorMessage}`);
    }
  }

  /**
   * Get campaign by ID
   */
  static async getCampaignById(campaignId: string) {
    try {
      const { data: campaignData, error } = await db
        .from('crm_email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .limit(1);

      if (error) throw error;

      const campaign = firstOrNull(campaignData) as CampaignRecord | null;

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Get recent activities with contact info
      const { data: activitiesData } = await db
        .from('crm_email_activities')
        .select('*')
        .eq('campaignId', campaignId)
        .order('sentAt', { ascending: false })
        .limit(10);

      const activities = (activitiesData || []) as EmailActivityRecord[];

      // Get contact info for each activity
      const contactIds = [...new Set(activities.map((a) => a.contactId))];
      if (contactIds.length > 0) {
        const { data: contactsData } = await db
          .from('crm_contacts')
          .select('id, firstName, lastName, email')
          .in('id', contactIds);

        const contactsMap = new Map((contactsData || []).map((c: ContactBasic) => [c.id, c]));

        for (const activity of activities) {
          activity.contact = contactsMap.get(activity.contactId) || null;
        }
      }

      // Get activity count
      const { count: activityCount } = await db
        .from('crm_email_activities')
        .select('id', { count: 'exact', head: true })
        .eq('campaignId', campaignId);

      return {
        ...campaign,
        activities,
        _count: {
          activities: activityCount || 0,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMEmailService] Error getting campaign', { error: errorMessage });
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
      const offset = (page - 1) * limit;

      let query = db
        .from('crm_email_campaigns')
        .select('*')
        .order('createdAt', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.createdBy) {
        query = query.eq('createdBy', filters.createdBy);
      }

      query = query.range(offset, offset + limit - 1);

      const { data: campaignsData, error } = await query;

      if (error) throw error;

      const campaigns = (campaignsData || []) as CampaignRecord[];

      // Get activity counts for each campaign
      const campaignIds = campaigns.map((c) => c.id);
      const campaignsWithCounts = await Promise.all(
        campaigns.map(async (campaign) => {
          const { count } = await db
            .from('crm_email_activities')
            .select('id', { count: 'exact', head: true })
            .eq('campaignId', campaign.id);

          return {
            ...campaign,
            _count: {
              activities: count || 0,
            },
          };
        })
      );

      // Get total count
      let countQuery = db
        .from('crm_email_campaigns')
        .select('id', { count: 'exact', head: true });

      if (filters.status) {
        countQuery = countQuery.eq('status', filters.status);
      }
      if (filters.createdBy) {
        countQuery = countQuery.eq('createdBy', filters.createdBy);
      }

      const { count: total } = await countQuery;

      return {
        campaigns: campaignsWithCounts,
        total: total || 0,
        page,
        limit,
        totalPages: Math.ceil((total || 0) / limit),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMEmailService] Error listing campaigns', { error: errorMessage });
      throw new Error(`Failed to list campaigns: ${errorMessage}`);
    }
  }

  /**
   * Get recipients for campaign based on segment rules
   */
  static async getCampaignRecipients(campaignId: string) {
    try {
      const campaign = await this.getCampaignById(campaignId);

      // Build query based on segment rules
      let query = db
        .from('crm_contacts')
        .select('id, email, firstName, lastName');

      if (campaign.segmentRules) {
        const rules = campaign.segmentRules as Record<string, unknown>;

        if (rules.stages && Array.isArray(rules.stages)) {
          query = query.in('stage', rules.stages as PipelineStage[]);
        }

        if (rules.contactTypes && Array.isArray(rules.contactTypes)) {
          query = query.in('contactType', rules.contactTypes as string[]);
        }

        if (rules.leadScoreMin !== undefined) {
          query = query.gte('leadScore', rules.leadScoreMin as number);
        }

        if (rules.leadScoreMax !== undefined) {
          query = query.lte('leadScore', rules.leadScoreMax as number);
        }

        // Note: Tag filtering would require a separate join query in Supabase
        // For now, we filter tags in memory if needed
      }

      const { data: recipientsData, error } = await query;

      if (error) throw error;

      const recipients = (recipientsData || []) as ContactBasic[];

      // If tags filter is specified, filter in memory
      if (campaign.segmentRules) {
        const rules = campaign.segmentRules as Record<string, unknown>;
        if (rules.tags && Array.isArray(rules.tags)) {
          const tagIds = rules.tags as string[];
          const recipientIds = recipients.map((r) => r.id);

          // Get contacts that have any of the specified tags
          const { data: contactTagsData } = await db
            .from('crm_contact_tags')
            .select('contactId')
            .in('contactId', recipientIds)
            .in('tagId', tagIds);

          const contactsWithTags = new Set((contactTagsData || []).map((ct: { contactId: string }) => ct.contactId));

          return recipients.filter((r) => contactsWithTags.has(r.id));
        }
      }

      return recipients;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMEmailService] Error getting recipients', { error: errorMessage });
      throw new Error(`Failed to get recipients: ${errorMessage}`);
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
      const newStatus: CampaignStatus = input.scheduleAt ? 'SCHEDULED' : 'SENDING';
      await db
        .from('crm_email_campaigns')
        .update({
          status: newStatus,
          scheduledAt: input.scheduleAt?.toISOString(),
          recipientCount: recipients.length,
        })
        .eq('id', input.campaignId);

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
              recipient.firstName || '',
              recipient.lastName || '',
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
              status: 'SENT' as EmailActivityStatus,
            });

            sentCount++;
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('[CRMEmailService] Error sending to recipient', {
              email: recipient.email,
              error: errorMessage,
            });

            // Track failed email
            await this.createEmailActivity({
              contactId: recipient.id,
              campaignId: input.campaignId,
              subject: campaign.subject,
              status: 'FAILED' as EmailActivityStatus,
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
      await db
        .from('crm_email_campaigns')
        .update({
          status: 'SENT' as CampaignStatus,
          sentAt: new Date().toISOString(),
          sentCount,
        })
        .eq('id', input.campaignId);

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMEmailService] Error sending campaign', { error: errorMessage });
      throw new Error(`Failed to send campaign: ${errorMessage}`);
    }
  }

  /**
   * Send individual email via nodemailer
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

      const result = await sendEmail({
        to: email,
        subject: personalizedSubject,
        html: personalizedBody,
        from: `${fromName} <${fromEmail}>`,
      });

      return {
        success: true,
        emailId: result.messageId,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMEmailService] Error sending email', {
        email,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Create email activity record
   */
  static async createEmailActivity(data: CreateEmailActivityInput) {
    try {
      const { data: activity, error } = await db
        .from('crm_email_activities')
        .insert({
          contactId: data.contactId,
          campaignId: data.campaignId,
          subject: data.subject,
          emailId: data.emailId,
          messageId: data.messageId,
          status: data.status || ('SENT' as EmailActivityStatus),
          sentAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return activity as EmailActivityRecord;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMEmailService] Error creating email activity', {
        error: errorMessage,
      });
      throw new Error(`Failed to create email activity: ${errorMessage}`);
    }
  }

  /**
   * Track email open
   */
  static async trackEmailOpen(emailId: string) {
    try {
      const { data: activityData } = await db
        .from('crm_email_activities')
        .select('*')
        .eq('emailId', emailId)
        .limit(1);

      const activity = firstOrNull(activityData) as EmailActivityRecord | null;

      if (!activity) {
        logger.warn('[CRMEmailService] Email activity not found for open tracking', { emailId });
        return;
      }

      // Only update if not already opened
      if (!activity.openedAt) {
        await db
          .from('crm_email_activities')
          .update({
            status: 'OPENED' as EmailActivityStatus,
            openedAt: new Date().toISOString(),
          })
          .eq('emailId', emailId);

        // Update campaign stats (increment openedCount)
        if (activity.campaignId) {
          const { data: campaignData } = await db
            .from('crm_email_campaigns')
            .select('openedCount')
            .eq('id', activity.campaignId)
            .limit(1);

          const campaign = firstOrNull(campaignData) as { openedCount: number } | null;
          if (campaign) {
            await db
              .from('crm_email_campaigns')
              .update({
                openedCount: (campaign.openedCount || 0) + 1,
              })
              .eq('id', activity.campaignId);
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMEmailService] Error tracking email open', { error: errorMessage });
    }
  }

  /**
   * Track email click
   */
  static async trackEmailClick(emailId: string, url: string) {
    try {
      const { data: activityData } = await db
        .from('crm_email_activities')
        .select('*')
        .eq('emailId', emailId)
        .limit(1);

      const activity = firstOrNull(activityData) as EmailActivityRecord | null;

      if (!activity) {
        logger.warn('[CRMEmailService] Email activity not found for click tracking', { emailId });
        return;
      }

      // Add URL to clicked URLs
      const clickedUrls = (activity.clickedUrls as { url: string; clickedAt: string }[]) || [];
      clickedUrls.push({ url, clickedAt: new Date().toISOString() });

      await db
        .from('crm_email_activities')
        .update({
          status: 'CLICKED' as EmailActivityStatus,
          clickedAt: activity.clickedAt || new Date().toISOString(),
          clickedUrls,
        })
        .eq('emailId', emailId);

      // Update campaign stats (only if first click)
      if (activity.campaignId && !activity.clickedAt) {
        const { data: campaignData } = await db
          .from('crm_email_campaigns')
          .select('clickedCount')
          .eq('id', activity.campaignId)
          .limit(1);

        const campaign = firstOrNull(campaignData) as { clickedCount: number } | null;
        if (campaign) {
          await db
            .from('crm_email_campaigns')
            .update({
              clickedCount: (campaign.clickedCount || 0) + 1,
            })
            .eq('id', activity.campaignId);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMEmailService] Error tracking email click', { error: errorMessage });
    }
  }

  /**
   * Get campaign statistics
   */
  static async getCampaignStats(campaignId: string) {
    try {
      const { data: campaignData } = await db
        .from('crm_email_campaigns')
        .select('sentCount, openedCount, clickedCount, bouncedCount')
        .eq('id', campaignId)
        .limit(1);

      const campaign = firstOrNull(campaignData) as {
        sentCount: number;
        openedCount: number;
        clickedCount: number;
        bouncedCount: number;
      } | null;

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMEmailService] Error getting campaign stats', { error: errorMessage });
      throw new Error(`Failed to get campaign stats: ${errorMessage}`);
    }
  }
}
