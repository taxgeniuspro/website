/**
 * Google Auth Service - Service Account Authentication
 *
 * Handles authentication with Google APIs using a service account.
 * This is used for company-level integrations (Sheets, Drive, Calendar)
 * that don't require individual user OAuth.
 *
 * The service account email must be shared with:
 * - Google Drive folders (Editor access)
 * - Google Calendar (Make changes to events)
 * - Google Sheets are created by the service account, so no sharing needed
 */

import { google, Auth } from 'googleapis';
import { logger } from '@/lib/logger';

// Service account credentials from environment
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

// Scopes required for company integrations
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets', // Google Sheets
  'https://www.googleapis.com/auth/drive', // Google Drive
  'https://www.googleapis.com/auth/calendar', // Google Calendar
];

class GoogleAuthService {
  private authClient: Auth.GoogleAuth | null = null;
  private jwtClient: Auth.JWT | null = null;

  /**
   * Check if Google service account is configured
   */
  isConfigured(): boolean {
    return !!(SERVICE_ACCOUNT_EMAIL && SERVICE_ACCOUNT_KEY);
  }

  /**
   * Get authenticated Google Auth client
   * Uses service account credentials for server-to-server auth
   */
  async getAuthClient(): Promise<Auth.GoogleAuth> {
    if (!this.isConfigured()) {
      throw new Error(
        'Google service account not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY environment variables.'
      );
    }

    if (this.authClient) {
      return this.authClient;
    }

    try {
      // Decode base64 service account key if it's encoded
      let credentials: object;
      try {
        // Try parsing as JSON first (in case it's not base64 encoded)
        credentials = JSON.parse(SERVICE_ACCOUNT_KEY!);
      } catch {
        // If that fails, try base64 decoding
        const decoded = Buffer.from(SERVICE_ACCOUNT_KEY!, 'base64').toString(
          'utf-8'
        );
        credentials = JSON.parse(decoded);
      }

      this.authClient = new google.auth.GoogleAuth({
        credentials,
        scopes: SCOPES,
      });

      logger.info('Google Auth client initialized successfully');
      return this.authClient;
    } catch (error) {
      logger.error('Failed to initialize Google Auth client', { error });
      throw new Error('Failed to initialize Google Auth client');
    }
  }

  /**
   * Get JWT client for direct API calls
   */
  async getJWTClient(): Promise<Auth.JWT> {
    if (!this.isConfigured()) {
      throw new Error('Google service account not configured');
    }

    if (this.jwtClient) {
      return this.jwtClient;
    }

    try {
      let credentials: {
        client_email: string;
        private_key: string;
        project_id?: string;
      };

      try {
        credentials = JSON.parse(SERVICE_ACCOUNT_KEY!);
      } catch {
        const decoded = Buffer.from(SERVICE_ACCOUNT_KEY!, 'base64').toString(
          'utf-8'
        );
        credentials = JSON.parse(decoded);
      }

      this.jwtClient = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: SCOPES,
      });

      await this.jwtClient.authorize();
      logger.info('Google JWT client authorized successfully');

      return this.jwtClient;
    } catch (error) {
      logger.error('Failed to initialize Google JWT client', { error });
      throw new Error('Failed to initialize Google JWT client');
    }
  }

  /**
   * Get Google Sheets API client
   */
  async getSheetsClient() {
    const auth = await this.getAuthClient();
    return google.sheets({ version: 'v4', auth });
  }

  /**
   * Get Google Drive API client
   */
  async getDriveClient() {
    const auth = await this.getAuthClient();
    return google.drive({ version: 'v3', auth });
  }

  /**
   * Get Google Calendar API client
   */
  async getCalendarClient() {
    const auth = await this.getAuthClient();
    return google.calendar({ version: 'v3', auth });
  }

  /**
   * Get service account email (for sharing resources)
   */
  getServiceAccountEmail(): string {
    if (!SERVICE_ACCOUNT_EMAIL) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL not configured');
    }
    return SERVICE_ACCOUNT_EMAIL;
  }

  /**
   * Test connection to Google APIs
   */
  async testConnection(): Promise<{
    success: boolean;
    sheets: boolean;
    drive: boolean;
    calendar: boolean;
    errors: string[];
  }> {
    const result = {
      success: true,
      sheets: false,
      drive: false,
      calendar: false,
      errors: [] as string[],
    };

    // Test Sheets API
    try {
      const sheets = await this.getSheetsClient();
      // Just check if we can access the API (no specific spreadsheet needed)
      await sheets.spreadsheets.create({
        requestBody: {
          properties: { title: '__test_connection__' },
        },
      });
      result.sheets = true;
      logger.info('Google Sheets API connection successful');
    } catch (error) {
      result.errors.push(`Sheets: ${(error as Error).message}`);
      logger.error('Google Sheets API connection failed', { error });
    }

    // Test Drive API
    try {
      const drive = await this.getDriveClient();
      await drive.about.get({ fields: 'user' });
      result.drive = true;
      logger.info('Google Drive API connection successful');
    } catch (error) {
      result.errors.push(`Drive: ${(error as Error).message}`);
      logger.error('Google Drive API connection failed', { error });
    }

    // Test Calendar API
    try {
      const calendar = await this.getCalendarClient();
      await calendar.calendarList.list({ maxResults: 1 });
      result.calendar = true;
      logger.info('Google Calendar API connection successful');
    } catch (error) {
      result.errors.push(`Calendar: ${(error as Error).message}`);
      logger.error('Google Calendar API connection failed', { error });
    }

    result.success = result.sheets && result.drive && result.calendar;
    return result;
  }
}

// Export singleton instance
export const googleAuthService = new GoogleAuthService();
