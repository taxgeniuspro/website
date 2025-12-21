/**
 * Google Drive Preparer Service
 *
 * Creates and manages private Google Drive folders for each tax preparer.
 * Each preparer gets their own folder that's shared only with them.
 *
 * Folder Structure (per preparer):
 * Tax Genius Pro/
 * └── Tax Preparers/
 *     └── Ira Johnson (ira@taxgeniuspro.tax)/     ← Shared with preparer only
 *         ├── Clients/
 *         │   ├── 2024/
 *         │   └── 2025/
 *         ├── Marketing Materials/
 *         └── Documents/
 */

import { drive_v3 } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { googleAuthService } from './google-auth.service';
import { logger } from '@/lib/logger';
import { Readable } from 'stream';

// Root folder for all preparers
const PREPARERS_ROOT = 'Tax Preparers';

// Subfolders for each preparer
const PREPARER_SUBFOLDERS = ['Clients', 'Marketing Materials', 'Documents'];

export interface PreparerFolderResult {
  folderId: string;
  folderUrl: string;
  subfolders: {
    clients: string;
    marketing: string;
    documents: string;
  };
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  size?: number;
  createdTime?: string;
}

class GoogleDrivePreparerService {
  private drive: drive_v3.Drive | null = null;
  private taxGeniusRootId: string | null = null;
  private preparersRootId: string | null = null;

  /**
   * Get authenticated Drive client
   */
  private async getClient(): Promise<drive_v3.Drive> {
    if (!this.drive) {
      this.drive = await googleAuthService.getDriveClient();
    }
    return this.drive;
  }

  /**
   * Escape special characters for Google Drive query
   */
  private escapeQueryString(str: string): string {
    // Escape single quotes and backslashes for Google Drive API query
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  /**
   * Find a folder by name within a parent
   */
  private async findFolder(
    name: string,
    parentId?: string
  ): Promise<string | null> {
    const drive = await this.getClient();

    // Escape the name to prevent query injection
    const escapedName = this.escapeQueryString(name);
    let query = `name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    try {
      const response = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      const files = response.data.files || [];
      if (files.length > 0 && files[0].id) {
        return files[0].id;
      }
      return null;
    } catch (error) {
      logger.error('Failed to find folder', { name, parentId, error });
      return null;
    }
  }

  /**
   * Create a folder in Google Drive
   */
  private async createFolder(
    name: string,
    parentId: string
  ): Promise<{ folderId: string; folderUrl: string }> {
    const drive = await this.getClient();

    const response = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id, webViewLink',
    });

    const folderId = response.data.id;
    if (!folderId) {
      throw new Error(`Failed to create folder: ${name} - no folder ID returned`);
    }

    return {
      folderId,
      folderUrl: response.data.webViewLink || `https://drive.google.com/drive/folders/${folderId}`,
    };
  }

  /**
   * Share a folder with a user (editor access)
   */
  private async shareWithUser(
    folderId: string,
    email: string,
    role: 'reader' | 'writer' = 'writer'
  ): Promise<void> {
    const drive = await this.getClient();

    try {
      await drive.permissions.create({
        fileId: folderId,
        requestBody: {
          type: 'user',
          role,
          emailAddress: email,
        },
        sendNotificationEmail: false,
      });

      logger.info('Shared folder with user', { folderId, email, role });
    } catch (error) {
      logger.error('Failed to share folder', { folderId, email, error });
      throw error;
    }
  }

  /**
   * Get or create the Tax Genius Pro root folder
   */
  private async getTaxGeniusRootId(): Promise<string> {
    if (this.taxGeniusRootId) {
      return this.taxGeniusRootId;
    }

    // Check database first
    const existing = await prisma.googleDriveFolder.findFirst({
      where: { folderType: 'ROOT' },
    });

    if (existing) {
      this.taxGeniusRootId = existing.folderId;
      return existing.folderId;
    }

    // Check Drive
    const folderId = await this.findFolder('Tax Genius Pro');
    if (folderId) {
      this.taxGeniusRootId = folderId;
      return folderId;
    }

    throw new Error('Tax Genius Pro root folder not found. Run initializeFolderStructure first.');
  }

  /**
   * Get or create the Tax Preparers root folder
   */
  private async getPreparersRootId(): Promise<string> {
    if (this.preparersRootId) {
      return this.preparersRootId;
    }

    const rootId = await this.getTaxGeniusRootId();

    // Check if exists
    const folderId = await this.findFolder(PREPARERS_ROOT, rootId);
    if (folderId) {
      this.preparersRootId = folderId;
      return folderId;
    }

    // Create it
    const { folderId: newId } = await this.createFolder(PREPARERS_ROOT, rootId);
    this.preparersRootId = newId;
    return newId;
  }

  /**
   * Create a private folder for a tax preparer
   *
   * @param preparerId - Profile.id of the preparer
   * @param preparerEmail - Professional email (or personal email) to share with
   * @param preparerName - Display name for the folder
   */
  async createPreparerFolder(
    preparerId: string,
    preparerEmail: string,
    preparerName: string
  ): Promise<PreparerFolderResult> {
    logger.info('Creating preparer folder', { preparerId, preparerEmail, preparerName });

    const preparersRootId = await this.getPreparersRootId();

    // Check if folder already exists
    const existingFolderId = await this.findFolder(
      `${preparerName} (${preparerEmail})`,
      preparersRootId
    );

    let mainFolderId: string;
    let mainFolderUrl: string;

    if (existingFolderId) {
      logger.info('Preparer folder already exists', { preparerId, folderId: existingFolderId });
      mainFolderId = existingFolderId;
      mainFolderUrl = `https://drive.google.com/drive/folders/${existingFolderId}`;
    } else {
      // Create main folder
      const folderName = `${preparerName} (${preparerEmail})`;
      const result = await this.createFolder(folderName, preparersRootId);
      mainFolderId = result.folderId;
      mainFolderUrl = result.folderUrl;

      logger.info('Created preparer main folder', { preparerId, folderId: mainFolderId });
    }

    // Create subfolders if they don't exist
    const subfolders: { clients: string; marketing: string; documents: string } = {
      clients: '',
      marketing: '',
      documents: '',
    };

    for (const subfolderName of PREPARER_SUBFOLDERS) {
      let subfolderId = await this.findFolder(subfolderName, mainFolderId);

      if (!subfolderId) {
        const { folderId } = await this.createFolder(subfolderName, mainFolderId);
        subfolderId = folderId;
      }

      if (subfolderName === 'Clients') subfolders.clients = subfolderId;
      if (subfolderName === 'Marketing Materials') subfolders.marketing = subfolderId;
      if (subfolderName === 'Documents') subfolders.documents = subfolderId;
    }

    // Share with preparer (editor access)
    // This may fail if the email is invalid or sharing is disabled
    try {
      await this.shareWithUser(mainFolderId, preparerEmail, 'writer');
    } catch (shareError) {
      // Log but don't fail - folder was created, sharing can be retried
      logger.warn('Failed to share folder with preparer, folder was still created', {
        preparerId,
        preparerEmail,
        folderId: mainFolderId,
        error: shareError instanceof Error ? shareError.message : String(shareError),
      });
      // Optionally, you could throw here if sharing is critical
    }

    // Update profile with folder info
    await prisma.profile.update({
      where: { id: preparerId },
      data: {
        googleDriveFolderId: mainFolderId,
        googleDriveFolderUrl: mainFolderUrl,
      },
    });

    logger.info('Preparer folder setup complete', {
      preparerId,
      mainFolderId,
      subfolders,
    });

    return {
      folderId: mainFolderId,
      folderUrl: mainFolderUrl,
      subfolders,
    };
  }

  /**
   * Share folder with preparer (if not already shared)
   */
  async shareWithPreparer(folderId: string, preparerEmail: string): Promise<void> {
    await this.shareWithUser(folderId, preparerEmail, 'writer');
  }

  /**
   * Upload a file to preparer's folder
   */
  async uploadToPreparerFolder(
    preparerId: string,
    subfolder: 'clients' | 'marketing' | 'documents',
    file: Buffer,
    filename: string,
    mimeType: string = 'application/octet-stream'
  ): Promise<{ fileId: string; fileUrl: string }> {
    const drive = await this.getClient();

    // Get preparer's folder
    const profile = await prisma.profile.findUnique({
      where: { id: preparerId },
      select: { googleDriveFolderId: true },
    });

    if (!profile?.googleDriveFolderId) {
      throw new Error('Preparer does not have a Google Drive folder');
    }

    // Find the appropriate subfolder
    const subfolderName = subfolder === 'clients' ? 'Clients' :
                          subfolder === 'marketing' ? 'Marketing Materials' :
                          'Documents';

    const subfolderId = await this.findFolder(subfolderName, profile.googleDriveFolderId);
    if (!subfolderId) {
      throw new Error(`Subfolder ${subfolderName} not found`);
    }

    // Upload file
    const response = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [subfolderId],
      },
      media: {
        mimeType,
        body: Readable.from(file),
      },
      fields: 'id, webViewLink',
    });

    logger.info('Uploaded file to preparer folder', {
      preparerId,
      subfolder,
      filename,
      fileId: response.data.id,
    });

    return {
      fileId: response.data.id!,
      fileUrl: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
    };
  }

  /**
   * List files in preparer's folder
   */
  async listPreparerFiles(
    preparerId: string,
    subfolder?: 'clients' | 'marketing' | 'documents'
  ): Promise<DriveFile[]> {
    const drive = await this.getClient();

    // Get preparer's folder
    const profile = await prisma.profile.findUnique({
      where: { id: preparerId },
      select: { googleDriveFolderId: true },
    });

    if (!profile?.googleDriveFolderId) {
      return [];
    }

    let folderId = profile.googleDriveFolderId;

    // If subfolder specified, find it
    if (subfolder) {
      const subfolderName = subfolder === 'clients' ? 'Clients' :
                            subfolder === 'marketing' ? 'Marketing Materials' :
                            'Documents';
      const subfolderId = await this.findFolder(subfolderName, folderId);
      if (subfolderId) {
        folderId = subfolderId;
      }
    }

    try {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, webViewLink, size, createdTime)',
        orderBy: 'createdTime desc',
      });

      return (response.data.files || []).map((f) => ({
        id: f.id!,
        name: f.name!,
        mimeType: f.mimeType!,
        webViewLink: f.webViewLink || undefined,
        size: f.size ? parseInt(f.size) : undefined,
        createdTime: f.createdTime || undefined,
      }));
    } catch (error) {
      logger.error('Failed to list preparer files', { preparerId, error });
      return [];
    }
  }

  /**
   * Get preparer's folder URL
   */
  async getPreparerFolderUrl(preparerId: string): Promise<string | null> {
    const profile = await prisma.profile.findUnique({
      where: { id: preparerId },
      select: { googleDriveFolderUrl: true },
    });

    return profile?.googleDriveFolderUrl || null;
  }

  /**
   * Create year subfolder under Clients
   */
  async createClientYearFolder(preparerId: string, year: number): Promise<string> {
    const profile = await prisma.profile.findUnique({
      where: { id: preparerId },
      select: { googleDriveFolderId: true },
    });

    if (!profile?.googleDriveFolderId) {
      throw new Error('Preparer does not have a Google Drive folder');
    }

    // Find Clients subfolder
    const clientsFolderId = await this.findFolder('Clients', profile.googleDriveFolderId);
    if (!clientsFolderId) {
      throw new Error('Clients subfolder not found');
    }

    // Check if year folder exists
    const yearStr = year.toString();
    let yearFolderId = await this.findFolder(yearStr, clientsFolderId);

    if (!yearFolderId) {
      const { folderId } = await this.createFolder(yearStr, clientsFolderId);
      yearFolderId = folderId;
    }

    return yearFolderId;
  }

  /**
   * Backfill Drive folders for all existing preparers
   */
  async backfillPreparerFolders(): Promise<{
    success: number;
    failed: number;
    skipped: number;
    results: Array<{ profileId: string; folderId?: string; error?: string }>;
  }> {
    logger.info('Starting preparer Drive folder backfill');

    // Get all tax preparers without Drive folders
    const preparers = await prisma.profile.findMany({
      where: {
        role: 'tax_preparer',
        googleDriveFolderId: null,
      },
      include: {
        user: { select: { email: true } },
        professionalEmails: {
          where: { status: 'ACTIVE', isPrimary: true },
          select: { emailAddress: true },
          take: 1,
        },
      },
    });

    logger.info(`Found ${preparers.length} preparers without Drive folders`);

    let success = 0;
    let failed = 0;
    let skipped = 0;
    const results: Array<{ profileId: string; folderId?: string; error?: string }> = [];

    for (const preparer of preparers) {
      // Skip test accounts
      if (preparer.user?.email?.includes('@taxgeniuspro.test')) {
        skipped++;
        continue;
      }

      // Use professional email if available, otherwise personal email
      const email = preparer.professionalEmails[0]?.emailAddress || preparer.user?.email;
      if (!email) {
        failed++;
        results.push({ profileId: preparer.id, error: 'No email address found' });
        continue;
      }

      const name = `${preparer.firstName} ${preparer.lastName}`.trim() || 'Unknown';

      try {
        const result = await this.createPreparerFolder(preparer.id, email, name);
        success++;
        results.push({ profileId: preparer.id, folderId: result.folderId });
      } catch (error) {
        failed++;
        results.push({
          profileId: preparer.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    logger.info('Preparer Drive folder backfill complete', {
      success,
      failed,
      skipped,
      total: preparers.length,
    });

    return { success, failed, skipped, results };
  }
}

export const googleDrivePreparerService = new GoogleDrivePreparerService();
