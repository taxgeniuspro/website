import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Encryption configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

export class StorageService {
  private static bucketName = process.env.R2_BUCKET_NAME!;

  /**
   * Encrypt data before storage
   */
  private static encrypt(buffer: Buffer): { encrypted: Buffer; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
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
   * Decrypt data after retrieval
   */
  private static decrypt(encrypted: Buffer, iv: string, authTag: string): Buffer {
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Upload a file to R2 with encryption
   */
  static async uploadFile(
    key: string,
    file: Buffer | Uint8Array,
    contentType: string,
    encrypt: boolean = true
  ): Promise<{ key: string; url: string; metadata?: Record<string, string> }> {
    try {
      let uploadData = file;
      let metadata: Record<string, string> = {};

      // Encrypt if required
      if (encrypt) {
        const { encrypted, iv, authTag } = this.encrypt(Buffer.from(file));
        uploadData = encrypted;
        metadata = {
          encrypted: 'true',
          iv,
          authTag,
        };
      }

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: uploadData,
        ContentType: contentType,
        Metadata: metadata,
      });

      await r2Client.send(command);

      const url = `${process.env.R2_PUBLIC_URL}/${key}`;

      return { key, url, metadata };
    } catch (error) {
      logger.error('Error uploading file to R2:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Generate a presigned URL for direct upload
   */
  static async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      const url = await getSignedUrl(r2Client, command, { expiresIn });
      return url;
    } catch (error) {
      logger.error('Error generating presigned upload URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  /**
   * Generate a presigned URL for download
   */
  static async getPresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(r2Client, command, { expiresIn });
      return url;
    } catch (error) {
      logger.error('Error generating presigned download URL:', error);
      throw new Error('Failed to generate download URL');
    }
  }

  /**
   * Download and decrypt a file
   */
  static async downloadFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await r2Client.send(command);

      if (!response.Body) {
        throw new Error('File not found');
      }

      const data = await response.Body.transformToByteArray();
      const buffer = Buffer.from(data);

      // Check if file is encrypted
      if (response.Metadata?.encrypted === 'true') {
        const iv = response.Metadata.iv;
        const authTag = response.Metadata.authTag;

        if (!iv || !authTag) {
          throw new Error('Missing encryption metadata');
        }

        return this.decrypt(buffer, iv, authTag);
      }

      return buffer;
    } catch (error) {
      logger.error('Error downloading file from R2:', error);
      throw new Error('Failed to download file');
    }
  }

  /**
   * Delete a file from R2
   */
  static async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await r2Client.send(command);
    } catch (error) {
      logger.error('Error deleting file from R2:', error);
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
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(4).toString('hex');
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

    return `${type}/${userId}/${timestamp}-${randomStr}-${sanitizedFileName}`;
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
