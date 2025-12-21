/**
 * Google API Connection Test
 *
 * GET /api/google/test
 * Tests connection to all Google APIs (Sheets, Drive, Calendar)
 * Returns status for each service
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { googleAuthService } from '@/lib/services/google';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userRole = user.role as string;
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can test Google API connection' },
        { status: 403 }
      );
    }

    // Check if Google service account is configured
    const isConfigured = googleAuthService.isConfigured();
    if (!isConfigured) {
      return NextResponse.json({
        success: false,
        configured: false,
        message: 'Google service account not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY environment variables.',
      });
    }

    // Test connection to all Google APIs
    const result = await googleAuthService.testConnection();

    logger.info('Google API connection test completed', { result });

    return NextResponse.json({
      success: result.success,
      configured: true,
      serviceAccountEmail: googleAuthService.getServiceAccountEmail(),
      services: {
        sheets: result.sheets,
        drive: result.drive,
        calendar: result.calendar,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
      instructions: !result.success
        ? [
            'Ensure the following APIs are enabled in Google Cloud Console:',
            '- Google Sheets API',
            '- Google Drive API',
            '- Google Calendar API',
            '',
            'Share resources with service account email:',
            `- Drive folder: Share with ${googleAuthService.getServiceAccountEmail()} (Editor)`,
            `- Calendar: Add ${googleAuthService.getServiceAccountEmail()} with "Make changes to events"`,
          ]
        : undefined,
    });
  } catch (error) {
    logger.error('Google API test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test Google API connection',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
