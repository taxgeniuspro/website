/**
 * Client Status API
 *
 * GET /api/mobile-hub/client-status - Get client's tax return status
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get client's documents count
    const { count: documentsCount } = await db
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get latest tax return (if exists)
    const { data: taxReturns } = await db
      .from('tax_returns')
      .select('status, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    const latestReturn = firstOrNull(taxReturns);

    const status = {
      returnStatus: latestReturn?.status || 'not_started',
      documentsCount: documentsCount || 0,
      lastUpdated: latestReturn?.updated_at || null,
    };

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Error fetching client status', { error });
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
