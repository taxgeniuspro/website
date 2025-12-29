/**
 * Cron Job: Cleanup Expired Leads
 *
 * Runs daily to delete TaxIntakeLead records that:
 * - Have expiresAt < now() AND
 * - convertedToClient = false (not converted)
 *
 * This enforces the 6-month lead ownership rule:
 * Leads that are not converted to clients are automatically deleted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Coolify cron jobs use GET requests
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, require authorization
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        logger.warn('Unauthorized cron job attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const now = new Date();

    // Find expired leads that haven't been converted
    const expiredLeads = await prisma.taxIntakeLead.findMany({
      where: {
        expiresAt: { lt: now },
        convertedToClient: false,
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        expiresAt: true,
        assignedPreparerId: true,
      },
    });

    if (expiredLeads.length === 0) {
      logger.info('No expired leads to delete');
      return NextResponse.json({
        success: true,
        message: 'No expired leads to delete',
        deletedCount: 0,
      });
    }

    // Log which leads are being deleted (for audit trail)
    logger.info(`Deleting ${expiredLeads.length} expired leads`, {
      leadIds: expiredLeads.map((l) => l.id),
      emails: expiredLeads.map((l) => l.email),
    });

    // Delete expired unconverted leads
    const result = await prisma.taxIntakeLead.deleteMany({
      where: {
        expiresAt: { lt: now },
        convertedToClient: false,
      },
    });

    logger.info(`Successfully deleted ${result.count} expired leads`);

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} expired leads`,
      deletedCount: result.count,
      deletedLeads: expiredLeads.map((l) => ({
        id: l.id,
        name: `${l.first_name} ${l.last_name}`,
        email: l.email,
        expiredAt: l.expiresAt,
      })),
    });
  } catch (error) {
    logger.error('Error in cleanup-expired-leads cron job', { error });
    return NextResponse.json(
      { error: 'Failed to cleanup expired leads' },
      { status: 500 }
    );
  }
}
