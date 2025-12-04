import { NextRequest, NextResponse } from 'next/server';
import { hasUnconvertedLead } from '@/lib/services/lead-conversion.service';
import { logger } from '@/lib/logger';

/**
 * Check if user has a TaxIntakeLead by email
 * Used by auth flow to determine if role selection should be skipped
 *
 * GET /api/auth/check-lead?email=user@example.com
 */
export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    const result = await hasUnconvertedLead(email);

    logger.info('Check lead result:', { email, result });

    return NextResponse.json({
      hasLead: result.hasLead,
      profileCreated: result.convertedToClient || false,
      leadId: result.leadId,
    });
  } catch (error) {
    logger.error('Error checking for lead:', error);
    return NextResponse.json({ error: 'Failed to check for lead' }, { status: 500 });
  }
}
