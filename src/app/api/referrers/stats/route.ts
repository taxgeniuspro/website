import { NextRequest, NextResponse } from 'next/server';
import { requireOneOfRoles } from '@/lib/auth';
import { ReferrerService } from '@/lib/services/referrer.service';
import { withErrorHandler, createServiceUnavailableError } from '@/lib/api-error-handler';
import { logger } from '@/lib/logger';

export const GET = withErrorHandler(async function (request: NextRequest) {
  // Allow client and affiliate roles to access stats (anyone who can refer)
  const { profile } = await requireOneOfRoles(['client', 'affiliate']);

  try {
    const stats = await ReferrerService.getReferrerStats(profile.id);
    return NextResponse.json(stats);
  } catch (error) {
    // If ReferrerService fails (likely Redis or DB issue), provide fallback
    logger.warn('ReferrerService failed, using fallback:', error);

    // Throw service unavailable error that will be handled by withErrorHandler
    throw createServiceUnavailableError('Statistics service');
  }
});
