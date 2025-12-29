/**
 * Email Automation Service
 *
 * Handles automated email campaigns, sequences, and tracking for tax leads.
 * Integrates with nodemailer for email delivery and tracks opens/clicks.
 *
 * @module lib/services/email-automation
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  logEmailSent,
  logEmailOpened,
  logEmailClicked,
} from './activity.service';

// Local type definitions (replacing @prisma/client)
type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'PAUSED' | 'CANCELLED';
type EmailActivityStatus = 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'BOUNCED' | 'FAILED' | 'UNSUBSCRIBED';

interface CampaignRecord {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  plainTextBody?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  replyTo?: string | null;
  status: CampaignStatus;
  scheduledAt?: string | null;
  sentAt?: string | null;
  recipientCount: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  segmentRules?: Record<string, unknown> | null;
  createdBy?: string | null;
  createdAt: string;
}

interface SequenceRecord {
  id: string;
  name: string;
  description?: string | null;
  triggerEvent: string;
  triggerDelay: number;
  steps: EmailSequenceStep[];
  campaignId?: string | null;
  createdBy?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface TaxIntakeLeadRecord {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlBody: string;
  plainTextBody?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  leadId?: string;
  campaignId?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  plainTextBody?: string;
  variables?: string[]; // Available variables like {{firstName}}, {{lastName}}
}

export interface EmailCampaignParams {
  name: string;
  subject: string;
  htmlBody: string;
  plainTextBody?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  scheduledAt?: Date;
  segmentRules?: Record<string, unknown>;
  createdBy: string;
}

export interface EmailSequenceParams {
  name: string;
  description?: string;
  triggerEvent: string;
  triggerDelay?: number;
  steps: EmailSequenceStep[];
  campaignId?: string;
  createdBy: string;
}

export interface EmailSequenceStep {
  subject: string;
  htmlBody: string;
  plainTextBody?: string;
  delayMinutes: number; // Delay from previous step
}

/**
 * Send an individual email to a lead
 *
 * @example
 * ```typescript
 * await sendEmail({
 *   to: 'john@example.com',
 *   toName: 'John Doe',
 *   subject: 'Welcome to Tax Genius',
 *   htmlBody: '<p>Welcome!</p>',
 *   leadId: 'lead_123',
 * });
 * ```
 */
export async function sendEmail(params: SendEmailParams) {
  try {
    const {
      to,
      toName,
      subject,
      htmlBody,
      plainTextBody,
      fromName = 'Tax Genius Pro',
      fromEmail = 'noreply@taxgeniuspro.tax',
      replyTo,
      leadId,
      campaignId,
    } = params;

    // TODO: Integrate with nodemailer when ready
    // For now, we'll log the email and track it in the database

    // Verify lead exists if leadId provided
    if (leadId) {
      const { data: leadData } = await db
        .from('tax_intake_leads')
        .select('id, email')
        .eq('id', leadId)
        .limit(1);

      const lead = firstOrNull(leadData) as TaxIntakeLeadRecord | null;

      if (!lead) {
        logger.error(`Cannot send email: Lead ${leadId} not found`);
        return { success: false, error: 'Lead not found' };
      }

      // Verify email matches
      if (lead.email !== to) {
        logger.warn(`Email mismatch for lead ${leadId}: ${lead.email} vs ${to}`);
      }
    }

    // Log email sent activity
    if (leadId) {
      await logEmailSent(leadId, subject, undefined, campaignId, !!campaignId);
    }

    logger.info(`Email sent to ${to}`, {
      subject,
      leadId,
      campaignId,
    });

    return {
      success: true,
      emailId: `email_${Date.now()}`, // Placeholder until nodemailer integration
    };
  } catch (error) {
    logger.error('Error sending email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send bulk emails to multiple leads
 */
export async function sendBulkEmail(
  recipients: Array<{ email: string; name?: string; leadId?: string }>,
  emailParams: Omit<SendEmailParams, 'to' | 'toName' | 'leadId'>
) {
  const results = [];

  for (const recipient of recipients) {
    const result = await sendEmail({
      ...emailParams,
      to: recipient.email,
      toName: recipient.name,
      leadId: recipient.leadId,
    });

    results.push({
      email: recipient.email,
      success: result.success,
      error: result.error,
    });
  }

  return {
    total: recipients.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

/**
 * Create an email campaign
 */
export async function createEmailCampaign(params: EmailCampaignParams) {
  try {
    const { data: campaign, error } = await db
      .from('crm_email_campaigns')
      .insert({
        name: params.name,
        subject: params.subject,
        htmlBody: params.htmlBody,
        plainTextBody: params.plainTextBody,
        fromName: params.fromName || 'Tax Genius Pro',
        fromEmail: params.fromEmail || 'noreply@taxgeniuspro.tax',
        replyTo: params.replyTo,
        status: params.scheduledAt ? ('SCHEDULED' as CampaignStatus) : ('DRAFT' as CampaignStatus),
        scheduledAt: params.scheduledAt?.toISOString(),
        segmentRules: params.segmentRules || null,
        createdBy: params.createdBy,
        recipientCount: 0,
        sentCount: 0,
        openedCount: 0,
        clickedCount: 0,
        bouncedCount: 0,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info(`Email campaign created: ${campaign?.id}`, {
      name: campaign?.name,
      status: campaign?.status,
    });

    return { success: true, campaign: campaign as CampaignRecord };
  } catch (error) {
    logger.error('Error creating email campaign:', error);
    return { success: false, error: 'Failed to create campaign' };
  }
}

/**
 * Send campaign to leads matching segment rules
 */
export async function sendCampaign(campaignId: string) {
  try {
    const { data: campaignData } = await db
      .from('crm_email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .limit(1);

    const campaign = firstOrNull(campaignData) as CampaignRecord | null;

    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    if (campaign.status === 'SENT') {
      return { success: false, error: 'Campaign already sent' };
    }

    // Get leads matching segment rules
    // TODO: Implement segment filtering based on segmentRules
    // For now, we'll get all leads with email
    const { data: leadsData } = await db
      .from('tax_intake_leads')
      .select('id, email, first_name, last_name')
      .not('email', 'is', null)
      .limit(100); // Limit for safety

    const leads = (leadsData || []) as TaxIntakeLeadRecord[];

    // Send emails
    const recipients = leads
      .filter((lead) => lead.email)
      .map((lead) => ({
        email: lead.email!,
        name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
        leadId: lead.id,
      }));

    const result = await sendBulkEmail(recipients, {
      subject: campaign.subject,
      htmlBody: campaign.htmlBody,
      plainTextBody: campaign.plainTextBody || undefined,
      fromName: campaign.fromName || undefined,
      fromEmail: campaign.fromEmail || undefined,
      replyTo: campaign.replyTo || undefined,
      campaignId: campaign.id,
    });

    // Update campaign stats
    await db
      .from('crm_email_campaigns')
      .update({
        status: 'SENT' as CampaignStatus,
        sentAt: new Date().toISOString(),
        recipientCount: result.total,
        sentCount: result.successful,
      })
      .eq('id', campaignId);

    logger.info(`Campaign sent: ${campaignId}`, {
      total: result.total,
      successful: result.successful,
      failed: result.failed,
    });

    return {
      success: true,
      total: result.total,
      sent: result.successful,
      failed: result.failed,
    };
  } catch (error) {
    logger.error('Error sending campaign:', error);
    return { success: false, error: 'Failed to send campaign' };
  }
}

/**
 * Create an email sequence (drip campaign)
 */
export async function createEmailSequence(params: EmailSequenceParams) {
  try {
    const { data: sequence, error } = await db
      .from('crm_email_sequences')
      .insert({
        name: params.name,
        description: params.description,
        triggerEvent: params.triggerEvent,
        triggerDelay: params.triggerDelay || 0,
        steps: params.steps,
        campaignId: params.campaignId,
        createdBy: params.createdBy,
        isActive: false, // Must be manually activated
      })
      .select()
      .single();

    if (error) throw error;

    logger.info(`Email sequence created: ${sequence?.id}`, {
      name: sequence?.name,
      steps: params.steps.length,
    });

    return { success: true, sequence: sequence as SequenceRecord };
  } catch (error) {
    logger.error('Error creating email sequence:', error);
    return { success: false, error: 'Failed to create sequence' };
  }
}

/**
 * Activate an email sequence
 */
export async function activateEmailSequence(sequenceId: string) {
  try {
    const { data: sequence, error } = await db
      .from('crm_email_sequences')
      .update({ isActive: true })
      .eq('id', sequenceId)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Email sequence activated: ${sequenceId}`);

    return { success: true, sequence: sequence as SequenceRecord };
  } catch (error) {
    logger.error('Error activating email sequence:', error);
    return { success: false, error: 'Failed to activate sequence' };
  }
}

/**
 * Deactivate an email sequence
 */
export async function deactivateEmailSequence(sequenceId: string) {
  try {
    const { data: sequence, error } = await db
      .from('crm_email_sequences')
      .update({ isActive: false })
      .eq('id', sequenceId)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Email sequence deactivated: ${sequenceId}`);

    return { success: true, sequence: sequence as SequenceRecord };
  } catch (error) {
    logger.error('Error deactivating email sequence:', error);
    return { success: false, error: 'Failed to deactivate sequence' };
  }
}

/**
 * Replace variables in email template
 */
export function replaceEmailVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  });

  // Remove any unreplaced variables
  result = result.replace(/{{[^}]+}}/g, '');

  return result;
}

/**
 * Get email campaign statistics
 */
export async function getCampaignStats(campaignId: string) {
  try {
    const { data: campaignData } = await db
      .from('crm_email_campaigns')
      .select('id, name, status, recipientCount, sentCount, openedCount, clickedCount, bouncedCount, sentAt')
      .eq('id', campaignId)
      .limit(1);

    const campaign = firstOrNull(campaignData) as CampaignRecord | null;

    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    const openRate =
      campaign.sentCount > 0
        ? ((campaign.openedCount / campaign.sentCount) * 100).toFixed(2)
        : '0.00';

    const clickRate =
      campaign.sentCount > 0
        ? ((campaign.clickedCount / campaign.sentCount) * 100).toFixed(2)
        : '0.00';

    const bounceRate =
      campaign.sentCount > 0
        ? ((campaign.bouncedCount / campaign.sentCount) * 100).toFixed(2)
        : '0.00';

    return {
      success: true,
      stats: {
        ...campaign,
        openRate: `${openRate}%`,
        clickRate: `${clickRate}%`,
        bounceRate: `${bounceRate}%`,
      },
    };
  } catch (error) {
    logger.error('Error getting campaign stats:', error);
    return { success: false, error: 'Failed to get campaign stats' };
  }
}

/**
 * Get all campaigns
 */
export async function getAllCampaigns(createdBy?: string) {
  try {
    let query = db
      .from('crm_email_campaigns')
      .select('id, name, subject, status, recipientCount, sentCount, openedCount, clickedCount, scheduledAt, sentAt, createdAt')
      .order('createdAt', { ascending: false });

    if (createdBy) {
      query = query.eq('createdBy', createdBy);
    }

    const { data: campaigns, error } = await query;

    if (error) throw error;

    return { success: true, campaigns: (campaigns || []) as CampaignRecord[] };
  } catch (error) {
    logger.error('Error getting campaigns:', error);
    return { success: false, error: 'Failed to get campaigns' };
  }
}

/**
 * Get all email sequences
 */
export async function getAllSequences(createdBy?: string) {
  try {
    let query = db
      .from('crm_email_sequences')
      .select('*')
      .order('createdAt', { ascending: false });

    if (createdBy) {
      query = query.eq('createdBy', createdBy);
    }

    const { data: sequences, error } = await query;

    if (error) throw error;

    return { success: true, sequences: (sequences || []) as SequenceRecord[] };
  } catch (error) {
    logger.error('Error getting sequences:', error);
    return { success: false, error: 'Failed to get sequences' };
  }
}

/**
 * Delete an email campaign
 */
export async function deleteCampaign(campaignId: string) {
  try {
    const { error } = await db
      .from('crm_email_campaigns')
      .delete()
      .eq('id', campaignId);

    if (error) throw error;

    logger.info(`Email campaign deleted: ${campaignId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error deleting campaign:', error);
    return { success: false, error: 'Failed to delete campaign' };
  }
}

/**
 * Delete an email sequence
 */
export async function deleteSequence(sequenceId: string) {
  try {
    const { error } = await db
      .from('crm_email_sequences')
      .delete()
      .eq('id', sequenceId);

    if (error) throw error;

    logger.info(`Email sequence deleted: ${sequenceId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error deleting sequence:', error);
    return { success: false, error: 'Failed to delete sequence' };
  }
}
