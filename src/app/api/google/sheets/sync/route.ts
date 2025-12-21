/**
 * Google Sheets Sync API
 *
 * POST /api/google/sheets/sync
 * Triggers sync of data to Google Sheets
 *
 * Query params:
 * - type: 'payouts' | 'commissions' | 'leads' | 'performance' | 'all'
 *
 * Returns sync status and sheet URLs
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { googleSheetsService } from '@/lib/services/google';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
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
        { error: 'Only administrators can trigger Google Sheets sync' },
        { status: 403 }
      );
    }

    // Get sync type from query params
    const { searchParams } = new URL(req.url);
    const syncType = searchParams.get('type') || 'all';

    let result;

    switch (syncType) {
      case 'payouts':
        result = await googleSheetsService.syncPayouts();
        break;
      case 'commissions':
        result = await googleSheetsService.syncCommissions();
        break;
      case 'leads':
        result = await googleSheetsService.syncLeads();
        break;
      case 'performance':
        result = await googleSheetsService.syncPreparerPerformance();
        break;
      case 'all':
        result = await googleSheetsService.syncAll();
        break;
      default:
        return NextResponse.json(
          { error: `Invalid sync type: ${syncType}. Use 'payouts', 'commissions', 'leads', 'performance', or 'all'` },
          { status: 400 }
        );
    }

    logger.info(`Google Sheets sync completed: ${syncType}`, { result });

    return NextResponse.json({
      success: true,
      syncType,
      result,
    });
  } catch (error) {
    logger.error('Google Sheets sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Google Sheets', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/google/sheets/sync
 * Returns current sync status and sheet URLs
 */
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
        { error: 'Only administrators can view Google Sheets sync status' },
        { status: 403 }
      );
    }

    const status = await googleSheetsService.getSyncStatus();

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    logger.error('Error fetching Google Sheets sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status', details: (error as Error).message },
      { status: 500 }
    );
  }
}
