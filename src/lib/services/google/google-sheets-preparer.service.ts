/**
 * Google Sheets Preparer Service
 *
 * Creates and manages individual spreadsheets for each tax preparer.
 * Each preparer gets 4 auto-synced sheets:
 * - My Clients: Auto-synced client list
 * - My Leads: Auto-synced lead list
 * - My Commissions: Auto-synced earnings
 * - My Performance: Monthly metrics
 *
 * Sheets are stored in the preparer's private Google Drive folder.
 */

import { sheets_v4 } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { googleAuthService } from './google-auth.service';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';

// Sheet configurations for preparer spreadsheets
const PREPARER_SHEET_CONFIGS = {
  CLIENTS: {
    title: 'My Clients',
    headers: [
      'Name',
      'Email',
      'Phone',
      'Status',
      'Tax Year',
      'Filing Status',
      'Refund Amount',
      'Filed Date',
      'Referred By',
      'Notes',
    ],
  },
  LEADS: {
    title: 'My Leads',
    headers: [
      'Name',
      'Email',
      'Phone',
      'Source',
      'Status',
      'Created',
      'Last Contact',
      'Referrer',
      'Notes',
    ],
  },
  COMMISSIONS: {
    title: 'My Commissions',
    headers: [
      'Client/Lead',
      'Type',
      'Amount',
      'Status',
      'Earned Date',
      'Paid Date',
      'Payment Method',
      'Notes',
    ],
  },
  PERFORMANCE: {
    title: 'My Performance',
    headers: [
      'Month',
      'New Leads',
      'Conversions',
      'Clients Served',
      'Returns Filed',
      'Revenue',
      'Commission Earned',
      'Referrals Made',
    ],
  },
};

class GoogleSheetsPreparerService {
  private sheets: sheets_v4.Sheets | null = null;

  /**
   * Get authenticated Sheets client
   */
  private async getClient(): Promise<sheets_v4.Sheets> {
    if (!this.sheets) {
      this.sheets = await googleAuthService.getSheetsClient();
    }
    return this.sheets;
  }

  /**
   * Create a new spreadsheet in the preparer's folder
   */
  private async createSpreadsheet(
    title: string,
    headers: string[],
    folderId?: string
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const sheets = await this.getClient();
    const drive = await googleAuthService.getDriveClient();

    // Create spreadsheet
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title,
        },
        sheets: [
          {
            properties: {
              title: 'Data',
              gridProperties: {
                frozenRowCount: 1, // Freeze header row
              },
            },
          },
        ],
      },
    });

    const spreadsheetId = response.data.spreadsheetId;
    const spreadsheetUrl = response.data.spreadsheetUrl;

    if (!spreadsheetId) {
      throw new Error(`Failed to create spreadsheet: ${title} - no spreadsheet ID returned`);
    }

    // Add headers
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Data!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });

    // Format header row (bold, background color)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
        ],
      },
    });

    // Move to preparer's folder if provided
    if (folderId) {
      await drive.files.update({
        fileId: spreadsheetId,
        addParents: folderId,
        removeParents: 'root',
        fields: 'id, parents',
      });
    }

    logger.info('Created preparer spreadsheet', {
      title,
      spreadsheetId,
      folderId,
    });

    return {
      spreadsheetId,
      spreadsheetUrl: spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  }

  /**
   * Create all spreadsheets for a preparer
   */
  async createPreparerSpreadsheets(
    preparerId: string,
    preparerName: string,
    folderId: string
  ): Promise<void> {
    logger.info('Creating spreadsheets for preparer', { preparerId, preparerName, folderId });

    try {
      // Create Clients sheet
      const clients = await this.createSpreadsheet(
        `${preparerName} - ${PREPARER_SHEET_CONFIGS.CLIENTS.title}`,
        PREPARER_SHEET_CONFIGS.CLIENTS.headers,
        folderId
      );

      // Create Leads sheet
      const leads = await this.createSpreadsheet(
        `${preparerName} - ${PREPARER_SHEET_CONFIGS.LEADS.title}`,
        PREPARER_SHEET_CONFIGS.LEADS.headers,
        folderId
      );

      // Create Commissions sheet
      const commissions = await this.createSpreadsheet(
        `${preparerName} - ${PREPARER_SHEET_CONFIGS.COMMISSIONS.title}`,
        PREPARER_SHEET_CONFIGS.COMMISSIONS.headers,
        folderId
      );

      // Create Performance sheet
      const performance = await this.createSpreadsheet(
        `${preparerName} - ${PREPARER_SHEET_CONFIGS.PERFORMANCE.title}`,
        PREPARER_SHEET_CONFIGS.PERFORMANCE.headers,
        folderId
      );

      // Update profile with sheet IDs
      await prisma.profile.update({
        where: { id: preparerId },
        data: {
          googleSheetsClientsId: clients.spreadsheetId,
          googleSheetsLeadsId: leads.spreadsheetId,
          googleSheetsCommissionsId: commissions.spreadsheetId,
          googleSheetsPerformanceId: performance.spreadsheetId,
        },
      });

      logger.info('All spreadsheets created for preparer', {
        preparerId,
        clientsId: clients.spreadsheetId,
        leadsId: leads.spreadsheetId,
        commissionsId: commissions.spreadsheetId,
        performanceId: performance.spreadsheetId,
      });
    } catch (error) {
      logger.error('Failed to create spreadsheets for preparer', {
        preparerId,
        error,
      });
      throw error;
    }
  }

  /**
   * Sync preparer's clients to their sheet
   */
  async syncClientsSheet(preparerId: string): Promise<void> {
    const profile = await prisma.profile.findUnique({
      where: { id: preparerId },
      select: { googleSheetsClientsId: true },
    });

    if (!profile?.googleSheetsClientsId) {
      logger.warn('No clients sheet for preparer', { preparerId });
      return;
    }

    const sheets = await this.getClient();

    // Get clients assigned to this preparer
    const clientRelations = await prisma.clientPreparer.findMany({
      where: { preparerId },
      include: {
        client: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    // Get tax returns for client info
    const taxReturns = await prisma.taxReturn.findMany({
      where: {
        profileId: { in: clientRelations.map((c) => c.clientId) },
      },
      orderBy: { filedDate: 'desc' },
    });

    const returnsByClient = new Map<string, typeof taxReturns[0]>();
    for (const ret of taxReturns) {
      if (!returnsByClient.has(ret.profileId)) {
        returnsByClient.set(ret.profileId, ret);
      }
    }

    // Build data rows
    const rows = clientRelations.map((cp) => {
      const client = cp.client;
      const taxReturn = returnsByClient.get(cp.clientId);

      return [
        `${client.firstName || ''} ${client.lastName || ''}`.trim(),
        client.user?.email || '',
        client.phone || '',
        cp.isActive ? 'Active' : 'Inactive',
        taxReturn?.taxYear?.toString() || '',
        taxReturn?.status || '',
        taxReturn?.refundAmount?.toString() || '',
        taxReturn?.filedDate ? format(taxReturn.filedDate, 'yyyy-MM-dd') : '',
        '', // Referred By - would need to query referrals
        '',
      ];
    });

    // Clear existing data and write new
    await sheets.spreadsheets.values.clear({
      spreadsheetId: profile.googleSheetsClientsId,
      range: 'Data!A2:Z',
    });

    if (rows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: profile.googleSheetsClientsId,
        range: 'Data!A2',
        valueInputOption: 'RAW',
        requestBody: { values: rows },
      });
    }

    logger.info('Synced clients sheet', { preparerId, rowCount: rows.length });
  }

  /**
   * Sync preparer's leads to their sheet
   */
  async syncLeadsSheet(preparerId: string): Promise<void> {
    const profile = await prisma.profile.findUnique({
      where: { id: preparerId },
      select: { googleSheetsLeadsId: true },
    });

    if (!profile?.googleSheetsLeadsId) {
      logger.warn('No leads sheet for preparer', { preparerId });
      return;
    }

    const sheets = await this.getClient();

    // Get leads assigned to this preparer
    const leads = await prisma.taxIntakeLead.findMany({
      where: { assignedPreparerId: preparerId },
      orderBy: { created_at: 'desc' },
    });

    // Build data rows
    const rows = leads.map((lead) => [
      `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
      lead.email || '',
      lead.phone || '',
      lead.attributionMethod || 'Direct',
      lead.completed ? 'Complete' : 'Partial',
      lead.created_at ? format(lead.created_at, 'yyyy-MM-dd HH:mm') : '',
      '', // Last Contact - would need CRM data
      lead.referrerUsername || '',
      '',
    ]);

    // Clear existing data and write new
    await sheets.spreadsheets.values.clear({
      spreadsheetId: profile.googleSheetsLeadsId,
      range: 'Data!A2:Z',
    });

    if (rows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: profile.googleSheetsLeadsId,
        range: 'Data!A2',
        valueInputOption: 'RAW',
        requestBody: { values: rows },
      });
    }

    logger.info('Synced leads sheet', { preparerId, rowCount: rows.length });
  }

  /**
   * Sync preparer's commissions to their sheet
   */
  async syncCommissionsSheet(preparerId: string): Promise<void> {
    const profile = await prisma.profile.findUnique({
      where: { id: preparerId },
      select: { googleSheetsCommissionsId: true },
    });

    if (!profile?.googleSheetsCommissionsId) {
      logger.warn('No commissions sheet for preparer', { preparerId });
      return;
    }

    const sheets = await this.getClient();

    // Get commissions for this preparer (referrerId is the earner)
    const commissions = await prisma.commission.findMany({
      where: { referrerId: preparerId },
      include: {
        referral: {
          include: {
            client: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Build data rows
    const rows = commissions.map((comm) => {
      // Use clientName from commission if available, otherwise try referral
      const clientName = comm.clientName ||
        (comm.referral?.client
          ? `${comm.referral.client.firstName || ''} ${comm.referral.client.lastName || ''}`.trim()
          : 'Unknown');

      return [
        clientName,
        comm.sourceType || 'Referral',
        comm.amount.toString(),
        comm.status,
        comm.createdAt ? format(comm.createdAt, 'yyyy-MM-dd') : '',
        comm.paidAt ? format(comm.paidAt, 'yyyy-MM-dd') : '',
        comm.paymentMethod || '',
        '',
      ];
    });

    // Clear existing data and write new
    await sheets.spreadsheets.values.clear({
      spreadsheetId: profile.googleSheetsCommissionsId,
      range: 'Data!A2:Z',
    });

    if (rows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: profile.googleSheetsCommissionsId,
        range: 'Data!A2',
        valueInputOption: 'RAW',
        requestBody: { values: rows },
      });
    }

    logger.info('Synced commissions sheet', { preparerId, rowCount: rows.length });
  }

  /**
   * Sync preparer's performance metrics to their sheet
   */
  async syncPerformanceSheet(preparerId: string): Promise<void> {
    const profile = await prisma.profile.findUnique({
      where: { id: preparerId },
      select: { googleSheetsPerformanceId: true },
    });

    if (!profile?.googleSheetsPerformanceId) {
      logger.warn('No performance sheet for preparer', { preparerId });
      return;
    }

    const sheets = await this.getClient();

    // Get monthly metrics for the last 12 months
    const now = new Date();
    const rows: string[][] = [];

    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthLabel = format(monthStart, 'MMM yyyy');

      // Count leads
      const leadsCount = await prisma.taxIntakeLead.count({
        where: {
          assignedPreparerId: preparerId,
          created_at: { gte: monthStart, lte: monthEnd },
        },
      });

      // Count conversions (completed leads)
      const conversionsCount = await prisma.taxIntakeLead.count({
        where: {
          assignedPreparerId: preparerId,
          completed: true,
          created_at: { gte: monthStart, lte: monthEnd },
        },
      });

      // Count clients served
      const clientsServed = await prisma.clientPreparer.count({
        where: {
          preparerId,
          assignedAt: { gte: monthStart, lte: monthEnd },
        },
      });

      // Count returns filed
      const returnsCount = await prisma.taxReturn.count({
        where: {
          profileId: preparerId,
          filedDate: { gte: monthStart, lte: monthEnd },
        },
      });

      // Sum commissions earned
      const commissionsResult = await prisma.commission.aggregate({
        where: {
          referrerId: preparerId,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      });
      const commissionEarned = commissionsResult._sum?.amount?.toNumber() || 0;

      // Count referrals made
      const referralsCount = await prisma.referral.count({
        where: {
          referrerId: preparerId,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      });

      rows.push([
        monthLabel,
        leadsCount.toString(),
        conversionsCount.toString(),
        clientsServed.toString(),
        returnsCount.toString(),
        '', // Revenue - would need payment data
        `$${commissionEarned.toFixed(2)}`,
        referralsCount.toString(),
      ]);
    }

    // Clear existing data and write new
    await sheets.spreadsheets.values.clear({
      spreadsheetId: profile.googleSheetsPerformanceId,
      range: 'Data!A2:Z',
    });

    if (rows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: profile.googleSheetsPerformanceId,
        range: 'Data!A2',
        valueInputOption: 'RAW',
        requestBody: { values: rows },
      });
    }

    logger.info('Synced performance sheet', { preparerId, months: rows.length });
  }

  /**
   * Sync all sheets for a preparer
   * Returns true if all syncs succeeded, false if any failed
   */
  async syncAllSheets(preparerId: string): Promise<{ success: boolean; errors: string[] }> {
    logger.info('Starting full sync for preparer', { preparerId });

    const errors: string[] = [];

    // Sync each sheet individually, catching errors to continue with others
    try {
      await this.syncClientsSheet(preparerId);
    } catch (error) {
      const msg = `Clients sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logger.error(msg, { preparerId, error });
      errors.push(msg);
    }

    try {
      await this.syncLeadsSheet(preparerId);
    } catch (error) {
      const msg = `Leads sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logger.error(msg, { preparerId, error });
      errors.push(msg);
    }

    try {
      await this.syncCommissionsSheet(preparerId);
    } catch (error) {
      const msg = `Commissions sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logger.error(msg, { preparerId, error });
      errors.push(msg);
    }

    try {
      await this.syncPerformanceSheet(preparerId);
    } catch (error) {
      const msg = `Performance sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logger.error(msg, { preparerId, error });
      errors.push(msg);
    }

    // Update last sync timestamp even if some syncs failed
    await prisma.profile.update({
      where: { id: preparerId },
      data: { googleSheetsLastSync: new Date() },
    });

    const success = errors.length === 0;
    logger.info('Completed full sync for preparer', { preparerId, success, errorCount: errors.length });

    return { success, errors };
  }

  /**
   * Backfill sheets for all existing preparers who have folders but no sheets
   */
  async backfillPreparerSheets(): Promise<{
    success: number;
    failed: number;
    skipped: number;
  }> {
    logger.info('Starting preparer sheets backfill');

    // Get preparers with Drive folders but no sheets
    const preparers = await prisma.profile.findMany({
      where: {
        role: 'tax_preparer',
        googleDriveFolderId: { not: null },
        googleSheetsClientsId: null,
      },
    });

    logger.info(`Found ${preparers.length} preparers needing sheets`);

    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const preparer of preparers) {
      if (!preparer.googleDriveFolderId) {
        skipped++;
        continue;
      }

      const name = `${preparer.firstName} ${preparer.lastName}`.trim() || 'Unknown';

      try {
        await this.createPreparerSpreadsheets(
          preparer.id,
          name,
          preparer.googleDriveFolderId
        );

        // Initial sync
        await this.syncAllSheets(preparer.id);

        success++;
      } catch (error) {
        logger.error('Failed to create sheets for preparer', {
          preparerId: preparer.id,
          error,
        });
        failed++;
      }

      // Delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    logger.info('Preparer sheets backfill complete', {
      success,
      failed,
      skipped,
      total: preparers.length,
    });

    return { success, failed, skipped };
  }
}

export const googleSheetsPreparerService = new GoogleSheetsPreparerService();
