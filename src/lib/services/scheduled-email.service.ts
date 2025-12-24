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

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import ReferralInvitationEmail from '../../../emails/referral-invitation';
import { getClientReferralImages, generateSocialMediaCopy } from './client-referral.service';

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

  const scheduled = await prisma.scheduledEmail.create({
    data: {
      type,
      recipientId,
      data: data as object,
      sendAt,
      status: 'pending',
    },
  });

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
    await prisma.scheduledEmail.update({
      where: { id: emailId },
      data: { status: 'cancelled' },
    });
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
  const pendingEmails = await prisma.scheduledEmail.findMany({
    where: {
      status: 'pending',
      sendAt: { lte: now },
      attempts: { lt: 3 }, // Max 3 attempts
    },
    orderBy: { sendAt: 'asc' },
    take: 50, // Process 50 at a time
  });

  logger.info(`Processing ${pendingEmails.length} scheduled emails`);

  let sent = 0;
  let failed = 0;

  for (const email of pendingEmails) {
    try {
      // Increment attempt count first
      await prisma.scheduledEmail.update({
        where: { id: email.id },
        data: { attempts: { increment: 1 } },
      });

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
        await prisma.scheduledEmail.update({
          where: { id: email.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
          },
        });
        sent++;
      } else {
        // Check if we've exhausted retries
        const updatedEmail = await prisma.scheduledEmail.findUnique({
          where: { id: email.id },
          select: { attempts: true },
        });

        if (updatedEmail && updatedEmail.attempts >= 3) {
          await prisma.scheduledEmail.update({
            where: { id: email.id },
            data: {
              status: 'failed',
              error: 'Max retries exceeded',
            },
          });
        }
        failed++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await prisma.scheduledEmail.update({
        where: { id: email.id },
        data: {
          error: errorMessage,
        },
      });

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
    const lead = await prisma.taxIntakeLead.findUnique({
      where: { id: recipientId },
    });

    if (!lead) {
      logger.error('Lead not found for referral invitation', { recipientId });
      return false;
    }

    // Get preparer info if assigned
    let preparerName = 'Tax Genius';
    let preparerId: string | undefined;

    if (lead.assignedPreparerId) {
      // NOTE: assignedPreparerId IS the Profile.id (not User.id)
      const preparer = await prisma.profile.findUnique({
        where: { id: lead.assignedPreparerId },
        select: { id: true, firstName: true, lastName: true, customTrackingCode: true, trackingCode: true },
      });
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
    const lead = await prisma.taxIntakeLead.findUnique({
      where: { id: leadId },
      select: {
        first_name: true,
        email: true,
      },
    });

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
