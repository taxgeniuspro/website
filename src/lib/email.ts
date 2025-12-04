/**
 * Email Service using Gmail SMTP
 * Centralized email sending for Tax Genius Pro
 */
import nodemailer from 'nodemailer';
import { logger } from '@/lib/logger';

// Email configuration from environment variables
const GMAIL_USER = process.env.GMAIL_USER || 'taxgenius.tax@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true'; // false for TLS (port 587)

// Email addresses for different purposes
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@taxgeniuspro.tax';
const FROM_NAME = process.env.FROM_NAME || 'Tax Genius Pro';
const INTAKE_EMAIL = process.env.INTAKE_EMAIL || 'taxgenius.tax@gmail.com'; // Temporary: route to admin
const LEADS_EMAIL = process.env.LEADS_EMAIL || 'taxgenius.tax@gmail.com'; // Temporary: route to admin

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      logger.warn('[Email] Gmail credentials not configured. Emails will not be sent.');
      // Return a mock transporter for development
      return {
        sendMail: async (options: any) => {
          logger.info('[Email] MOCK: Would send email', {
            to: options.to,
            subject: options.subject,
          });
          return { messageId: 'mock-' + Date.now() };
        },
      };
    }

    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE, // false for TLS
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false,
      },
    });

    logger.info('[Email] Gmail SMTP transporter created', {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      user: GMAIL_USER,
    });
  }

  return transporter;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

/**
 * Send an email using Gmail SMTP
 */
export async function sendEmail(options: SendEmailOptions) {
  try {
    const transport = getTransporter();

    const mailOptions = {
      from: options.from || `${FROM_NAME} <${FROM_EMAIL}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
    };

    const result = await transport.sendMail(mailOptions);

    logger.info('[Email] Email sent successfully', {
      to: mailOptions.to,
      subject: options.subject,
      messageId: result.messageId,
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    logger.error('[Email] Failed to send email', {
      error,
      to: options.to,
      subject: options.subject,
    });
    throw error;
  }
}

/**
 * Send a welcome email to new users
 */
export async function sendWelcomeEmail(to: string, name: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Tax Genius Pro!</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Thank you for joining Tax Genius Pro. We're excited to have you on board!</p>
            <p>Your account has been successfully created. You can now log in and start exploring our platform.</p>
            <p style="text-align: center;">
              <a href="https://taxgeniuspro.tax/auth/signin" class="button">Sign In Now</a>
            </p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Tax Genius Pro. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: 'Welcome to Tax Genius Pro!',
    html,
    text: `Welcome to Tax Genius Pro, ${name}! Your account has been successfully created.`,
  });
}

/**
 * Send a contact form submission email (website leads)
 * Routes to leads@taxgeniuspro.tax
 */
export async function sendContactFormEmail(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif;">
        <h2>New Website Lead</h2>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        ${data.phone ? `<p><strong>Phone:</strong> ${data.phone}</p>` : ''}
        <p><strong>Message:</strong></p>
        <p>${data.message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p style="color: #666; font-size: 12px;">This email was sent from the Tax Genius Pro contact form.</p>
      </body>
    </html>
  `;

  return sendEmail({
    to: LEADS_EMAIL,
    replyTo: data.email,
    subject: `[WEBSITE LEAD] New Contact: ${data.name}`,
    html,
  });
}

/**
 * Send an intake form submission email
 * Routes to intake@taxgeniuspro.tax
 */
export async function sendIntakeFormEmail(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
  formType?: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif;">
        <h2>New Tax Intake Form Submission</h2>
        ${data.formType ? `<p><strong>Form Type:</strong> ${data.formType}</p>` : ''}
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        ${data.phone ? `<p><strong>Phone:</strong> ${data.phone}</p>` : ''}
        <p><strong>Message:</strong></p>
        <p>${data.message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p style="color: #666; font-size: 12px;">This email was sent from the Tax Genius Pro intake form.</p>
      </body>
    </html>
  `;

  return sendEmail({
    to: INTAKE_EMAIL,
    replyTo: data.email,
    subject: `[TAX INTAKE] New Client: ${data.name}${data.formType ? ` - ${data.formType}` : ''}`,
    html,
  });
}

/**
 * Send appointment confirmation email
 */
export async function sendAppointmentConfirmation(data: {
  to: string;
  name: string;
  date: Date;
  time: string;
  type: string;
}) {
  const formattedDate = data.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Appointment Confirmed</h2>
        <p>Hello ${data.name},</p>
        <p>Your appointment has been confirmed:</p>
        <ul>
          <li><strong>Type:</strong> ${data.type}</li>
          <li><strong>Date:</strong> ${formattedDate}</li>
          <li><strong>Time:</strong> ${data.time}</li>
        </ul>
        <p>We look forward to seeing you!</p>
        <p>If you need to reschedule or have any questions, please contact us.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Tax Genius Pro<br>This is an automated confirmation email.</p>
      </body>
    </html>
  `;

  return sendEmail({
    to: data.to,
    subject: `Appointment Confirmed - ${formattedDate}`,
    html,
  });
}

/**
 * Send shared folder link email
 */
export async function sendSharedFolderEmail(data: {
  to: string;
  senderName: string;
  folderName: string;
  shareUrl: string;
  message?: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>${data.senderName} shared a folder with you</h2>
        <p><strong>Folder:</strong> ${data.folderName}</p>
        ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ''}
        <p style="text-align: center; margin: 30px 0;">
          <a href="${data.shareUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 4px;">
            View Shared Folder
          </a>
        </p>
        <p style="color: #666; font-size: 12px;">
          This link will expire based on the sharing settings. If you have trouble accessing it, please contact ${data.senderName}.
        </p>
      </body>
    </html>
  `;

  return sendEmail({
    to: data.to,
    subject: `${data.senderName} shared "${data.folderName}" with you`,
    html,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Reset Your Password</h2>
        <p>You requested to reset your password for Tax Genius Pro.</p>
        <p>Click the button below to reset your password:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 4px;">
            Reset Password
          </a>
        </p>
        <p style="color: #666;">If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #666; font-size: 12px;">This link will expire in 1 hour.</p>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: 'Reset Your Password - Tax Genius Pro',
    html,
  });
}

/**
 * Send tax form assignment notification
 */
export async function sendTaxFormAssignmentEmail(data: {
  to: string;
  clientName: string;
  formName: string;
  assignedBy: string;
  notes?: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>New Tax Form Assigned</h2>
        <p>Hello ${data.clientName},</p>
        <p>${data.assignedBy} has assigned a tax form to you:</p>
        <p><strong>${data.formName}</strong></p>
        ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
        <p style="text-align: center; margin: 30px 0;">
          <a href="https://taxgeniuspro.tax/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 4px;">
            View in Dashboard
          </a>
        </p>
      </body>
    </html>
  `;

  return sendEmail({
    to: data.to,
    subject: `New Tax Form Assigned: ${data.formName}`,
    html,
  });
}
