/**
 * Professional Email SMTP Service
 *
 * Allows tax preparers to send emails from their professional email addresses
 * (e.g., ira@taxgeniuspro.tax) using Resend SMTP
 *
 * Features:
 * - Send emails from professional aliases
 * - Support for HTML and plain text
 * - Email templates with variable substitution
 * - Reply-to address configuration
 * - Email tracking and logging
 *
 * Requirements:
 * - Resend account with taxgeniuspro.tax domain verified
 * - ProfessionalEmailAlias must be ACTIVE status
 *
 * Flow:
 * 1. Tax preparer composes email from dashboard
 * 2. Service validates professional email is active
 * 3. Email sent via Resend with FROM: professional email
 * 4. Replies go to professional email → forwarded to personal email (Cloudflare)
 */

import { Resend } from 'resend';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Email sending options
 */
export interface ProfessionalEmailOptions {
  from: string; // Professional email (e.g., "ira@taxgeniuspro.tax")
  fromName?: string; // Display name (e.g., "Ira Johnson")
  to: string | string[]; // Recipient(s)
  cc?: string | string[]; // CC recipients
  bcc?: string | string[]; // BCC recipients
  subject: string;
  html?: string; // HTML body
  text?: string; // Plain text body
  replyTo?: string; // Reply-to address (defaults to from address)
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    type?: string;
  }>;
}

/**
 * Email sending result
 */
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Bulk email result
 */
export interface BulkEmailResult {
  sent: number;
  failed: number;
  results: SendEmailResult[];
}

/**
 * Professional Email SMTP Service
 */
export class ProfessionalEmailSMTPService {
  /**
   * Validate that professional email is active and can send
   *
   * @param professionalEmail - Email address to validate
   * @returns True if email can send
   */
  private async validateProfessionalEmail(professionalEmail: string): Promise<boolean> {
    try {
      const alias = await prisma.professionalEmailAlias.findUnique({
        where: { emailAddress: professionalEmail },
      });

      if (!alias) {
        logger.error('Professional email alias not found', { professionalEmail });
        return false;
      }

      if (alias.status !== 'ACTIVE') {
        logger.error('Professional email alias is not active', {
          professionalEmail,
          status: alias.status,
        });
        return false;
      }

      if (!alias.forwardingActive) {
        logger.warn('Professional email forwarding is not active', {
          professionalEmail,
        });
        // Allow sending even if forwarding isn't active yet
      }

      return true;
    } catch (error) {
      logger.error('Error validating professional email', {
        professionalEmail,
        error,
      });
      return false;
    }
  }

  /**
   * Send email from professional email address
   *
   * @param options - Email options
   * @returns Result with messageId if successful
   *
   * @example
   * const result = await professionalEmailService.sendEmail({
   *   from: 'ira@taxgeniuspro.tax',
   *   fromName: 'Ira Johnson',
   *   to: 'client@example.com',
   *   subject: 'Your tax documents are ready',
   *   html: '<p>Please review the attached documents...</p>',
   *   text: 'Please review the attached documents...'
   * });
   */
  async sendEmail(options: ProfessionalEmailOptions): Promise<SendEmailResult> {
    try {
      // Validate professional email
      const isValid = await this.validateProfessionalEmail(options.from);
      if (!isValid) {
        return {
          success: false,
          error: 'Professional email is not active or does not exist',
        };
      }

      logger.info('Sending email from professional address', {
        from: options.from,
        to: options.to,
        subject: options.subject,
      });

      // Format FROM address with display name
      const fromAddress = options.fromName
        ? `${options.fromName} <${options.from}>`
        : options.from;

      // Send email via Resend
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: Array.isArray(options.to) ? options.to : [options.to],
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo || options.from,
        attachments: options.attachments,
      });

      if (error) {
        logger.error('Error sending professional email', {
          from: options.from,
          to: options.to,
          error,
        });
        return {
          success: false,
          error: error.message || 'Failed to send email',
        };
      }

      logger.info('Professional email sent successfully', {
        from: options.from,
        to: options.to,
        messageId: data?.id,
      });

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error: any) {
      logger.error('Error sending professional email', {
        from: options.from,
        to: options.to,
        error: error.message,
      });

      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Send bulk emails from professional email address
   * Useful for sending to multiple leads/clients at once
   *
   * @param emails - Array of email options
   * @returns Bulk result with sent/failed counts
   */
  async sendBulkEmail(emails: ProfessionalEmailOptions[]): Promise<BulkEmailResult> {
    logger.info('Sending bulk emails', { count: emails.length });

    const results: SendEmailResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      const result = await this.sendEmail(email);
      results.push(result);

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      // Rate limiting - wait 100ms between emails to avoid hitting Resend limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    logger.info('Bulk email sending complete', { sent, failed, total: emails.length });

    return {
      sent,
      failed,
      results,
    };
  }

  /**
   * Send email to lead from professional address
   * Convenience method for lead outreach
   *
   * @param professionalEmail - Professional email to send from
   * @param fromName - Display name
   * @param leadEmail - Lead's email address
   * @param leadName - Lead's name
   * @param subject - Email subject
   * @param body - Email body (HTML)
   * @returns Send result
   */
  async sendToLead(
    professionalEmail: string,
    fromName: string,
    leadEmail: string,
    leadName: string,
    subject: string,
    body: string
  ): Promise<SendEmailResult> {
    logger.info('Sending email to lead', {
      professionalEmail,
      leadEmail,
      subject,
    });

    return this.sendEmail({
      from: professionalEmail,
      fromName,
      to: leadEmail,
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
    });
  }

  /**
   * Send email to client from professional address
   * Convenience method for client communication
   *
   * @param professionalEmail - Professional email to send from
   * @param fromName - Display name
   * @param clientEmail - Client's email address
   * @param clientName - Client's name
   * @param subject - Email subject
   * @param body - Email body (HTML)
   * @returns Send result
   */
  async sendToClient(
    professionalEmail: string,
    fromName: string,
    clientEmail: string,
    clientName: string,
    subject: string,
    body: string
  ): Promise<SendEmailResult> {
    logger.info('Sending email to client', {
      professionalEmail,
      clientEmail,
      subject,
    });

    return this.sendEmail({
      from: professionalEmail,
      fromName,
      to: clientEmail,
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, ''),
    });
  }

  /**
   * Verify domain is configured in Resend
   * Should be run during setup to ensure domain is ready
   *
   * @returns True if domain is verified
   */
  async verifyDomain(): Promise<boolean> {
    try {
      logger.info('Verifying taxgeniuspro.tax domain in Resend');

      // Note: Resend doesn't have a direct domain verification API endpoint
      // This would need to be done manually in Resend dashboard
      // We can test by sending a test email

      const testResult = await resend.emails.send({
        from: 'test@taxgeniuspro.tax',
        to: 'test@taxgeniuspro.tax',
        subject: 'Domain Verification Test',
        html: '<p>Testing domain configuration</p>',
      });

      if (testResult.error) {
        logger.error('Domain verification failed', { error: testResult.error });
        return false;
      }

      logger.info('Domain verification successful');
      return true;
    } catch (error) {
      logger.error('Error verifying domain', { error });
      return false;
    }
  }

  /**
   * Get professional email sending statistics
   *
   * @param professionalEmail - Professional email address
   * @param startDate - Start date for stats
   * @param endDate - End date for stats
   * @returns Email statistics
   */
  async getEmailStats(
    professionalEmail: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    sent: number;
    failed: number;
    lastSent?: Date;
  }> {
    try {
      // This would require implementing email logging in the database
      // For now, return placeholder data
      logger.info('Getting email stats', {
        professionalEmail,
        startDate,
        endDate,
      });

      return {
        sent: 0,
        failed: 0,
      };
    } catch (error) {
      logger.error('Error getting email stats', {
        professionalEmail,
        error,
      });
      return {
        sent: 0,
        failed: 0,
      };
    }
  }

  /**
   * Send welcome email to new professional email owner
   *
   * @param professionalEmail - Professional email address
   * @param forwardToEmail - Personal email address
   * @param displayName - User's display name
   */
  async sendWelcomeEmail(
    professionalEmail: string,
    forwardToEmail: string,
    displayName: string
  ): Promise<SendEmailResult> {
    logger.info('Sending professional email welcome email', {
      professionalEmail,
      forwardToEmail,
    });

    const subject = `Welcome to Your Professional Email: ${professionalEmail}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Professional Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f9d938 0%, #408851 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Professional Email!</h1>
          </div>

          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 18px; color: #333;">Hi ${displayName},</p>

            <p>Your professional email <strong>${professionalEmail}</strong> is now active! 🎉</p>

            <div style="background: #f2f7ff; padding: 20px; border-left: 4px solid #408851; margin: 25px 0; border-radius: 4px;">
              <h2 style="margin: 0 0 15px 0; color: #408851; font-size: 20px;">How It Works</h2>

              <p style="margin: 10px 0;"><strong>📨 Receiving Emails:</strong></p>
              <p style="margin: 5px 0 15px 0;">All emails sent to <strong>${professionalEmail}</strong> will be automatically forwarded to <strong>${forwardToEmail}</strong></p>

              <p style="margin: 10px 0;"><strong>📤 Sending Emails:</strong></p>
              <p style="margin: 5px 0;">You can send emails from your professional address in two ways:</p>
              <ul style="margin: 5px 0;">
                <li>Use the email composer in your Tax Genius Pro dashboard</li>
                <li>Configure Gmail Send-As to send from ${professionalEmail} directly in Gmail</li>
              </ul>
            </div>

            <div style="background: #fef3c7; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>💡 Pro Tip:</strong> Set up Gmail Send-As in your dashboard to reply to forwarded emails directly from your professional address!
              </p>
            </div>

            <p style="margin-top: 25px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tax-preparer/settings"
                 style="display: inline-block; background: #408851; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Manage Your Professional Email
              </a>
            </p>

            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              If you have any questions, contact our support team at support@taxgeniuspro.tax
            </p>
          </div>

          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Tax Genius Pro. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      from: 'noreply@taxgeniuspro.tax',
      to: forwardToEmail,
      subject,
      html,
      text: `Welcome to your professional email: ${professionalEmail}!\n\nAll emails sent to ${professionalEmail} will be forwarded to ${forwardToEmail}.\n\nVisit your dashboard to manage your professional email settings.`,
    });
  }
}

// Singleton instance
export const professionalEmailSMTPService = new ProfessionalEmailSMTPService();
