/**
 * Cron Job: Send Scheduled Emails
 *
 * Runs every 5 minutes to process pending scheduled emails.
 *
 * Currently handles:
 * - client_referral_invitation: Sent 30 min after lead form completion
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/send-scheduled-emails",
 *     "schedule": "0/5 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { processScheduledEmails } from '@/lib/services/scheduled-email.service';

// Vercel cron jobs use GET requests
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, require authorization
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        logger.warn('Unauthorized cron job attempt for scheduled emails');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Process pending scheduled emails
    const result = await processScheduledEmails();

    logger.info('Scheduled emails cron completed', result);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error in send-scheduled-emails cron job', { error });
    return NextResponse.json(
      { error: 'Failed to process scheduled emails' },
      { status: 500 }
    );
  }
}
