/**
 * Email Automation Service
 *
 * Handles automated email campaigns, sequences, and tracking for tax leads.
 * Integrates with Resend for email delivery and tracks opens/clicks.
 *
 * @module lib/services/email-automation
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { CampaignStatus, EmailActivityStatus } from '@prisma/client';
import {
  logEmailSent,
  logEmailOpened,
  logEmailClicked,
} from './activity.service';

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
  segmentRules?: Record<string, any>;
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

    // TODO: Integrate with Resend API when ready
    // For now, we'll log the email and track it in the database

    // Verify lead exists if leadId provided
    if (leadId) {
      const lead = await prisma.taxIntakeLead.findUnique({
        where: { id: leadId },
        select: { id: true, email: true },
      });

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
      emailId: `email_${Date.now()}`, // Placeholder until Resend integration
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
    const campaign = await prisma.cRMEmailCampaign.create({
      data: {
        name: params.name,
        subject: params.subject,
        htmlBody: params.htmlBody,
        plainTextBody: params.plainTextBody,
        fromName: params.fromName || 'Tax Genius Pro',
        fromEmail: params.fromEmail || 'noreply@taxgeniuspro.tax',
        replyTo: params.replyTo,
        status: params.scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT,
        scheduledAt: params.scheduledAt,
        segmentRules: params.segmentRules || null,
        createdBy: params.createdBy,
      },
    });

    logger.info(`Email campaign created: ${campaign.id}`, {
      name: campaign.name,
      status: campaign.status,
    });

    return { success: true, campaign };
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
    const campaign = await prisma.cRMEmailCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    if (campaign.status === CampaignStatus.SENT) {
      return { success: false, error: 'Campaign already sent' };
    }

    // Get leads matching segment rules
    // TODO: Implement segment filtering based on segmentRules
    // For now, we'll get all leads
    const leads = await prisma.taxIntakeLead.findMany({
      where: {
        email: { not: null },
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
      },
      take: 100, // Limit for safety
    });

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
      plainTextBody: campaign.plainTextBody,
      fromName: campaign.fromName || undefined,
      fromEmail: campaign.fromEmail || undefined,
      replyTo: campaign.replyTo || undefined,
      campaignId: campaign.id,
    });

    // Update campaign stats
    await prisma.cRMEmailCampaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.SENT,
        sentAt: new Date(),
        recipientCount: result.total,
        sentCount: result.successful,
      },
    });

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
    const sequence = await prisma.cRMEmailSequence.create({
      data: {
        name: params.name,
        description: params.description,
        triggerEvent: params.triggerEvent,
        triggerDelay: params.triggerDelay || 0,
        steps: params.steps,
        campaignId: params.campaignId,
        createdBy: params.createdBy,
        isActive: false, // Must be manually activated
      },
    });

    logger.info(`Email sequence created: ${sequence.id}`, {
      name: sequence.name,
      steps: params.steps.length,
    });

    return { success: true, sequence };
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
    const sequence = await prisma.cRMEmailSequence.update({
      where: { id: sequenceId },
      data: { isActive: true },
    });

    logger.info(`Email sequence activated: ${sequenceId}`);

    return { success: true, sequence };
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
    const sequence = await prisma.cRMEmailSequence.update({
      where: { id: sequenceId },
      data: { isActive: false },
    });

    logger.info(`Email sequence deactivated: ${sequenceId}`);

    return { success: true, sequence };
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
    const campaign = await prisma.cRMEmailCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        name: true,
        status: true,
        recipientCount: true,
        sentCount: true,
        openedCount: true,
        clickedCount: true,
        bouncedCount: true,
        sentAt: true,
      },
    });

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
    const where: any = {};
    if (createdBy) {
      where.createdBy = createdBy;
    }

    const campaigns = await prisma.cRMEmailCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        subject: true,
        status: true,
        recipientCount: true,
        sentCount: true,
        openedCount: true,
        clickedCount: true,
        scheduledAt: true,
        sentAt: true,
        createdAt: true,
      },
    });

    return { success: true, campaigns };
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
    const where: any = {};
    if (createdBy) {
      where.createdBy = createdBy;
    }

    const sequences = await prisma.cRMEmailSequence.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, sequences };
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
    await prisma.cRMEmailCampaign.delete({
      where: { id: campaignId },
    });

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
    await prisma.cRMEmailSequence.delete({
      where: { id: sequenceId },
    });

    logger.info(`Email sequence deleted: ${sequenceId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error deleting sequence:', error);
    return { success: false, error: 'Failed to delete sequence' };
  }
}
