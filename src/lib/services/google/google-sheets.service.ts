/**
 * Google Sheets Service - Company Data Sync
 *
 * Syncs Tax Genius data to Google Sheets for easy viewing and sharing.
 * All sheets are created in the taxgenius.tax@gmail.com account.
 *
 * Sheets:
 * - Payouts Tracker: All payout requests with status
 * - Commission Report: Commissions by preparer/affiliate
 * - Preparer Performance: Clients, returns, revenue per preparer
 * - Lead Pipeline: All leads with status and owner
 */

import { sheets_v4 } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { googleAuthService } from './google-auth.service';
import { logger } from '@/lib/logger';
import { GoogleSheetType, GoogleSyncStatus } from '@prisma/client';

// Sheet configurations
const SHEET_CONFIGS: Record<
  GoogleSheetType,
  {
    title: string;
    headers: string[];
  }
> = {
  PAYOUTS: {
    title: 'Tax Genius - Payouts Tracker',
    headers: [
      'ID',
      'Requester Name',
      'Email',
      'Amount',
      'Status',
      'Payment Method',
      'Requested At',
      'Processed At',
      'Notes',
    ],
  },
  COMMISSIONS: {
    title: 'Tax Genius - Commission Report',
    headers: [
      'ID',
      'Referrer Name',
      'Referrer Type',
      'Lead/Client Name',
      'Amount',
      'Status',
      'Source Type',
      'Created At',
      'Approved At',
    ],
  },
  LEADS: {
    title: 'Tax Genius - Lead Pipeline',
    headers: [
      'ID',
      'Name',
      'Email',
      'Phone',
      'Status',
      'Assigned Preparer',
      'Referrer',
      'Source',
      'Created At',
      'Last Contacted',
    ],
  },
  PREPARER_PERFORMANCE: {
    title: 'Tax Genius - Preparer Performance',
    headers: [
      'Preparer Name',
      'Email',
      'Total Clients',
      'Active Leads',
      'Returns Filed',
      'Total Revenue',
      'Commission Paid',
      'Avg Rating',
      'Last Active',
    ],
  },
  DAILY_REVENUE: {
    title: 'Tax Genius - Daily Revenue',
    headers: [
      'Date',
      'New Leads',
      'Conversions',
      'Returns Filed',
      'Revenue',
      'Commissions Owed',
      'Commissions Paid',
    ],
  },
};

class GoogleSheetsService {
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
   * Create a new spreadsheet
   */
  async createSpreadsheet(
    sheetType: GoogleSheetType
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const sheets = await this.getClient();
    const config = SHEET_CONFIGS[sheetType];

    try {
      const response = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: config.title,
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

      const spreadsheetId = response.data.spreadsheetId!;
      const spreadsheetUrl = response.data.spreadsheetUrl!;

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Data!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [config.headers],
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
                    textFormat: {
                      bold: true,
                      foregroundColor: { red: 1, green: 1, blue: 1 },
                    },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
            // Auto-resize columns
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: 0,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: config.headers.length,
                },
              },
            },
          ],
        },
      });

      // Save to database
      await prisma.googleSheetSync.upsert({
        where: { sheetType },
        update: {
          spreadsheetId,
          spreadsheetUrl,
          sheetName: 'Data',
          syncStatus: 'PENDING',
        },
        create: {
          sheetType,
          spreadsheetId,
          spreadsheetUrl,
          sheetName: 'Data',
          syncStatus: 'PENDING',
        },
      });

      logger.info(`Created Google Sheet for ${sheetType}`, {
        spreadsheetId,
        spreadsheetUrl,
      });

      return { spreadsheetId, spreadsheetUrl };
    } catch (error) {
      logger.error(`Failed to create spreadsheet for ${sheetType}`, { error });
      throw error;
    }
  }

  /**
   * Get or create spreadsheet for a sheet type
   */
  async getOrCreateSpreadsheet(
    sheetType: GoogleSheetType
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const existing = await prisma.googleSheetSync.findUnique({
      where: { sheetType },
    });

    if (existing?.spreadsheetId) {
      return {
        spreadsheetId: existing.spreadsheetId,
        spreadsheetUrl: existing.spreadsheetUrl || '',
      };
    }

    return this.createSpreadsheet(sheetType);
  }

  /**
   * Clear all data from a sheet (except headers)
   */
  async clearSheet(spreadsheetId: string): Promise<void> {
    const sheets = await this.getClient();

    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: 'Data!A2:Z', // Clear everything except header row
      });
    } catch (error) {
      logger.error('Failed to clear sheet', { spreadsheetId, error });
      throw error;
    }
  }

  /**
   * Append rows to a sheet
   */
  async appendRows(
    spreadsheetId: string,
    rows: (string | number | null)[][]
  ): Promise<number> {
    const sheets = await this.getClient();

    try {
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Data!A:Z',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: rows,
        },
      });

      return response.data.updates?.updatedRows || 0;
    } catch (error) {
      logger.error('Failed to append rows', { spreadsheetId, error });
      throw error;
    }
  }

  /**
   * Sync Payouts data to Google Sheets
   */
  async syncPayouts(): Promise<{ rowCount: number; spreadsheetUrl: string }> {
    const sheetType: GoogleSheetType = 'PAYOUTS';

    // Update status to syncing
    await prisma.googleSheetSync.upsert({
      where: { sheetType },
      update: { syncStatus: 'SYNCING' },
      create: {
        sheetType,
        spreadsheetId: '',
        sheetName: 'Data',
        syncStatus: 'SYNCING',
      },
    });

    try {
      const { spreadsheetId, spreadsheetUrl } =
        await this.getOrCreateSpreadsheet(sheetType);

      // Fetch all payout requests with related data
      const payouts = await prisma.payoutRequest.findMany({
        include: {
          profile: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Clear existing data
      await this.clearSheet(spreadsheetId);

      // Transform data to rows
      const rows = payouts.map((p) => [
        p.id,
        `${p.profile?.firstName || ''} ${p.profile?.lastName || ''}`.trim() ||
          'Unknown',
        p.profile?.user?.email || '',
        p.amount.toString(),
        p.status,
        p.paymentMethod || '',
        p.createdAt.toISOString(),
        p.processedAt?.toISOString() || '',
        p.notes || '',
      ]);

      // Append rows
      const rowCount = rows.length > 0 ? await this.appendRows(spreadsheetId, rows) : 0;

      // Update sync status
      await prisma.googleSheetSync.update({
        where: { sheetType },
        data: {
          lastSyncAt: new Date(),
          rowCount,
          syncStatus: 'SYNCED',
          lastError: null,
        },
      });

      logger.info(`Synced ${rowCount} payouts to Google Sheets`);
      return { rowCount, spreadsheetUrl };
    } catch (error) {
      await prisma.googleSheetSync.update({
        where: { sheetType },
        data: {
          syncStatus: 'FAILED',
          lastError: (error as Error).message,
        },
      });
      throw error;
    }
  }

  /**
   * Sync Commissions data to Google Sheets
   */
  async syncCommissions(): Promise<{
    rowCount: number;
    spreadsheetUrl: string;
  }> {
    const sheetType: GoogleSheetType = 'COMMISSIONS';

    await prisma.googleSheetSync.upsert({
      where: { sheetType },
      update: { syncStatus: 'SYNCING' },
      create: {
        sheetType,
        spreadsheetId: '',
        sheetName: 'Data',
        syncStatus: 'SYNCING',
      },
    });

    try {
      const { spreadsheetId, spreadsheetUrl } =
        await this.getOrCreateSpreadsheet(sheetType);

      // Fetch all commissions with related data
      const commissions = await prisma.commission.findMany({
        include: {
          profile: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      await this.clearSheet(spreadsheetId);

      const rows = commissions.map((c) => [
        c.id,
        `${c.profile?.firstName || ''} ${c.profile?.lastName || ''}`.trim() ||
          'Unknown',
        c.profile?.role || '',
        c.sourceId || '', // Lead/Client ID
        c.amount.toString(),
        c.status,
        c.sourceType || '',
        c.createdAt.toISOString(),
        c.approvedAt?.toISOString() || '',
      ]);

      const rowCount = rows.length > 0 ? await this.appendRows(spreadsheetId, rows) : 0;

      await prisma.googleSheetSync.update({
        where: { sheetType },
        data: {
          lastSyncAt: new Date(),
          rowCount,
          syncStatus: 'SYNCED',
          lastError: null,
        },
      });

      logger.info(`Synced ${rowCount} commissions to Google Sheets`);
      return { rowCount, spreadsheetUrl };
    } catch (error) {
      await prisma.googleSheetSync.update({
        where: { sheetType },
        data: {
          syncStatus: 'FAILED',
          lastError: (error as Error).message,
        },
      });
      throw error;
    }
  }

  /**
   * Sync Leads data to Google Sheets
   */
  async syncLeads(): Promise<{ rowCount: number; spreadsheetUrl: string }> {
    const sheetType: GoogleSheetType = 'LEADS';

    await prisma.googleSheetSync.upsert({
      where: { sheetType },
      update: { syncStatus: 'SYNCING' },
      create: {
        sheetType,
        spreadsheetId: '',
        sheetName: 'Data',
        syncStatus: 'SYNCING',
      },
    });

    try {
      const { spreadsheetId, spreadsheetUrl } =
        await this.getOrCreateSpreadsheet(sheetType);

      // Fetch tax intake leads
      const leads = await prisma.taxIntakeLead.findMany({
        include: {
          assignedPreparer: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      await this.clearSheet(spreadsheetId);

      const rows = leads.map((l) => [
        l.id,
        `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'Unknown',
        l.email || '',
        l.phone || '',
        l.leadStatus || '',
        l.assignedPreparer
          ? `${l.assignedPreparer.firstName || ''} ${l.assignedPreparer.lastName || ''}`.trim()
          : 'Unassigned',
        l.referrerUsername || '',
        l.leadSource || '',
        l.createdAt.toISOString(),
        l.lastContactedAt?.toISOString() || '',
      ]);

      const rowCount = rows.length > 0 ? await this.appendRows(spreadsheetId, rows) : 0;

      await prisma.googleSheetSync.update({
        where: { sheetType },
        data: {
          lastSyncAt: new Date(),
          rowCount,
          syncStatus: 'SYNCED',
          lastError: null,
        },
      });

      logger.info(`Synced ${rowCount} leads to Google Sheets`);
      return { rowCount, spreadsheetUrl };
    } catch (error) {
      await prisma.googleSheetSync.update({
        where: { sheetType },
        data: {
          syncStatus: 'FAILED',
          lastError: (error as Error).message,
        },
      });
      throw error;
    }
  }

  /**
   * Sync Preparer Performance data to Google Sheets
   */
  async syncPreparerPerformance(): Promise<{
    rowCount: number;
    spreadsheetUrl: string;
  }> {
    const sheetType: GoogleSheetType = 'PREPARER_PERFORMANCE';

    await prisma.googleSheetSync.upsert({
      where: { sheetType },
      update: { syncStatus: 'SYNCING' },
      create: {
        sheetType,
        spreadsheetId: '',
        sheetName: 'Data',
        syncStatus: 'SYNCING',
      },
    });

    try {
      const { spreadsheetId, spreadsheetUrl } =
        await this.getOrCreateSpreadsheet(sheetType);

      // Fetch all tax preparers with stats
      const preparers = await prisma.profile.findMany({
        where: { role: 'tax_preparer' },
        include: {
          user: true,
          preparerClients: true,
          taxIntakeLeads: {
            where: {
              leadStatus: { in: ['new', 'contacted', 'qualified'] },
            },
          },
          commissions: {
            where: { status: 'PAID' },
          },
        },
      });

      await this.clearSheet(spreadsheetId);

      const rows = preparers.map((p) => {
        const totalClients = p.preparerClients?.length || 0;
        const activeLeads = p.taxIntakeLeads?.length || 0;
        const totalCommissionPaid = p.commissions?.reduce(
          (sum, c) => sum + Number(c.amount),
          0
        ) || 0;

        return [
          `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown',
          p.user?.email || '',
          totalClients.toString(),
          activeLeads.toString(),
          p.totalConversions?.toString() || '0',
          p.lifetimeEarnings?.toString() || '0',
          totalCommissionPaid.toString(),
          '', // Avg Rating - not implemented yet
          p.updatedAt.toISOString(),
        ];
      });

      const rowCount = rows.length > 0 ? await this.appendRows(spreadsheetId, rows) : 0;

      await prisma.googleSheetSync.update({
        where: { sheetType },
        data: {
          lastSyncAt: new Date(),
          rowCount,
          syncStatus: 'SYNCED',
          lastError: null,
        },
      });

      logger.info(`Synced ${rowCount} preparer stats to Google Sheets`);
      return { rowCount, spreadsheetUrl };
    } catch (error) {
      await prisma.googleSheetSync.update({
        where: { sheetType },
        data: {
          syncStatus: 'FAILED',
          lastError: (error as Error).message,
        },
      });
      throw error;
    }
  }

  /**
   * Sync all sheets
   */
  async syncAll(): Promise<{
    payouts: { rowCount: number; spreadsheetUrl: string };
    commissions: { rowCount: number; spreadsheetUrl: string };
    leads: { rowCount: number; spreadsheetUrl: string };
    preparerPerformance: { rowCount: number; spreadsheetUrl: string };
  }> {
    logger.info('Starting full Google Sheets sync');

    const [payouts, commissions, leads, preparerPerformance] =
      await Promise.all([
        this.syncPayouts(),
        this.syncCommissions(),
        this.syncLeads(),
        this.syncPreparerPerformance(),
      ]);

    logger.info('Completed full Google Sheets sync');

    return { payouts, commissions, leads, preparerPerformance };
  }

  /**
   * Get all sheet sync statuses
   */
  async getSyncStatuses(): Promise<
    {
      sheetType: GoogleSheetType;
      spreadsheetUrl: string | null;
      lastSyncAt: Date | null;
      rowCount: number;
      syncStatus: GoogleSyncStatus;
      lastError: string | null;
    }[]
  > {
    return prisma.googleSheetSync.findMany({
      select: {
        sheetType: true,
        spreadsheetUrl: true,
        lastSyncAt: true,
        rowCount: true,
        syncStatus: true,
        lastError: true,
      },
    });
  }
}

// Export singleton instance
export const googleSheetsService = new GoogleSheetsService();
