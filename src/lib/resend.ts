/**
 * Email Service (Postal SMTP Compatible)
 *
 * This module provides a Resend-compatible interface using nodemailer/SMTP
 * Works with Postal, SendGrid, Mailgun, or any SMTP provider
 */
import nodemailer from 'nodemailer';
import { logger } from '@/lib/logger';

// SMTP configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'postal.toolboxhosting.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '25');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER || process.env.RESEND_API_KEY;
const SMTP_PASS = process.env.SMTP_PASS || process.env.RESEND_API_KEY;

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (!SMTP_USER || !SMTP_PASS) {
      logger.warn('[Resend] SMTP credentials not configured');
      throw new Error('SMTP credentials not configured');
    }

    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    logger.info('[Resend] SMTP transporter created', {
      host: SMTP_HOST,
      port: SMTP_PORT,
    });
  }

  return transporter;
}

// Resend-compatible email options interface
interface EmailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    type?: string;
  }>;
}

// Resend-compatible result interface
interface SendResult {
  data: { id: string } | null;
  error: { message: string } | null;
}

/**
 * Resend-compatible email client using SMTP
 * Drop-in replacement for Resend SDK
 */
class ResendCompatibleClient {
  emails = {
    send: async (options: EmailOptions): Promise<SendResult> => {
      try {
        const transport = getTransporter();

        // Convert attachments to nodemailer format
        const nodemailerAttachments = options.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.type,
        }));

        const mailOptions = {
          from: options.from,
          to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
          bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
          replyTo: options.replyTo,
          attachments: nodemailerAttachments,
        };

        const result = await transport.sendMail(mailOptions);

        logger.info('[Resend] Email sent successfully', {
          to: mailOptions.to,
          subject: options.subject,
          messageId: result.messageId,
        });

        return {
          data: { id: result.messageId },
          error: null,
        };
      } catch (error: any) {
        logger.error('[Resend] Failed to send email', {
          error: error.message,
          to: options.to,
          subject: options.subject,
        });

        return {
          data: null,
          error: { message: error.message || 'Failed to send email' },
        };
      }
    },
  };
}

// Lazy-initialize the client
let resendClient: ResendCompatibleClient | null = null;

/**
 * Get the Resend-compatible client instance (lazy-loaded)
 * This is a drop-in replacement that uses SMTP instead of Resend API
 */
export function getResendClient(): ResendCompatibleClient {
  if (!resendClient) {
    resendClient = new ResendCompatibleClient();
  }
  return resendClient;
}

// Export a mock Resend class for compatibility
export class Resend {
  emails: ResendCompatibleClient['emails'];

  constructor(_apiKey?: string) {
    // API key is ignored - we use SMTP credentials from env
    const client = getResendClient();
    this.emails = client.emails;
  }
}
