/**
 * Gmail Send-As Auto-Configuration Service
 *
 * Automatically configures Gmail to send emails from professional email addresses
 * using Gmail API - settings.sendAs
 *
 * Docs: https://developers.google.com/gmail/api/reference/rest/v1/users.settings.sendAs
 *
 * Features:
 * - Configure Send-As address in user's Gmail
 * - Verify ownership with verification code
 * - Set default sending address
 * - List all Send-As aliases
 *
 * Requirements:
 * - GOOGLE_CLIENT_ID (OAuth client ID from Google Cloud Console)
 * - GOOGLE_CLIENT_SECRET (OAuth client secret)
 * - User's Gmail OAuth access token (obtained via OAuth flow)
 *
 * Flow:
 * 1. User authorizes Gmail access via OAuth
 * 2. System creates Send-As address in their Gmail
 * 3. Gmail sends verification email to professional address
 * 4. Email is forwarded to user's personal Gmail (via Cloudflare)
 * 5. User clicks verification link or enters code
 * 6. System verifies Send-As address
 * 7. User can now send from professional address in Gmail
 */

import { google } from 'googleapis';
import { logger } from '@/lib/logger';

const gmail = google.gmail('v1');

/**
 * Gmail OAuth configuration
 */
interface GmailOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Get Gmail OAuth configuration from environment
 */
function getGmailOAuthConfig(): GmailOAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/gmail/oauth/callback`;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing Gmail OAuth configuration. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET'
    );
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Create OAuth2 client
 */
function createOAuth2Client(accessToken?: string) {
  const config = getGmailOAuthConfig();

  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );

  if (accessToken) {
    oauth2Client.setCredentials({ access_token: accessToken });
  }

  return oauth2Client;
}

/**
 * Send-As alias result
 */
export interface SendAsAlias {
  sendAsEmail: string;
  displayName?: string;
  replyToAddress?: string;
  signature?: string;
  isDefault: boolean;
  isPrimary: boolean;
  verificationStatus: 'accepted' | 'pending' | 'failed';
}

/**
 * Result of configuring Send-As
 */
export interface ConfigureSendAsResult {
  success: boolean;
  sendAsId?: string;
  verificationStatus?: 'accepted' | 'pending';
  message: string;
}

/**
 * Gmail Send-As Auto-Configuration Service
 */
export class GmailSendAsService {
  /**
   * Get Gmail OAuth authorization URL
   * User should be redirected to this URL to grant Gmail access
   *
   * @param state - Optional state parameter for CSRF protection
   * @returns Authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const oauth2Client = createOAuth2Client();

    const scopes = [
      'https://www.googleapis.com/auth/gmail.settings.basic',
      'https://www.googleapis.com/auth/gmail.settings.sharing',
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state,
    });

    logger.info('Generated Gmail OAuth authorization URL');

    return url;
  }

  /**
   * Exchange authorization code for access token
   *
   * @param code - Authorization code from OAuth callback
   * @returns Access token and refresh token
   */
  async getTokensFromCode(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiryDate?: number;
  }> {
    try {
      const oauth2Client = createOAuth2Client();

      logger.info('Exchanging authorization code for tokens');

      const { tokens } = await oauth2Client.getToken(code);

      logger.info('Successfully obtained Gmail OAuth tokens');

      return {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
      };
    } catch (error) {
      logger.error('Failed to exchange authorization code for tokens', { error });
      throw new Error('Failed to obtain Gmail access token');
    }
  }

  /**
   * Configure Send-As address in user's Gmail
   *
   * @param accessToken - User's Gmail OAuth access token
   * @param professionalEmail - Professional email address to send from (e.g., "ira@taxgeniuspro.tax")
   * @param displayName - Display name for the email (e.g., "Ira Johnson")
   * @param replyToAddress - Optional reply-to address (defaults to professional email)
   * @returns Result with sendAsId and verification status
   *
   * @example
   * const result = await gmailService.configureSendAs(
   *   'ya29.a0AfH6SMB...',
   *   'ira@taxgeniuspro.tax',
   *   'Ira Johnson'
   * );
   */
  async configureSendAs(
    accessToken: string,
    professionalEmail: string,
    displayName: string,
    replyToAddress?: string
  ): Promise<ConfigureSendAsResult> {
    try {
      const oauth2Client = createOAuth2Client(accessToken);

      logger.info('Configuring Gmail Send-As address', {
        professionalEmail,
        displayName,
      });

      // Create Send-As alias
      // API: POST /gmail/v1/users/me/settings/sendAs
      const response = await gmail.users.settings.sendAs.create({
        userId: 'me',
        auth: oauth2Client,
        requestBody: {
          sendAsEmail: professionalEmail,
          displayName: displayName,
          replyToAddress: replyToAddress || professionalEmail,
          treatAsAlias: true,
          isDefault: false, // Don't set as default yet
        },
      });

      const sendAsId = response.data.sendAsEmail!;
      const verificationStatus = response.data.verificationStatus as 'accepted' | 'pending';

      logger.info('Gmail Send-As address configured successfully', {
        sendAsId,
        verificationStatus,
        professionalEmail,
      });

      return {
        success: true,
        sendAsId,
        verificationStatus,
        message:
          verificationStatus === 'pending'
            ? 'Verification email sent. Check your inbox for the verification link.'
            : 'Send-As address configured and verified.',
      };
    } catch (error: any) {
      logger.error('Failed to configure Gmail Send-As address', {
        professionalEmail,
        displayName,
        error: error.message,
      });

      // Check if Send-As already exists
      if (error.code === 409 || error.message?.includes('already exists')) {
        return {
          success: true,
          sendAsId: professionalEmail,
          verificationStatus: 'pending',
          message: 'Send-As address already exists in Gmail.',
        };
      }

      return {
        success: false,
        message: error.message || 'Failed to configure Send-As address',
      };
    }
  }

  /**
   * Verify Send-As address with verification code
   * Note: Gmail API doesn't support programmatic verification with code.
   * User must click the link in the verification email.
   *
   * @param accessToken - User's Gmail OAuth access token
   * @param professionalEmail - Professional email address
   * @returns True if verified
   */
  async verifySendAs(
    accessToken: string,
    professionalEmail: string
  ): Promise<boolean> {
    try {
      const oauth2Client = createOAuth2Client(accessToken);

      logger.info('Verifying Gmail Send-As address', { professionalEmail });

      // Get Send-As details
      // API: GET /gmail/v1/users/me/settings/sendAs/:sendAsEmail
      const response = await gmail.users.settings.sendAs.get({
        userId: 'me',
        sendAsEmail: professionalEmail,
        auth: oauth2Client,
      });

      const verificationStatus = response.data.verificationStatus;
      const isVerified = verificationStatus === 'accepted';

      logger.info('Gmail Send-As verification status checked', {
        professionalEmail,
        verificationStatus,
        isVerified,
      });

      return isVerified;
    } catch (error) {
      logger.error('Failed to verify Gmail Send-As address', {
        professionalEmail,
        error,
      });
      return false;
    }
  }

  /**
   * Set Send-As address as default sending address
   *
   * @param accessToken - User's Gmail OAuth access token
   * @param professionalEmail - Professional email address to set as default
   * @returns True if successful
   */
  async setAsDefault(
    accessToken: string,
    professionalEmail: string
  ): Promise<boolean> {
    try {
      const oauth2Client = createOAuth2Client(accessToken);

      logger.info('Setting Gmail Send-As as default', { professionalEmail });

      // Update Send-As to set as default
      // API: PATCH /gmail/v1/users/me/settings/sendAs/:sendAsEmail
      await gmail.users.settings.sendAs.patch({
        userId: 'me',
        sendAsEmail: professionalEmail,
        auth: oauth2Client,
        requestBody: {
          isDefault: true,
        },
      });

      logger.info('Gmail Send-As set as default successfully', {
        professionalEmail,
      });

      return true;
    } catch (error) {
      logger.error('Failed to set Gmail Send-As as default', {
        professionalEmail,
        error,
      });
      return false;
    }
  }

  /**
   * List all Send-As aliases for the user
   *
   * @param accessToken - User's Gmail OAuth access token
   * @returns Array of Send-As aliases
   */
  async listSendAsAliases(accessToken: string): Promise<SendAsAlias[]> {
    try {
      const oauth2Client = createOAuth2Client(accessToken);

      logger.info('Listing Gmail Send-As aliases');

      // List all Send-As addresses
      // API: GET /gmail/v1/users/me/settings/sendAs
      const response = await gmail.users.settings.sendAs.list({
        userId: 'me',
        auth: oauth2Client,
      });

      const sendAsAliases = response.data.sendAs || [];

      const aliases: SendAsAlias[] = sendAsAliases.map((alias) => ({
        sendAsEmail: alias.sendAsEmail!,
        displayName: alias.displayName || undefined,
        replyToAddress: alias.replyToAddress || undefined,
        signature: alias.signature || undefined,
        isDefault: alias.isDefault || false,
        isPrimary: alias.isPrimary || false,
        verificationStatus: alias.verificationStatus as 'accepted' | 'pending' | 'failed',
      }));

      logger.info('Gmail Send-As aliases retrieved', {
        count: aliases.length,
      });

      return aliases;
    } catch (error) {
      logger.error('Failed to list Gmail Send-As aliases', { error });
      return [];
    }
  }

  /**
   * Delete Send-As address
   *
   * @param accessToken - User's Gmail OAuth access token
   * @param professionalEmail - Professional email address to delete
   * @returns True if successful
   */
  async deleteSendAs(
    accessToken: string,
    professionalEmail: string
  ): Promise<boolean> {
    try {
      const oauth2Client = createOAuth2Client(accessToken);

      logger.info('Deleting Gmail Send-As address', { professionalEmail });

      // Delete Send-As address
      // API: DELETE /gmail/v1/users/me/settings/sendAs/:sendAsEmail
      await gmail.users.settings.sendAs.delete({
        userId: 'me',
        sendAsEmail: professionalEmail,
        auth: oauth2Client,
      });

      logger.info('Gmail Send-As address deleted successfully', {
        professionalEmail,
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete Gmail Send-As address', {
        professionalEmail,
        error,
      });
      return false;
    }
  }

  /**
   * Update Send-As signature
   *
   * @param accessToken - User's Gmail OAuth access token
   * @param professionalEmail - Professional email address
   * @param signature - HTML signature
   * @returns True if successful
   */
  async updateSignature(
    accessToken: string,
    professionalEmail: string,
    signature: string
  ): Promise<boolean> {
    try {
      const oauth2Client = createOAuth2Client(accessToken);

      logger.info('Updating Gmail Send-As signature', { professionalEmail });

      // Update Send-As signature
      // API: PATCH /gmail/v1/users/me/settings/sendAs/:sendAsEmail
      await gmail.users.settings.sendAs.patch({
        userId: 'me',
        sendAsEmail: professionalEmail,
        auth: oauth2Client,
        requestBody: {
          signature,
        },
      });

      logger.info('Gmail Send-As signature updated successfully', {
        professionalEmail,
      });

      return true;
    } catch (error) {
      logger.error('Failed to update Gmail Send-As signature', {
        professionalEmail,
        error,
      });
      return false;
    }
  }
}

// Singleton instance
export const gmailSendAsService = new GmailSendAsService();
