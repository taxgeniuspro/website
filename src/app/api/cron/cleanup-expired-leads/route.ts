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
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interface for TaxIntakeLead
interface TaxIntakeLead {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  expiresAt: string | null;
  assignedPreparerId: string | null;
}

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

    const now = new Date().toISOString();

    // Find expired leads that haven't been converted
    const { data: expiredLeads, error: findError } = await db
      .from('tax_intake_leads')
      .select('id, email, first_name, last_name, expiresAt, assignedPreparerId')
      .lt('expiresAt', now)
      .eq('convertedToClient', false);

    if (findError) {
      throw findError;
    }

    const leads = (expiredLeads || []) as TaxIntakeLead[];

    if (leads.length === 0) {
      logger.info('No expired leads to delete');
      return NextResponse.json({
        success: true,
        message: 'No expired leads to delete',
        deletedCount: 0,
      });
    }

    // Log which leads are being deleted (for audit trail)
    logger.info(`Deleting ${leads.length} expired leads`, {
      leadIds: leads.map((l) => l.id),
      emails: leads.map((l) => l.email),
    });

    // Delete expired unconverted leads
    const { error: deleteError } = await db
      .from('tax_intake_leads')
      .delete()
      .lt('expiresAt', now)
      .eq('convertedToClient', false);

    if (deleteError) {
      throw deleteError;
    }

    logger.info(`Successfully deleted ${leads.length} expired leads`);

    return NextResponse.json({
      success: true,
      message: `Deleted ${leads.length} expired leads`,
      deletedCount: leads.length,
      deletedLeads: leads.map((l) => ({
        id: l.id,
        name: `${l.first_name} ${l.last_name || ''}`.trim(),
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
