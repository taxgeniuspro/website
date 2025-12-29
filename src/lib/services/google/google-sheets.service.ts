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
import { db, firstOrNull } from '@/lib/db';
import { googleAuthService } from './google-auth.service';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
type GoogleSheetType = 'PAYOUTS' | 'COMMISSIONS' | 'LEADS' | 'PREPARER_PERFORMANCE' | 'DAILY_REVENUE';
type GoogleSyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

interface GoogleSheetSyncRecord {
  id: string;
  sheetType: string;
  spreadsheetId: string;
  spreadsheetUrl?: string | null;
  sheetName: string;
  lastSyncAt?: Date | string | null;
  rowCount: number;
  syncStatus: string;
  lastError?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface PayoutRequestRecord {
  id: string;
  amount: number | string;
  status: string;
  paymentMethod?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  processedAt?: Date | string | null;
  profileId: string;
}

interface CommissionRecord {
  id: string;
  amount: number | string;
  status: string;
  sourceType?: string | null;
  sourceId?: string | null;
  createdAt: Date | string;
  approvedAt?: Date | string | null;
  referrerId: string;
}

interface TaxIntakeLeadRecord {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  completed?: boolean | null;
  urgency?: string | null;
  referrerUsername?: string | null;
  attributionMethod?: string | null;
  created_at: Date | string;
  lastContactedAt?: Date | string | null;
  assignedPreparerId?: string | null;
}

interface ProfileRecord {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  totalConversions?: number | null;
  lifetimeEarnings?: number | null;
  updatedAt: Date | string;
  userId?: string | null;
}

interface UserRecord {
  id: string;
  email: string;
}

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

      // Save to database (upsert via check + insert/update)
      const { data: existingData } = await db
        .from('google_sheet_syncs')
        .select('id')
        .eq('sheetType', sheetType)
        .limit(1);

      const existing = firstOrNull(existingData);

      if (existing) {
        await db
          .from('google_sheet_syncs')
          .update({
            spreadsheetId,
            spreadsheetUrl,
            sheetName: 'Data',
            syncStatus: 'PENDING',
          })
          .eq('sheetType', sheetType);
      } else {
        await db
          .from('google_sheet_syncs')
          .insert({
            sheetType,
            spreadsheetId,
            spreadsheetUrl,
            sheetName: 'Data',
            syncStatus: 'PENDING',
          });
      }

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
    const { data: existingData } = await db
      .from('google_sheet_syncs')
      .select('*')
      .eq('sheetType', sheetType)
      .limit(1);

    const existing = firstOrNull(existingData) as GoogleSheetSyncRecord | null;

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

    // Update status to syncing (upsert)
    const { data: existingSyncData } = await db
      .from('google_sheet_syncs')
      .select('id')
      .eq('sheetType', sheetType)
      .limit(1);

    if (firstOrNull(existingSyncData)) {
      await db
        .from('google_sheet_syncs')
        .update({ syncStatus: 'SYNCING' })
        .eq('sheetType', sheetType);
    } else {
      await db.from('google_sheet_syncs').insert({
        sheetType,
        spreadsheetId: '',
        sheetName: 'Data',
        syncStatus: 'SYNCING',
      });
    }

    try {
      const { spreadsheetId, spreadsheetUrl } =
        await this.getOrCreateSpreadsheet(sheetType);

      // Fetch all payout requests
      const { data: payoutsData } = await db
        .from('payout_requests')
        .select('id, amount, status, paymentMethod, notes, createdAt, processedAt, profileId')
        .order('createdAt', { ascending: false });

      const payouts = (payoutsData || []) as PayoutRequestRecord[];

      // Fetch related profiles
      const profileIds = [...new Set(payouts.map((p) => p.profileId).filter(Boolean))];
      const { data: profilesData } = profileIds.length > 0
        ? await db.from('profiles').select('id, firstName, lastName, userId').in('id', profileIds)
        : { data: [] };

      const profiles = (profilesData || []) as ProfileRecord[];
      const profileMap = new Map(profiles.map((p) => [p.id, p]));

      // Fetch user emails
      const userIds = [...new Set(profiles.map((p) => p.userId).filter(Boolean))] as string[];
      const { data: usersData } = userIds.length > 0
        ? await db.from('users').select('id, email').in('id', userIds)
        : { data: [] };

      const users = (usersData || []) as UserRecord[];
      const userMap = new Map(users.map((u) => [u.id, u]));

      // Clear existing data
      await this.clearSheet(spreadsheetId);

      // Transform data to rows
      const rows = payouts.map((p) => {
        const profile = profileMap.get(p.profileId);
        const user = profile?.userId ? userMap.get(profile.userId) : null;
        return [
          p.id,
          `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Unknown',
          user?.email || '',
          p.amount.toString(),
          p.status,
          p.paymentMethod || '',
          new Date(p.createdAt).toISOString(),
          p.processedAt ? new Date(p.processedAt).toISOString() : '',
          p.notes || '',
        ];
      });

      // Append rows
      const rowCount = rows.length > 0 ? await this.appendRows(spreadsheetId, rows) : 0;

      // Update sync status
      await db
        .from('google_sheet_syncs')
        .update({
          lastSyncAt: new Date().toISOString(),
          rowCount,
          syncStatus: 'SYNCED',
          lastError: null,
        })
        .eq('sheetType', sheetType);

      logger.info(`Synced ${rowCount} payouts to Google Sheets`);
      return { rowCount, spreadsheetUrl };
    } catch (error) {
      await db
        .from('google_sheet_syncs')
        .update({
          syncStatus: 'FAILED',
          lastError: (error as Error).message,
        })
        .eq('sheetType', sheetType);
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

    // Update status to syncing (upsert)
    const { data: existingSyncData } = await db
      .from('google_sheet_syncs')
      .select('id')
      .eq('sheetType', sheetType)
      .limit(1);

    if (firstOrNull(existingSyncData)) {
      await db
        .from('google_sheet_syncs')
        .update({ syncStatus: 'SYNCING' })
        .eq('sheetType', sheetType);
    } else {
      await db.from('google_sheet_syncs').insert({
        sheetType,
        spreadsheetId: '',
        sheetName: 'Data',
        syncStatus: 'SYNCING',
      });
    }

    try {
      const { spreadsheetId, spreadsheetUrl } =
        await this.getOrCreateSpreadsheet(sheetType);

      // Fetch all commissions
      const { data: commissionsData } = await db
        .from('commissions')
        .select('id, amount, status, sourceType, sourceId, createdAt, approvedAt, referrerId')
        .order('createdAt', { ascending: false });

      const commissions = (commissionsData || []) as CommissionRecord[];

      // Fetch related profiles (referrers)
      const referrerIds = [...new Set(commissions.map((c) => c.referrerId).filter(Boolean))];
      const { data: profilesData } = referrerIds.length > 0
        ? await db.from('profiles').select('id, firstName, lastName, role').in('id', referrerIds)
        : { data: [] };

      const profiles = (profilesData || []) as ProfileRecord[];
      const profileMap = new Map(profiles.map((p) => [p.id, p]));

      await this.clearSheet(spreadsheetId);

      const rows = commissions.map((c) => {
        const profile = profileMap.get(c.referrerId);
        return [
          c.id,
          `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() ||
            'Unknown',
          profile?.role || '',
          c.sourceId || '', // Lead/Client ID
          c.amount.toString(),
          c.status,
          c.sourceType || '',
          new Date(c.createdAt).toISOString(),
          c.approvedAt ? new Date(c.approvedAt).toISOString() : '',
        ];
      });

      const rowCount = rows.length > 0 ? await this.appendRows(spreadsheetId, rows) : 0;

      await db
        .from('google_sheet_syncs')
        .update({
          lastSyncAt: new Date().toISOString(),
          rowCount,
          syncStatus: 'SYNCED',
          lastError: null,
        })
        .eq('sheetType', sheetType);

      logger.info(`Synced ${rowCount} commissions to Google Sheets`);
      return { rowCount, spreadsheetUrl };
    } catch (error) {
      await db
        .from('google_sheet_syncs')
        .update({
          syncStatus: 'FAILED',
          lastError: (error as Error).message,
        })
        .eq('sheetType', sheetType);
      throw error;
    }
  }

  /**
   * Sync Leads data to Google Sheets
   */
  async syncLeads(): Promise<{ rowCount: number; spreadsheetUrl: string }> {
    const sheetType: GoogleSheetType = 'LEADS';

    // Update status to syncing (upsert)
    const { data: existingSyncData } = await db
      .from('google_sheet_syncs')
      .select('id')
      .eq('sheetType', sheetType)
      .limit(1);

    if (firstOrNull(existingSyncData)) {
      await db
        .from('google_sheet_syncs')
        .update({ syncStatus: 'SYNCING' })
        .eq('sheetType', sheetType);
    } else {
      await db.from('google_sheet_syncs').insert({
        sheetType,
        spreadsheetId: '',
        sheetName: 'Data',
        syncStatus: 'SYNCING',
      });
    }

    try {
      const { spreadsheetId, spreadsheetUrl } =
        await this.getOrCreateSpreadsheet(sheetType);

      // Fetch tax intake leads
      const { data: leadsData } = await db
        .from('tax_intake_leads')
        .select('id, first_name, last_name, email, phone, completed, urgency, referrerUsername, attributionMethod, created_at, lastContactedAt, assignedPreparerId')
        .order('created_at', { ascending: false });

      const leads = (leadsData || []) as TaxIntakeLeadRecord[];

      // Fetch assigned preparer profiles
      const preparerIds = [...new Set(leads.map((l) => l.assignedPreparerId).filter(Boolean))] as string[];
      const { data: preparersData } = preparerIds.length > 0
        ? await db.from('profiles').select('id, firstName, lastName').in('id', preparerIds)
        : { data: [] };

      const preparers = (preparersData || []) as ProfileRecord[];
      const preparerMap = new Map(preparers.map((p) => [p.id, p]));

      await this.clearSheet(spreadsheetId);

      const rows = leads.map((l) => {
        const preparer = l.assignedPreparerId ? preparerMap.get(l.assignedPreparerId) : null;
        // Map completed/urgency to status display
        const status = l.completed ? 'Completed' : (l.urgency || 'Pending');
        return [
          l.id,
          `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Unknown',
          l.email || '',
          l.phone || '',
          status,
          preparer
            ? `${preparer.firstName || ''} ${preparer.lastName || ''}`.trim()
            : 'Unassigned',
          l.referrerUsername || '',
          l.attributionMethod || 'Direct',
          new Date(l.created_at).toISOString(),
          l.lastContactedAt ? new Date(l.lastContactedAt).toISOString() : '',
        ];
      });

      const rowCount = rows.length > 0 ? await this.appendRows(spreadsheetId, rows) : 0;

      await db
        .from('google_sheet_syncs')
        .update({
          lastSyncAt: new Date().toISOString(),
          rowCount,
          syncStatus: 'SYNCED',
          lastError: null,
        })
        .eq('sheetType', sheetType);

      logger.info(`Synced ${rowCount} leads to Google Sheets`);
      return { rowCount, spreadsheetUrl };
    } catch (error) {
      await db
        .from('google_sheet_syncs')
        .update({
          syncStatus: 'FAILED',
          lastError: (error as Error).message,
        })
        .eq('sheetType', sheetType);
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

    // Update status to syncing (upsert)
    const { data: existingSyncData } = await db
      .from('google_sheet_syncs')
      .select('id')
      .eq('sheetType', sheetType)
      .limit(1);

    if (firstOrNull(existingSyncData)) {
      await db
        .from('google_sheet_syncs')
        .update({ syncStatus: 'SYNCING' })
        .eq('sheetType', sheetType);
    } else {
      await db.from('google_sheet_syncs').insert({
        sheetType,
        spreadsheetId: '',
        sheetName: 'Data',
        syncStatus: 'SYNCING',
      });
    }

    try {
      const { spreadsheetId, spreadsheetUrl } =
        await this.getOrCreateSpreadsheet(sheetType);

      // Fetch all tax preparers
      const { data: preparersData } = await db
        .from('profiles')
        .select('id, firstName, lastName, role, totalConversions, lifetimeEarnings, updatedAt, userId')
        .eq('role', 'tax_preparer');

      const preparers = (preparersData || []) as ProfileRecord[];
      const preparerIds = preparers.map((p) => p.id);

      // Fetch users for email
      const userIds = [...new Set(preparers.map((p) => p.userId).filter(Boolean))] as string[];
      const { data: usersData } = userIds.length > 0
        ? await db.from('users').select('id, email').in('id', userIds)
        : { data: [] };
      const users = (usersData || []) as UserRecord[];
      const userMap = new Map(users.map((u) => [u.id, u]));

      // Count clients per preparer
      const { data: clientsData } = preparerIds.length > 0
        ? await db.from('profiles').select('id, assignedPreparerId').in('assignedPreparerId', preparerIds)
        : { data: [] };
      const clientCountMap = new Map<string, number>();
      ((clientsData || []) as { id: string; assignedPreparerId: string }[]).forEach((c) => {
        clientCountMap.set(c.assignedPreparerId, (clientCountMap.get(c.assignedPreparerId) || 0) + 1);
      });

      // Count active leads per preparer (not yet converted, not unqualified)
      const { data: leadsData } = preparerIds.length > 0
        ? await db
            .from('tax_intake_leads')
            .select('id, assignedPreparerId')
            .in('assignedPreparerId', preparerIds)
            .eq('convertedToClient', false)
            .eq('unqualified', false)
        : { data: [] };
      const leadCountMap = new Map<string, number>();
      ((leadsData || []) as { id: string; assignedPreparerId: string }[]).forEach((l) => {
        leadCountMap.set(l.assignedPreparerId, (leadCountMap.get(l.assignedPreparerId) || 0) + 1);
      });

      // Sum paid commissions per preparer
      const { data: commissionsData } = preparerIds.length > 0
        ? await db
            .from('commissions')
            .select('id, amount, referrerId')
            .in('referrerId', preparerIds)
            .eq('status', 'PAID')
        : { data: [] };
      const commissionSumMap = new Map<string, number>();
      ((commissionsData || []) as { id: string; amount: number | string; referrerId: string }[]).forEach((c) => {
        commissionSumMap.set(c.referrerId, (commissionSumMap.get(c.referrerId) || 0) + Number(c.amount));
      });

      await this.clearSheet(spreadsheetId);

      const rows = preparers.map((p) => {
        const user = p.userId ? userMap.get(p.userId) : null;
        const totalClients = clientCountMap.get(p.id) || 0;
        const activeLeads = leadCountMap.get(p.id) || 0;
        const totalCommissionPaid = commissionSumMap.get(p.id) || 0;

        return [
          `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown',
          user?.email || '',
          totalClients.toString(),
          activeLeads.toString(),
          p.totalConversions?.toString() || '0',
          p.lifetimeEarnings?.toString() || '0',
          totalCommissionPaid.toString(),
          '', // Avg Rating - not implemented yet
          new Date(p.updatedAt).toISOString(),
        ];
      });

      const rowCount = rows.length > 0 ? await this.appendRows(spreadsheetId, rows) : 0;

      await db
        .from('google_sheet_syncs')
        .update({
          lastSyncAt: new Date().toISOString(),
          rowCount,
          syncStatus: 'SYNCED',
          lastError: null,
        })
        .eq('sheetType', sheetType);

      logger.info(`Synced ${rowCount} preparer stats to Google Sheets`);
      return { rowCount, spreadsheetUrl };
    } catch (error) {
      await db
        .from('google_sheet_syncs')
        .update({
          syncStatus: 'FAILED',
          lastError: (error as Error).message,
        })
        .eq('sheetType', sheetType);
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
    const { data } = await db
      .from('google_sheet_syncs')
      .select('sheetType, spreadsheetUrl, lastSyncAt, rowCount, syncStatus, lastError');

    return ((data || []) as GoogleSheetSyncRecord[]).map((sync) => ({
      sheetType: sync.sheetType as GoogleSheetType,
      spreadsheetUrl: sync.spreadsheetUrl || null,
      lastSyncAt: sync.lastSyncAt ? new Date(sync.lastSyncAt) : null,
      rowCount: sync.rowCount,
      syncStatus: sync.syncStatus as GoogleSyncStatus,
      lastError: sync.lastError || null,
    }));
  }
}

// Export singleton instance
export const googleSheetsService = new GoogleSheetsService();
