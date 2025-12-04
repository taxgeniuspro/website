import { logger } from '@/lib/logger';

interface SendSMSParams {
  to: string;
  message: string;
}

interface SendUploadLinkSMSParams {
  to: string;
  linkUrl: string;
  preparerName: string;
  folderName: string;
  clientName: string;
}

/**
 * SMS Service for sending text messages via Twilio
 *
 * Requires environment variables:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER
 */
export class SMSService {
  private static twilioClient: any;

  /**
   * Initialize Twilio client
   */
  private static async getTwilioClient() {
    if (this.twilioClient) {
      return this.twilioClient;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error(
        'Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.'
      );
    }

    try {
      const twilio = (await import('twilio')).default;
      this.twilioClient = twilio(accountSid, authToken);
      return this.twilioClient;
    } catch (error) {
      logger.error('Failed to initialize Twilio client', error);
      throw new Error('Failed to initialize SMS service');
    }
  }

  /**
   * Send a generic SMS message
   */
  static async sendSMS(params: SendSMSParams): Promise<void> {
    const { to, message } = params;

    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioPhoneNumber) {
      throw new Error('Twilio phone number not configured. Please set TWILIO_PHONE_NUMBER.');
    }

    try {
      const client = await this.getTwilioClient();

      const result = await client.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: to,
      });

      logger.info('SMS sent successfully', {
        to,
        messageId: result.sid,
        status: result.status,
      });
    } catch (error) {
      logger.error('Failed to send SMS', {
        error,
        to,
      });
      throw new Error('Failed to send SMS message');
    }
  }

  /**
   * Send upload link via SMS
   */
  static async sendUploadLink(params: SendUploadLinkSMSParams): Promise<void> {
    const { to, linkUrl, preparerName, folderName, clientName } = params;

    const message = `Hi ${clientName}! ${preparerName} has requested documents from you.

Please upload your files to the "${folderName}" folder using this secure link:

${linkUrl}

This link expires in 24 hours.

- Tax Genius Pro`;

    await this.sendSMS({
      to,
      message,
    });

    logger.info('Upload link SMS sent', {
      to,
      folderName,
      preparerName,
    });
  }

  /**
   * Send appointment reminder via SMS
   */
  static async sendAppointmentReminder(params: {
    to: string;
    clientName: string;
    appointmentDate: Date;
    appointmentType: string;
    preparerName: string;
  }): Promise<void> {
    const { to, clientName, appointmentDate, appointmentType, preparerName } = params;

    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const message = `Hi ${clientName}! Reminder: Your ${appointmentType.toLowerCase().replace(/_/g, ' ')} appointment with ${preparerName} is scheduled for ${formattedDate} at ${formattedTime}.

- Tax Genius Pro`;

    await this.sendSMS({
      to,
      message,
    });

    logger.info('Appointment reminder SMS sent', {
      to,
      appointmentDate: appointmentDate.toISOString(),
    });
  }

  /**
   * Send document upload confirmation via SMS
   */
  static async sendUploadConfirmation(params: {
    to: string;
    clientName: string;
    fileCount: number;
    folderName: string;
  }): Promise<void> {
    const { to, clientName, fileCount, folderName } = params;

    const fileText = fileCount === 1 ? 'file' : 'files';

    const message = `Hi ${clientName}! We've received your ${fileCount} ${fileText} uploaded to "${folderName}". Your tax preparer will review them shortly.

Thank you!
- Tax Genius Pro`;

    await this.sendSMS({
      to,
      message,
    });

    logger.info('Upload confirmation SMS sent', {
      to,
      fileCount,
      folderName,
    });
  }

  /**
   * Check if SMS service is configured
   */
  static isConfigured(): boolean {
    return !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    );
  }
}
