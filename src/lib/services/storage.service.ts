/**
 * Storage Service
 *
 * Self-hosted file storage for TaxGeniusPro.
 * Uses local disk storage on VPS managed by Coolify.
 *
 * This is a wrapper around DiskStorageService that maintains
 * the same API as the previous R2/S3 implementation for compatibility.
 */

import { DiskStorageService, UploadResult } from './disk-storage.service';
import { logger } from '@/lib/logger';

export class StorageService {
  /**
   * Upload a file with optional encryption
   */
  static async uploadFile(
    key: string,
    file: Buffer | Uint8Array,
    contentType: string,
    encrypt: boolean = true
  ): Promise<{ key: string; url: string; metadata?: Record<string, string> }> {
    try {
      const result = await DiskStorageService.uploadFile(key, file, contentType, {
        encrypt,
        generateThumbnail: contentType.startsWith('image/'),
      });

      return {
        key: result.key,
        url: result.url,
        metadata: encrypt ? { encrypted: 'true' } : undefined,
      };
    } catch (error) {
      logger.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Generate a presigned URL for direct upload
   * Note: For disk storage, this returns the regular upload URL
   */
  static async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    // For disk storage, we don't use presigned URLs
    // Return the upload endpoint instead
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/uploads/presigned?key=${encodeURIComponent(key)}&type=${encodeURIComponent(contentType)}`;
  }

  /**
   * Generate a presigned URL for download
   * Note: For disk storage, this returns the regular public URL
   */
  static async getPresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return DiskStorageService.getPublicUrl(key);
  }

  /**
   * Download and decrypt a file
   */
  static async downloadFile(key: string): Promise<Buffer> {
    try {
      const { data } = await DiskStorageService.readFile(key);
      return data;
    } catch (error) {
      logger.error('Error downloading file:', error);
      throw new Error('Failed to download file');
    }
  }

  /**
   * Delete a file
   */
  static async deleteFile(key: string): Promise<void> {
    try {
      await DiskStorageService.deleteFile(key);
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Generate a unique file key
   */
  static generateFileKey(
    userId: string,
    fileName: string,
    type: 'document' | 'avatar' | 'marketing' | 'temp'
  ): string {
    const categoryMap: Record<string, 'documents' | 'avatars' | 'marketing' | 'temp'> = {
      document: 'documents',
      avatar: 'avatars',
      marketing: 'marketing',
      temp: 'temp',
    };
    return DiskStorageService.generateKey(userId, fileName, categoryMap[type]);
  }

  /**
   * Validate file type
   */
  static validateFileType(mimeType: string, allowedTypes: string[]): boolean {
    return DiskStorageService.validateFileType(mimeType, allowedTypes);
  }

  /**
   * Get allowed file types for documents
   */
  static getAllowedDocumentTypes(): string[] {
    return DiskStorageService.getAllowedDocumentTypes();
  }

  /**
   * Get allowed file types for images
   */
  static getAllowedImageTypes(): string[] {
    return DiskStorageService.getAllowedImageTypes();
  }

  /**
   * Validate file size
   */
  static validateFileSize(sizeInBytes: number, maxSizeMB: number = 10): boolean {
    return DiskStorageService.validateFileSize(sizeInBytes, maxSizeMB);
  }
}
