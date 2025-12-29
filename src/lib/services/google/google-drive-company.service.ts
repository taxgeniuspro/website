/**
 * Google Drive Company Service - Document Backup & Storage
 *
 * Manages company-level document storage in Google Drive.
 * All documents are backed up to the taxgenius.tax@gmail.com Drive.
 *
 * Folder Structure:
 * Tax Genius Pro/
 * ├── Client Archives/
 * │   ├── 2024/
 * │   │   ├── Gelisa White/
 * │   │   │   └── [Client Name]/
 * │   │   └── Ray Hamilton/
 * │   └── 2025/
 * ├── Marketing Assets/
 * ├── Financial Reports/
 * └── Company Documents/
 */

import { drive_v3 } from 'googleapis';
import { db, firstOrNull } from '@/lib/db';
import { googleAuthService } from './google-auth.service';
import { logger } from '@/lib/logger';
import { Readable } from 'stream';

// Local type definition (replacing @prisma/client)
type GoogleDriveFolderType = 'ROOT' | 'CLIENT_ARCHIVES' | 'MARKETING' | 'FINANCIAL' | 'COMPANY' | 'YEAR' | 'PREPARER' | 'CLIENT';

interface GoogleDriveFolderRecord {
  id: string;
  folderId: string;
  folderName: string;
  parentId?: string | null;
  folderPath: string;
  folderType: string;
  preparerId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface GoogleDriveBackupRecord {
  id: string;
  documentId: string;
  driveFileId: string;
  driveFolderId: string;
  driveFileName: string;
  driveFileUrl?: string | null;
  fileSize?: number | null;
  mimeType: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface DocumentRecord {
  id: string;
  fileName: string;
  fileSize?: number | null;
  mimeType: string;
  taxYear?: number | null;
  profileId?: string | null;
}

interface ProfileRecord {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
}

// Root folder name in Google Drive
const ROOT_FOLDER_NAME = 'Tax Genius Pro';

// Folder structure configuration
const FOLDER_STRUCTURE = {
  ROOT: ROOT_FOLDER_NAME,
  CLIENT_ARCHIVES: 'Client Archives',
  MARKETING: 'Marketing Assets',
  FINANCIAL: 'Financial Reports',
  COMPANY: 'Company Documents',
};

class GoogleDriveCompanyService {
  private drive: drive_v3.Drive | null = null;
  private rootFolderId: string | null = null;

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
   * Find a folder by name within a parent folder
   */
  private async findFolder(
    name: string,
    parentId?: string
  ): Promise<string | null> {
    const drive = await this.getClient();

    let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
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
      return files.length > 0 ? files[0].id! : null;
    } catch (error) {
      logger.error('Failed to find folder', { name, parentId, error });
      return null;
    }
  }

  /**
   * Create a folder in Google Drive
   */
  async createFolder(
    name: string,
    parentId?: string,
    folderType?: GoogleDriveFolderType
  ): Promise<{ folderId: string; folderUrl: string }> {
    const drive = await this.getClient();

    try {
      const fileMetadata: drive_v3.Schema$File = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
      };

      if (parentId) {
        fileMetadata.parents = [parentId];
      }

      const response = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, webViewLink',
      });

      const folderId = response.data.id!;
      const folderUrl = response.data.webViewLink || '';

      // Calculate folder path
      let folderPath = name;
      if (parentId) {
        const { data: parentFolderData } = await db
          .from('google_drive_folders')
          .select('*')
          .eq('folderId', parentId)
          .limit(1);

        const parentFolder = firstOrNull(parentFolderData) as GoogleDriveFolderRecord | null;
        if (parentFolder) {
          folderPath = `${parentFolder.folderPath}/${name}`;
        }
      }

      // Save to database (upsert via check + insert/update)
      if (folderType) {
        const { data: existingData } = await db
          .from('google_drive_folders')
          .select('id')
          .eq('folderId', folderId)
          .limit(1);

        const existing = firstOrNull(existingData);

        if (existing) {
          await db
            .from('google_drive_folders')
            .update({
              folderName: name,
              parentId,
              folderPath,
              folderType,
            })
            .eq('folderId', folderId);
        } else {
          await db
            .from('google_drive_folders')
            .insert({
              folderId,
              folderName: name,
              parentId,
              folderPath,
              folderType,
            });
        }
      }

      logger.info(`Created folder: ${name}`, { folderId, folderUrl });
      return { folderId, folderUrl };
    } catch (error) {
      logger.error('Failed to create folder', { name, parentId, error });
      throw error;
    }
  }

  /**
   * Get or create the root Tax Genius Pro folder
   */
  async getOrCreateRootFolder(): Promise<string> {
    if (this.rootFolderId) {
      return this.rootFolderId;
    }

    // Check database first
    const { data: existingData } = await db
      .from('google_drive_folders')
      .select('*')
      .eq('folderType', 'ROOT')
      .limit(1);

    const existing = firstOrNull(existingData) as GoogleDriveFolderRecord | null;

    if (existing) {
      this.rootFolderId = existing.folderId;
      return existing.folderId;
    }

    // Check if folder exists in Drive
    const existingFolderId = await this.findFolder(ROOT_FOLDER_NAME);
    if (existingFolderId) {
      // Save to database
      await db
        .from('google_drive_folders')
        .insert({
          folderId: existingFolderId,
          folderName: ROOT_FOLDER_NAME,
          folderPath: ROOT_FOLDER_NAME,
          folderType: 'ROOT',
        });
      this.rootFolderId = existingFolderId;
      return existingFolderId;
    }

    // Create the folder
    const { folderId } = await this.createFolder(
      ROOT_FOLDER_NAME,
      undefined,
      'ROOT'
    );
    this.rootFolderId = folderId;
    return folderId;
  }

  /**
   * Initialize the folder structure
   */
  async initializeFolderStructure(): Promise<void> {
    logger.info('Initializing Google Drive folder structure');

    const rootId = await this.getOrCreateRootFolder();

    // Create main folders
    const folderConfigs: { name: string; type: GoogleDriveFolderType }[] = [
      { name: FOLDER_STRUCTURE.CLIENT_ARCHIVES, type: 'CLIENT_ARCHIVES' },
      { name: FOLDER_STRUCTURE.MARKETING, type: 'MARKETING' },
      { name: FOLDER_STRUCTURE.FINANCIAL, type: 'FINANCIAL' },
      { name: FOLDER_STRUCTURE.COMPANY, type: 'COMPANY' },
    ];

    for (const config of folderConfigs) {
      // Check if already exists
      const { data: existingData } = await db
        .from('google_drive_folders')
        .select('id')
        .eq('folderType', config.type)
        .limit(1);

      const existing = firstOrNull(existingData);

      if (!existing) {
        const existingInDrive = await this.findFolder(config.name, rootId);
        if (existingInDrive) {
          await db
            .from('google_drive_folders')
            .insert({
              folderId: existingInDrive,
              folderName: config.name,
              parentId: rootId,
              folderPath: `${ROOT_FOLDER_NAME}/${config.name}`,
              folderType: config.type,
            });
        } else {
          await this.createFolder(config.name, rootId, config.type);
        }
      }
    }

    logger.info('Google Drive folder structure initialized');
  }

  /**
   * Get or create a year folder under Client Archives
   */
  async getOrCreateYearFolder(year: number): Promise<string> {
    const { data: archivesFolderData } = await db
      .from('google_drive_folders')
      .select('*')
      .eq('folderType', 'CLIENT_ARCHIVES')
      .limit(1);

    const archivesFolder = firstOrNull(archivesFolderData) as GoogleDriveFolderRecord | null;

    if (!archivesFolder) {
      await this.initializeFolderStructure();
      return this.getOrCreateYearFolder(year);
    }

    const yearStr = year.toString();

    // Check if year folder exists
    const { data: existingData } = await db
      .from('google_drive_folders')
      .select('*')
      .eq('folderType', 'YEAR')
      .eq('folderName', yearStr)
      .eq('parentId', archivesFolder.folderId)
      .limit(1);

    const existing = firstOrNull(existingData) as GoogleDriveFolderRecord | null;

    if (existing) {
      return existing.folderId;
    }

    // Check in Drive
    const existingInDrive = await this.findFolder(
      yearStr,
      archivesFolder.folderId
    );
    if (existingInDrive) {
      await db
        .from('google_drive_folders')
        .insert({
          folderId: existingInDrive,
          folderName: yearStr,
          parentId: archivesFolder.folderId,
          folderPath: `${archivesFolder.folderPath}/${yearStr}`,
          folderType: 'YEAR',
        });
      return existingInDrive;
    }

    // Create the folder
    const { folderId } = await this.createFolder(
      yearStr,
      archivesFolder.folderId,
      'YEAR'
    );
    return folderId;
  }

  /**
   * Get or create a preparer folder under a year
   */
  async getOrCreatePreparerFolder(
    preparerId: string,
    year: number
  ): Promise<string> {
    const yearFolderId = await this.getOrCreateYearFolder(year);

    // Get preparer name
    const { data: preparerData } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .eq('id', preparerId)
      .limit(1);

    const preparer = firstOrNull(preparerData) as ProfileRecord | null;
    const preparerName =
      `${preparer?.firstName || ''} ${preparer?.lastName || ''}`.trim() ||
      'Unknown';

    // Check if preparer folder exists
    const { data: existingData } = await db
      .from('google_drive_folders')
      .select('*')
      .eq('folderType', 'PREPARER')
      .eq('preparerId', preparerId)
      .eq('parentId', yearFolderId)
      .limit(1);

    const existing = firstOrNull(existingData) as GoogleDriveFolderRecord | null;

    if (existing) {
      return existing.folderId;
    }

    // Check in Drive
    const existingInDrive = await this.findFolder(preparerName, yearFolderId);
    if (existingInDrive) {
      await db
        .from('google_drive_folders')
        .insert({
          folderId: existingInDrive,
          folderName: preparerName,
          parentId: yearFolderId,
          folderPath: `${ROOT_FOLDER_NAME}/${FOLDER_STRUCTURE.CLIENT_ARCHIVES}/${year}/${preparerName}`,
          folderType: 'PREPARER',
          preparerId,
        });
      return existingInDrive;
    }

    // Create the folder
    const { folderId } = await this.createFolder(
      preparerName,
      yearFolderId,
      'PREPARER'
    );

    // Update with preparer ID
    await db
      .from('google_drive_folders')
      .update({ preparerId })
      .eq('folderId', folderId);

    return folderId;
  }

  /**
   * Get or create a client folder under a preparer
   */
  async getOrCreateClientFolder(
    preparerId: string,
    clientName: string,
    year: number
  ): Promise<string> {
    const preparerFolderId = await this.getOrCreatePreparerFolder(
      preparerId,
      year
    );

    // Check if client folder exists
    const { data: existingData } = await db
      .from('google_drive_folders')
      .select('*')
      .eq('folderType', 'CLIENT')
      .eq('folderName', clientName)
      .eq('parentId', preparerFolderId)
      .limit(1);

    const existing = firstOrNull(existingData) as GoogleDriveFolderRecord | null;

    if (existing) {
      return existing.folderId;
    }

    // Check in Drive
    const existingInDrive = await this.findFolder(
      clientName,
      preparerFolderId
    );
    if (existingInDrive) {
      await db
        .from('google_drive_folders')
        .insert({
          folderId: existingInDrive,
          folderName: clientName,
          parentId: preparerFolderId,
          folderPath: `Client Archives/${year}/*/${clientName}`,
          folderType: 'CLIENT',
        });
      return existingInDrive;
    }

    // Create the folder
    const { folderId } = await this.createFolder(
      clientName,
      preparerFolderId,
      'CLIENT'
    );
    return folderId;
  }

  /**
   * Upload a file to Google Drive
   */
  async uploadFile(
    fileName: string,
    mimeType: string,
    content: Buffer | Readable,
    folderId: string
  ): Promise<{ fileId: string; fileUrl: string }> {
    const drive = await this.getClient();

    try {
      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
        },
        media: {
          mimeType,
          body: content instanceof Buffer ? Readable.from(content) : content,
        },
        fields: 'id, webViewLink',
      });

      const fileId = response.data.id!;
      const fileUrl = response.data.webViewLink || '';

      logger.info(`Uploaded file: ${fileName}`, { fileId, folderId });
      return { fileId, fileUrl };
    } catch (error) {
      logger.error('Failed to upload file', { fileName, folderId, error });
      throw error;
    }
  }

  /**
   * Backup a Tax Genius document to Google Drive
   */
  async backupDocument(
    documentId: string,
    fileContent: Buffer,
    options?: {
      preparerId?: string;
      clientName?: string;
      year?: number;
    }
  ): Promise<{ driveFileId: string; driveFileUrl: string }> {
    // Get document details
    const { data: documentData } = await db
      .from('documents')
      .select('id, fileName, fileSize, mimeType, taxYear, profileId')
      .eq('id', documentId)
      .limit(1);

    const document = firstOrNull(documentData) as DocumentRecord | null;

    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Check if already backed up
    const { data: existingBackupData } = await db
      .from('google_drive_backups')
      .select('*')
      .eq('documentId', documentId)
      .limit(1);

    const existingBackup = firstOrNull(existingBackupData) as GoogleDriveBackupRecord | null;

    if (existingBackup) {
      logger.info(`Document already backed up: ${documentId}`);
      return {
        driveFileId: existingBackup.driveFileId,
        driveFileUrl: existingBackup.driveFileUrl || '',
      };
    }

    // Determine folder
    let folderId: string;
    const year = options?.year || document.taxYear || new Date().getFullYear();

    if (options?.preparerId && options?.clientName) {
      // Client-specific folder
      folderId = await this.getOrCreateClientFolder(
        options.preparerId,
        options.clientName,
        year
      );
    } else if (options?.preparerId) {
      // Preparer folder
      folderId = await this.getOrCreatePreparerFolder(options.preparerId, year);
    } else {
      // Default to Company Documents
      const { data: companyFolderData } = await db
        .from('google_drive_folders')
        .select('*')
        .eq('folderType', 'COMPANY')
        .limit(1);

      const companyFolder = firstOrNull(companyFolderData) as GoogleDriveFolderRecord | null;
      if (!companyFolder) {
        await this.initializeFolderStructure();
        return this.backupDocument(documentId, fileContent, options);
      }
      folderId = companyFolder.folderId;
    }

    // Upload file
    const { fileId, fileUrl } = await this.uploadFile(
      document.fileName,
      document.mimeType,
      fileContent,
      folderId
    );

    // Save backup record
    await db
      .from('google_drive_backups')
      .insert({
        documentId,
        driveFileId: fileId,
        driveFolderId: folderId,
        driveFileName: document.fileName,
        driveFileUrl: fileUrl,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
      });

    logger.info(`Backed up document: ${documentId}`, { driveFileId: fileId });
    return { driveFileId: fileId, driveFileUrl: fileUrl };
  }

  /**
   * List files in a folder
   */
  async listFolder(
    folderId: string
  ): Promise<{ id: string; name: string; mimeType: string }[]> {
    const drive = await this.getClient();

    try {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType)',
        orderBy: 'name',
      });

      return (response.data.files || []).map((f) => ({
        id: f.id!,
        name: f.name!,
        mimeType: f.mimeType!,
      }));
    } catch (error) {
      logger.error('Failed to list folder', { folderId, error });
      throw error;
    }
  }

  /**
   * Get folder info
   */
  async getFolderInfo(folderType: GoogleDriveFolderType): Promise<{
    folderId: string;
    folderName: string;
    folderPath: string;
    fileCount: number;
  } | null> {
    const { data: folderData } = await db
      .from('google_drive_folders')
      .select('*')
      .eq('folderType', folderType)
      .limit(1);

    const folder = firstOrNull(folderData) as GoogleDriveFolderRecord | null;

    if (!folder) {
      return null;
    }

    const files = await this.listFolder(folder.folderId);

    return {
      folderId: folder.folderId,
      folderName: folder.folderName,
      folderPath: folder.folderPath,
      fileCount: files.length,
    };
  }

  /**
   * Get all backup stats
   */
  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    byFolder: { folderType: string; count: number }[];
  }> {
    const { data: backupsData } = await db
      .from('google_drive_backups')
      .select('fileSize, driveFolderId');

    const backups = (backupsData || []) as { fileSize: number | null; driveFolderId: string }[];

    const { data: foldersData } = await db
      .from('google_drive_folders')
      .select('folderId, folderType');

    const folders = (foldersData || []) as { folderId: string; folderType: string }[];
    const folderMap = new Map(folders.map((f) => [f.folderId, f.folderType]));

    const byFolder = new Map<string, number>();
    let totalSize = 0;

    for (const backup of backups) {
      totalSize += backup.fileSize || 0;
      const folderType = folderMap.get(backup.driveFolderId) || 'UNKNOWN';
      byFolder.set(folderType, (byFolder.get(folderType) || 0) + 1);
    }

    return {
      totalBackups: backups.length,
      totalSize,
      byFolder: Array.from(byFolder.entries()).map(([folderType, count]) => ({
        folderType,
        count,
      })),
    };
  }
}

// Export singleton instance
export const googleDriveCompanyService = new GoogleDriveCompanyService();
