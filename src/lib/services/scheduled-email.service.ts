/**
 * Scheduled Email Service
 *
 * Handles scheduling and sending of delayed emails:
 * - Stores emails in database with sendAt timestamp
 * - Cron job checks every 5 minutes for emails to send
 * - Supports retry logic for failed sends
 *
 * Email Types:
 * - client_referral_invitation: Sent 30 min after lead form completion
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { Resend } from '@/lib/resend';
import { render } from '@react-email/render';
import ReferralInvitationEmail from '../../../emails/referral-invitation';
import { getClientReferralImages, generateSocialMediaCopy } from './client-referral.service';

// Local type definitions (replacing @prisma/client)
interface ScheduledEmailRecord {
  id: string;
  type: string;
  recipientId: string;
  data: Record<string, unknown>;
  sendAt: Date | string;
  status: string;
  sentAt?: Date | string | null;
  error?: string | null;
  attempts: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface TaxIntakeLeadRecord {
  id: string;
  first_name?: string | null;
  email: string;
  assignedPreparerId?: string | null;
}

interface ProfileRecord {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  customTrackingCode?: string | null;
  trackingCode?: string | null;
}

// Lazy initialization to avoid build-time errors when env vars aren't set
const getResend = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(process.env.RESEND_API_KEY);
};
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Tax Genius <noreply@taxgeniuspro.tax>';

export type ScheduledEmailType = 'client_referral_invitation';

export interface ScheduleEmailParams {
  type: ScheduledEmailType;
  recipientId: string;
  data: Record<string, unknown>;
  sendAt: Date;
}

/**
 * Schedule an email for later delivery
 */
export async function scheduleEmail(params: ScheduleEmailParams): Promise<string> {
  const { type, recipientId, data, sendAt } = params;

  const { data: scheduledData, error } = await db
    .from('scheduled_emails')
    .insert({
      type,
      recipientId,
      data: data as object,
      sendAt: sendAt.toISOString(),
      status: 'pending',
      attempts: 0,
    })
    .select()
    .single();

  if (error || !scheduledData) {
    throw new Error(`Failed to schedule email: ${error?.message}`);
  }

  const scheduled = scheduledData as ScheduledEmailRecord;

  logger.info('Scheduled email', {
    id: scheduled.id,
    type,
    recipientId,
    sendAt: sendAt.toISOString(),
  });

  return scheduled.id;
}

/**
 * Cancel a scheduled email
 */
export async function cancelScheduledEmail(emailId: string): Promise<boolean> {
  try {
    const { error } = await db
      .from('scheduled_emails')
      .update({ status: 'cancelled' })
      .eq('id', emailId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    logger.error('Error cancelling scheduled email', { error, emailId });
    return false;
  }
}

/**
 * Process pending scheduled emails
 * Called by cron job every 5 minutes
 */
export async function processScheduledEmails(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const now = new Date();

  // Get all pending emails that are due
  const { data: pendingEmailsData } = await db
    .from('scheduled_emails')
    .select('*')
    .eq('status', 'pending')
    .lte('sendAt', now.toISOString())
    .lt('attempts', 3) // Max 3 attempts
    .order('sendAt', { ascending: true })
    .limit(50); // Process 50 at a time

  const pendingEmails = (pendingEmailsData || []) as ScheduledEmailRecord[];

  logger.info(`Processing ${pendingEmails.length} scheduled emails`);

  let sent = 0;
  let failed = 0;

  for (const email of pendingEmails) {
    try {
      // Increment attempt count first
      const newAttempts = email.attempts + 1;
      await db
        .from('scheduled_emails')
        .update({ attempts: newAttempts })
        .eq('id', email.id);

      // Send based on email type
      let success = false;

      switch (email.type) {
        case 'client_referral_invitation':
          success = await sendReferralInvitationEmail(email.recipientId, email.data as Record<string, unknown>);
          break;
        default:
          logger.warn(`Unknown email type: ${email.type}`);
      }

      if (success) {
        await db
          .from('scheduled_emails')
          .update({
            status: 'sent',
            sentAt: new Date().toISOString(),
          })
          .eq('id', email.id);
        sent++;
      } else {
        // Check if we've exhausted retries (we already incremented, so check newAttempts)
        if (newAttempts >= 3) {
          await db
            .from('scheduled_emails')
            .update({
              status: 'failed',
              error: 'Max retries exceeded',
            })
            .eq('id', email.id);
        }
        failed++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await db
        .from('scheduled_emails')
        .update({ error: errorMessage })
        .eq('id', email.id);

      logger.error('Error processing scheduled email', {
        emailId: email.id,
        error: errorMessage,
      });
      failed++;
    }
  }

  logger.info('Finished processing scheduled emails', { processed: pendingEmails.length, sent, failed });

  return { processed: pendingEmails.length, sent, failed };
}

/**
 * Send a referral invitation email
 */
async function sendReferralInvitationEmail(
  recipientId: string,
  data: Record<string, unknown>
): Promise<boolean> {
  try {
    // Get the lead info with assigned preparer
    const { data: leadData } = await db
      .from('tax_intake_leads')
      .select('id, first_name, email, assignedPreparerId')
      .eq('id', recipientId)
      .limit(1);

    const lead = firstOrNull(leadData) as TaxIntakeLeadRecord | null;

    if (!lead) {
      logger.error('Lead not found for referral invitation', { recipientId });
      return false;
    }

    // Get preparer info if assigned
    let preparerName = 'Tax Genius';
    let preparerId: string | undefined;

    if (lead.assignedPreparerId) {
      // NOTE: assignedPreparerId IS the Profile.id (not User.id)
      const { data: preparerData } = await db
        .from('profiles')
        .select('id, firstName, lastName, customTrackingCode, trackingCode')
        .eq('id', lead.assignedPreparerId)
        .limit(1);

      const preparer = firstOrNull(preparerData) as ProfileRecord | null;
      if (preparer) {
        preparerId = preparer.id;
        preparerName = `${preparer.firstName || ''} ${preparer.lastName || ''}`.trim() || 'Tax Genius';
      }
    }

    // Get referral images
    const imageSet = await getClientReferralImages(preparerId);
    const images = imageSet?.images.map((img) => ({
      url: img.url,
      alt: img.alt,
    })) || [];

    // Get the referral link from the stored data
    const referralLink = data.referralLink as string;

    // Get social media copy with the correct referral link
    const socialMediaCopy = generateSocialMediaCopy(preparerName, 'instagram', referralLink);

    // Render the email
    const emailHtml = await render(
      ReferralInvitationEmail({
        clientName: data.clientName as string || lead.first_name || 'Friend',
        preparerName,
        taxYear: data.taxYear as number || new Date().getFullYear(),
        referralLink,
        referralCode: data.referralCode as string,
        socialMediaCopy,
        images,
      })
    );

    // Send via Resend
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: lead.email,
      subject: `Hey ${lead.first_name || 'Friend'}, Want $1,125 Extra Bucks Fast from Tax Genius?`,
      html: emailHtml,
    });

    if (result.error) {
      logger.error('Failed to send referral invitation email', {
        recipientId,
        error: result.error,
      });
      return false;
    }

    logger.info('Sent referral invitation email', {
      recipientId,
      emailId: result.data?.id,
    });

    return true;
  } catch (error) {
    logger.error('Error sending referral invitation email', {
      recipientId,
      error,
    });
    return false;
  }
}

/**
 * Schedule a referral invitation email 30 minutes after lead creation
 */
export async function scheduleReferralInvitationEmail(
  leadId: string,
  referralCode: string,
  referralLink: string
): Promise<string | null> {
  try {
    // Get lead info
    const { data: leadData } = await db
      .from('tax_intake_leads')
      .select('first_name, email')
      .eq('id', leadId)
      .limit(1);

    const lead = firstOrNull(leadData) as { first_name?: string | null; email: string } | null;

    if (!lead) {
      logger.error('Lead not found for scheduling referral email', { leadId });
      return null;
    }

    // Schedule for 30 minutes from now
    const sendAt = new Date(Date.now() + 30 * 60 * 1000);

    const emailId = await scheduleEmail({
      type: 'client_referral_invitation',
      recipientId: leadId,
      data: {
        clientName: lead.first_name || 'Friend',
        taxYear: new Date().getFullYear(),
        referralCode,
        referralLink,
      },
      sendAt,
    });

    logger.info('Scheduled referral invitation email', {
      leadId,
      emailId,
      sendAt: sendAt.toISOString(),
    });

    return emailId;
  } catch (error) {
    logger.error('Error scheduling referral invitation email', { leadId, error });
    return null;
  }
}
