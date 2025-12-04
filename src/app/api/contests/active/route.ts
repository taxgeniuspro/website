import { NextRequest, NextResponse } from 'next/server';
import { ReferrerService } from '@/lib/services/referrer.service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const contests = await ReferrerService.getActiveContests();

    return NextResponse.json(contests);
  } catch (error) {
    logger.error('Error fetching active contests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
