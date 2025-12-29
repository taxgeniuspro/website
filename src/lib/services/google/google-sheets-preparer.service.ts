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
import { db, firstOrNull } from '@/lib/db';
import { googleAuthService } from './google-auth.service';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';

// Local type definitions (replacing @prisma/client)
interface ProfileRecord {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role?: string | null;
  userId?: string | null;
  googleDriveFolderId?: string | null;
  googleSheetsClientsId?: string | null;
  googleSheetsLeadsId?: string | null;
  googleSheetsCommissionsId?: string | null;
  googleSheetsPerformanceId?: string | null;
}

interface ClientPreparerRecord {
  id: string;
  preparerId: string;
  clientId: string;
  isActive: boolean;
  assignedAt: Date | string;
}

interface TaxReturnRecord {
  id: string;
  profileId: string;
  taxYear?: number | null;
  status?: string | null;
  refundAmount?: number | string | null;
  filedDate?: Date | string | null;
}

interface TaxIntakeLeadRecord {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  attributionMethod?: string | null;
  completed?: boolean | null;
  referrerUsername?: string | null;
  assignedPreparerId?: string | null;
  created_at?: Date | string | null;
}

interface CommissionRecord {
  id: string;
  amount: number | string;
  status: string;
  sourceType?: string | null;
  clientName?: string | null;
  paymentMethod?: string | null;
  referrerId: string;
  referralId?: string | null;
  createdAt: Date | string;
  paidAt?: Date | string | null;
}

interface ReferralRecord {
  id: string;
  clientId?: string | null;
}

interface UserRecord {
  id: string;
  email: string;
}

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
      await db
        .from('profiles')
        .update({
          googleSheetsClientsId: clients.spreadsheetId,
          googleSheetsLeadsId: leads.spreadsheetId,
          googleSheetsCommissionsId: commissions.spreadsheetId,
          googleSheetsPerformanceId: performance.spreadsheetId,
        })
        .eq('id', preparerId);

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
    const { data: profileData } = await db
      .from('profiles')
      .select('googleSheetsClientsId')
      .eq('id', preparerId)
      .limit(1);

    const profile = firstOrNull(profileData) as { googleSheetsClientsId: string | null } | null;

    if (!profile?.googleSheetsClientsId) {
      logger.warn('No clients sheet for preparer', { preparerId });
      return;
    }

    const sheets = await this.getClient();

    // Get client-preparer relations
    const { data: relationsData } = await db
      .from('client_preparers')
      .select('id, preparerId, clientId, isActive, assignedAt')
      .eq('preparerId', preparerId)
      .order('assignedAt', { ascending: false });

    const clientRelations = (relationsData || []) as ClientPreparerRecord[];

    // Get client profiles
    const clientIds = clientRelations.map((c) => c.clientId);
    const { data: clientsData } = clientIds.length > 0
      ? await db.from('profiles').select('id, firstName, lastName, phone, userId').in('id', clientIds)
      : { data: [] };
    const clients = (clientsData || []) as ProfileRecord[];
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    // Get user emails
    const userIds = [...new Set(clients.map((c) => c.userId).filter(Boolean))] as string[];
    const { data: usersData } = userIds.length > 0
      ? await db.from('users').select('id, email').in('id', userIds)
      : { data: [] };
    const users = (usersData || []) as UserRecord[];
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Get tax returns for client info
    const { data: taxReturnsData } = clientIds.length > 0
      ? await db
          .from('tax_returns')
          .select('id, profileId, taxYear, status, refundAmount, filedDate')
          .in('profileId', clientIds)
          .order('filedDate', { ascending: false })
      : { data: [] };

    const taxReturns = (taxReturnsData || []) as TaxReturnRecord[];
    const returnsByClient = new Map<string, TaxReturnRecord>();
    for (const ret of taxReturns) {
      if (!returnsByClient.has(ret.profileId)) {
        returnsByClient.set(ret.profileId, ret);
      }
    }

    // Build data rows
    const rows = clientRelations.map((cp) => {
      const client = clientMap.get(cp.clientId);
      const user = client?.userId ? userMap.get(client.userId) : null;
      const taxReturn = returnsByClient.get(cp.clientId);
      const filedDateStr = taxReturn?.filedDate
        ? format(new Date(taxReturn.filedDate), 'yyyy-MM-dd')
        : '';

      return [
        `${client?.firstName || ''} ${client?.lastName || ''}`.trim(),
        user?.email || '',
        client?.phone || '',
        cp.isActive ? 'Active' : 'Inactive',
        taxReturn?.taxYear?.toString() || '',
        taxReturn?.status || '',
        taxReturn?.refundAmount?.toString() || '',
        filedDateStr,
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
    const { data: profileData } = await db
      .from('profiles')
      .select('googleSheetsLeadsId')
      .eq('id', preparerId)
      .limit(1);

    const profile = firstOrNull(profileData) as { googleSheetsLeadsId: string | null } | null;

    if (!profile?.googleSheetsLeadsId) {
      logger.warn('No leads sheet for preparer', { preparerId });
      return;
    }

    const sheets = await this.getClient();

    // Get leads assigned to this preparer
    const { data: leadsData } = await db
      .from('tax_intake_leads')
      .select('id, first_name, last_name, email, phone, attributionMethod, completed, created_at, referrerUsername')
      .eq('assignedPreparerId', preparerId)
      .order('created_at', { ascending: false });

    const leads = (leadsData || []) as TaxIntakeLeadRecord[];

    // Build data rows
    const rows = leads.map((lead) => [
      `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
      lead.email || '',
      lead.phone || '',
      lead.attributionMethod || 'Direct',
      lead.completed ? 'Complete' : 'Partial',
      lead.created_at ? format(new Date(lead.created_at), 'yyyy-MM-dd HH:mm') : '',
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
    const { data: profileData } = await db
      .from('profiles')
      .select('googleSheetsCommissionsId')
      .eq('id', preparerId)
      .limit(1);

    const profile = firstOrNull(profileData) as { googleSheetsCommissionsId: string | null } | null;

    if (!profile?.googleSheetsCommissionsId) {
      logger.warn('No commissions sheet for preparer', { preparerId });
      return;
    }

    const sheets = await this.getClient();

    // Get commissions for this preparer (referrerId is the earner)
    const { data: commissionsData } = await db
      .from('commissions')
      .select('id, amount, status, sourceType, clientName, paymentMethod, referrerId, referralId, createdAt, paidAt')
      .eq('referrerId', preparerId)
      .order('createdAt', { ascending: false });

    const commissions = (commissionsData || []) as CommissionRecord[];

    // Get referrals for client info
    const referralIds = [...new Set(commissions.map((c) => c.referralId).filter(Boolean))] as string[];
    const { data: referralsData } = referralIds.length > 0
      ? await db.from('referrals').select('id, clientId').in('id', referralIds)
      : { data: [] };
    const referrals = (referralsData || []) as ReferralRecord[];
    const referralMap = new Map(referrals.map((r) => [r.id, r]));

    // Get client profiles from referrals
    const clientIds = [...new Set(referrals.map((r) => r.clientId).filter(Boolean))] as string[];
    const { data: clientsData } = clientIds.length > 0
      ? await db.from('profiles').select('id, firstName, lastName').in('id', clientIds)
      : { data: [] };
    const clients = (clientsData || []) as ProfileRecord[];
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    // Build data rows
    const rows = commissions.map((comm) => {
      // Use clientName from commission if available, otherwise try referral
      let clientName = comm.clientName;
      if (!clientName && comm.referralId) {
        const referral = referralMap.get(comm.referralId);
        if (referral?.clientId) {
          const client = clientMap.get(referral.clientId);
          if (client) {
            clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
          }
        }
      }
      clientName = clientName || 'Unknown';

      return [
        clientName,
        comm.sourceType || 'Referral',
        comm.amount.toString(),
        comm.status,
        comm.createdAt ? format(new Date(comm.createdAt), 'yyyy-MM-dd') : '',
        comm.paidAt ? format(new Date(comm.paidAt), 'yyyy-MM-dd') : '',
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
    const { data: profileData } = await db
      .from('profiles')
      .select('googleSheetsPerformanceId')
      .eq('id', preparerId)
      .limit(1);

    const profile = firstOrNull(profileData) as { googleSheetsPerformanceId: string | null } | null;

    if (!profile?.googleSheetsPerformanceId) {
      logger.warn('No performance sheet for preparer', { preparerId });
      return;
    }

    const sheets = await this.getClient();

    // Get monthly metrics for the last 12 months
    const now = new Date();
    const rows: string[][] = [];

    // Calculate date range for all 12 months (optimize by fetching all data once)
    const oldestMonthStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // Fetch all leads for the preparer in the date range
    const { data: leadsData } = await db
      .from('tax_intake_leads')
      .select('id, created_at, completed')
      .eq('assignedPreparerId', preparerId)
      .gte('created_at', oldestMonthStart.toISOString());
    const leads = (leadsData || []) as { id: string; created_at: string; completed: boolean }[];

    // Fetch all client assignments for the preparer in the date range
    const { data: clientsData } = await db
      .from('client_preparers')
      .select('id, assignedAt')
      .eq('preparerId', preparerId)
      .gte('assignedAt', oldestMonthStart.toISOString());
    const clients = (clientsData || []) as { id: string; assignedAt: string }[];

    // Fetch all returns filed by the preparer in the date range
    const { data: returnsData } = await db
      .from('tax_returns')
      .select('id, filedDate')
      .eq('profileId', preparerId)
      .gte('filedDate', oldestMonthStart.toISOString());
    const returns = (returnsData || []) as { id: string; filedDate: string }[];

    // Fetch all commissions earned by the preparer in the date range
    const { data: commissionsData } = await db
      .from('commissions')
      .select('id, amount, createdAt')
      .eq('referrerId', preparerId)
      .gte('createdAt', oldestMonthStart.toISOString());
    const commissions = (commissionsData || []) as { id: string; amount: number | string; createdAt: string }[];

    // Fetch all referrals made by the preparer in the date range
    const { data: referralsData } = await db
      .from('referrals')
      .select('id, createdAt')
      .eq('referrerId', preparerId)
      .gte('createdAt', oldestMonthStart.toISOString());
    const referrals = (referralsData || []) as { id: string; createdAt: string }[];

    // Calculate metrics per month
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthLabel = format(monthStart, 'MMM yyyy');

      // Filter data for this month
      const inMonth = (dateStr: string) => {
        const d = new Date(dateStr);
        return d >= monthStart && d <= monthEnd;
      };

      const leadsCount = leads.filter((l) => l.created_at && inMonth(l.created_at)).length;
      const conversionsCount = leads.filter((l) => l.created_at && l.completed && inMonth(l.created_at)).length;
      const clientsServed = clients.filter((c) => c.assignedAt && inMonth(c.assignedAt)).length;
      const returnsCount = returns.filter((r) => r.filedDate && inMonth(r.filedDate)).length;
      const commissionEarned = commissions
        .filter((c) => c.createdAt && inMonth(c.createdAt))
        .reduce((sum, c) => sum + Number(c.amount), 0);
      const referralsCount = referrals.filter((r) => r.createdAt && inMonth(r.createdAt)).length;

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
    await db
      .from('profiles')
      .update({ googleSheetsLastSync: new Date().toISOString() })
      .eq('id', preparerId);

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
    const { data: preparersData } = await db
      .from('profiles')
      .select('id, firstName, lastName, googleDriveFolderId, googleSheetsClientsId')
      .eq('role', 'tax_preparer')
      .not('googleDriveFolderId', 'is', null)
      .is('googleSheetsClientsId', null);

    const preparers = (preparersData || []) as ProfileRecord[];

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
