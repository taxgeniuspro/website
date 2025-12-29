/**
 * Disk Storage Service
 *
 * Self-hosted file storage for TaxGeniusPro.
 * Files are stored on the VPS disk volume managed by Coolify.
 *
 * Storage location: /app/uploads (mounted as Coolify volume)
 * Public URL: https://taxgeniuspro.tax/api/uploads/[path]
 *
 * Features:
 * - File upload with validation
 * - Automatic thumbnail generation for images
 * - Secure file serving via API route
 * - File encryption for sensitive documents
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { logger } from '@/lib/logger';

// Storage configuration
const UPLOADS_DIR = process.env.UPLOADS_DIR || '/app/uploads';
const PUBLIC_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

// Encryption configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

export interface UploadResult {
  key: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  size: number;
  mimeType: string;
}

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  quality?: number;
}

export class DiskStorageService {
  /**
   * Ensure directory exists
   */
  private static async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  /**
   * Generate a unique file key
   */
  static generateKey(
    userId: string,
    fileName: string,
    category: 'documents' | 'images' | 'referral-images' | 'avatars' | 'marketing' | 'temp'
  ): string {
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(4).toString('hex');
    const ext = path.extname(fileName).toLowerCase();
    const sanitizedName = path.basename(fileName, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);

    return `${category}/${userId}/${timestamp}-${randomStr}-${sanitizedName}${ext}`;
  }

  /**
   * Get public URL for a file key
   */
  static getPublicUrl(key: string): string {
    return `${PUBLIC_URL}/api/uploads/${key}`;
  }

  /**
   * Get thumbnail URL for an image key
   */
  static getThumbnailUrl(key: string, options?: ThumbnailOptions): string {
    const width = options?.width || 300;
    const height = options?.height || 300;
    return `${PUBLIC_URL}/api/uploads/${key}?w=${width}&h=${height}&fit=cover`;
  }

  /**
   * Upload a file to disk storage
   */
  static async uploadFile(
    key: string,
    data: Buffer | Uint8Array,
    mimeType: string,
    options?: {
      encrypt?: boolean;
      generateThumbnail?: boolean;
      thumbnailOptions?: ThumbnailOptions;
    }
  ): Promise<UploadResult> {
    const filePath = path.join(UPLOADS_DIR, key);
    const dirPath = path.dirname(filePath);

    await this.ensureDir(dirPath);

    let buffer = Buffer.from(data);
    let metadata: { iv?: string; authTag?: string } = {};

    // Encrypt if requested (for sensitive documents)
    if (options?.encrypt) {
      const encrypted = this.encrypt(buffer);
      buffer = encrypted.encrypted;
      metadata = { iv: encrypted.iv, authTag: encrypted.authTag };

      // Save metadata file
      const metaPath = `${filePath}.meta`;
      await fs.writeFile(metaPath, JSON.stringify({ ...metadata, encrypted: true, mimeType }));
    }

    // Write file to disk
    await fs.writeFile(filePath, buffer);

    const result: UploadResult = {
      key,
      url: this.getPublicUrl(key),
      size: buffer.length,
      mimeType,
    };

    // Generate thumbnail for images
    if (options?.generateThumbnail && mimeType.startsWith('image/')) {
      try {
        const imageBuffer = options?.encrypt ? Buffer.from(data) : buffer;
        const image = sharp(imageBuffer);
        const imageMetadata = await image.metadata();

        result.width = imageMetadata.width;
        result.height = imageMetadata.height;

        // Generate and save thumbnail
        const thumbOptions = options?.thumbnailOptions || {};
        const thumbWidth = thumbOptions.width || 300;
        const thumbHeight = thumbOptions.height || 300;

        const thumbBuffer = await image
          .resize(thumbWidth, thumbHeight, {
            fit: thumbOptions.fit || 'cover',
            withoutEnlargement: true,
          })
          .jpeg({ quality: thumbOptions.quality || 80 })
          .toBuffer();

        const thumbKey = key.replace(/(\.[^.]+)$/, '_thumb.jpg');
        const thumbPath = path.join(UPLOADS_DIR, thumbKey);
        await fs.writeFile(thumbPath, thumbBuffer);

        result.thumbnailUrl = this.getPublicUrl(thumbKey);
      } catch (error) {
        logger.warn('Failed to generate thumbnail', { key, error });
        // Continue without thumbnail
      }
    }

    logger.info('File uploaded to disk', { key, size: result.size, mimeType });
    return result;
  }

  /**
   * Read a file from disk storage
   */
  static async readFile(key: string): Promise<{ data: Buffer; mimeType: string }> {
    const filePath = path.join(UPLOADS_DIR, key);
    const metaPath = `${filePath}.meta`;

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      throw new Error('File not found');
    }

    let data = await fs.readFile(filePath);
    let mimeType = this.getMimeType(key);

    // Check for encryption metadata
    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaContent);

      if (meta.encrypted && meta.iv && meta.authTag) {
        data = this.decrypt(data, meta.iv, meta.authTag);
      }
      if (meta.mimeType) {
        mimeType = meta.mimeType;
      }
    } catch {
      // No metadata file, file is not encrypted
    }

    return { data, mimeType };
  }

  /**
   * Delete a file from disk storage
   */
  static async deleteFile(key: string): Promise<void> {
    const filePath = path.join(UPLOADS_DIR, key);
    const metaPath = `${filePath}.meta`;
    const thumbKey = key.replace(/(\.[^.]+)$/, '_thumb.jpg');
    const thumbPath = path.join(UPLOADS_DIR, thumbKey);

    // Delete main file
    try {
      await fs.unlink(filePath);
    } catch (error) {
      logger.warn('Failed to delete file', { key, error });
    }

    // Delete metadata file if exists
    try {
      await fs.unlink(metaPath);
    } catch {
      // No metadata file
    }

    // Delete thumbnail if exists
    try {
      await fs.unlink(thumbPath);
    } catch {
      // No thumbnail
    }

    logger.info('File deleted from disk', { key });
  }

  /**
   * Check if a file exists
   */
  static async exists(key: string): Promise<boolean> {
    const filePath = path.join(UPLOADS_DIR, key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List files in a directory
   */
  static async listFiles(prefix: string): Promise<string[]> {
    const dirPath = path.join(UPLOADS_DIR, prefix);
    try {
      const files = await fs.readdir(dirPath, { recursive: true });
      return files
        .filter((f) => typeof f === 'string' && !f.endsWith('.meta'))
        .map((f) => path.join(prefix, f as string));
    } catch {
      return [];
    }
  }

  /**
   * Encrypt data
   */
  private static encrypt(buffer: Buffer): { encrypted: Buffer; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex'),
      iv
    );

    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypt data
   */
  private static decrypt(encrypted: Buffer, iv: string, authTag: string): Buffer {
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex'),
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Get MIME type from file extension
   */
  private static getMimeType(key: string): string {
    const ext = path.extname(key).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.json': 'application/json',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Validate file type
   */
  static validateFileType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimeType);
  }

  /**
   * Get allowed file types for documents
   */
  static getAllowedDocumentTypes(): string[] {
    return [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
  }

  /**
   * Get allowed file types for images
   */
  static getAllowedImageTypes(): string[] {
    return ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  }

  /**
   * Validate file size
   */
  static validateFileSize(sizeInBytes: number, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return sizeInBytes <= maxSizeBytes;
  }
}
