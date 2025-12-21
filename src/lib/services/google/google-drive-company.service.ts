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
import { prisma } from '@/lib/prisma';
import { googleAuthService } from './google-auth.service';
import { logger } from '@/lib/logger';
import { GoogleDriveFolderType } from '@prisma/client';
import { Readable } from 'stream';

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
        const parentFolder = await prisma.googleDriveFolder.findUnique({
          where: { folderId: parentId },
        });
        if (parentFolder) {
          folderPath = `${parentFolder.folderPath}/${name}`;
        }
      }

      // Save to database
      if (folderType) {
        await prisma.googleDriveFolder.upsert({
          where: { folderId },
          update: {
            folderName: name,
            parentId,
            folderPath,
            folderType,
          },
          create: {
            folderId,
            folderName: name,
            parentId,
            folderPath,
            folderType,
          },
        });
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
    const existing = await prisma.googleDriveFolder.findFirst({
      where: { folderType: 'ROOT' },
    });

    if (existing) {
      this.rootFolderId = existing.folderId;
      return existing.folderId;
    }

    // Check if folder exists in Drive
    const existingFolderId = await this.findFolder(ROOT_FOLDER_NAME);
    if (existingFolderId) {
      // Save to database
      await prisma.googleDriveFolder.create({
        data: {
          folderId: existingFolderId,
          folderName: ROOT_FOLDER_NAME,
          folderPath: ROOT_FOLDER_NAME,
          folderType: 'ROOT',
        },
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
      const existing = await prisma.googleDriveFolder.findFirst({
        where: { folderType: config.type },
      });

      if (!existing) {
        const existingInDrive = await this.findFolder(config.name, rootId);
        if (existingInDrive) {
          await prisma.googleDriveFolder.create({
            data: {
              folderId: existingInDrive,
              folderName: config.name,
              parentId: rootId,
              folderPath: `${ROOT_FOLDER_NAME}/${config.name}`,
              folderType: config.type,
            },
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
    const archivesFolder = await prisma.googleDriveFolder.findFirst({
      where: { folderType: 'CLIENT_ARCHIVES' },
    });

    if (!archivesFolder) {
      await this.initializeFolderStructure();
      return this.getOrCreateYearFolder(year);
    }

    const yearStr = year.toString();

    // Check if year folder exists
    const existing = await prisma.googleDriveFolder.findFirst({
      where: {
        folderType: 'YEAR',
        folderName: yearStr,
        parentId: archivesFolder.folderId,
      },
    });

    if (existing) {
      return existing.folderId;
    }

    // Check in Drive
    const existingInDrive = await this.findFolder(
      yearStr,
      archivesFolder.folderId
    );
    if (existingInDrive) {
      await prisma.googleDriveFolder.create({
        data: {
          folderId: existingInDrive,
          folderName: yearStr,
          parentId: archivesFolder.folderId,
          folderPath: `${archivesFolder.folderPath}/${yearStr}`,
          folderType: 'YEAR',
        },
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
    const preparer = await prisma.profile.findUnique({
      where: { id: preparerId },
    });
    const preparerName =
      `${preparer?.firstName || ''} ${preparer?.lastName || ''}`.trim() ||
      'Unknown';

    // Check if preparer folder exists
    const existing = await prisma.googleDriveFolder.findFirst({
      where: {
        folderType: 'PREPARER',
        preparerId,
        parentId: yearFolderId,
      },
    });

    if (existing) {
      return existing.folderId;
    }

    // Check in Drive
    const existingInDrive = await this.findFolder(preparerName, yearFolderId);
    if (existingInDrive) {
      await prisma.googleDriveFolder.create({
        data: {
          folderId: existingInDrive,
          folderName: preparerName,
          parentId: yearFolderId,
          folderPath: `${ROOT_FOLDER_NAME}/${FOLDER_STRUCTURE.CLIENT_ARCHIVES}/${year}/${preparerName}`,
          folderType: 'PREPARER',
          preparerId,
        },
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
    await prisma.googleDriveFolder.update({
      where: { folderId },
      data: { preparerId },
    });

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
    const existing = await prisma.googleDriveFolder.findFirst({
      where: {
        folderType: 'CLIENT',
        folderName: clientName,
        parentId: preparerFolderId,
      },
    });

    if (existing) {
      return existing.folderId;
    }

    // Check in Drive
    const existingInDrive = await this.findFolder(
      clientName,
      preparerFolderId
    );
    if (existingInDrive) {
      await prisma.googleDriveFolder.create({
        data: {
          folderId: existingInDrive,
          folderName: clientName,
          parentId: preparerFolderId,
          folderPath: `Client Archives/${year}/*/${clientName}`,
          folderType: 'CLIENT',
        },
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
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        profile: true,
      },
    });

    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Check if already backed up
    const existingBackup = await prisma.googleDriveBackup.findUnique({
      where: { documentId },
    });

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
      const companyFolder = await prisma.googleDriveFolder.findFirst({
        where: { folderType: 'COMPANY' },
      });
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
    await prisma.googleDriveBackup.create({
      data: {
        documentId,
        driveFileId: fileId,
        driveFolderId: folderId,
        driveFileName: document.fileName,
        driveFileUrl: fileUrl,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
      },
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
    const folder = await prisma.googleDriveFolder.findFirst({
      where: { folderType },
    });

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
    const backups = await prisma.googleDriveBackup.findMany({
      select: {
        fileSize: true,
        driveFolderId: true,
      },
    });

    const folders = await prisma.googleDriveFolder.findMany();
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
