/**
 * Supabase Storage Service
 *
 * Unified file storage using Supabase Storage
 * Replaces Cloudinary, R2/S3, and local filesystem storage
 *
 * Buckets:
 * - documents: Private files (tax docs, client files) - requires signed URLs
 * - images: Public images (avatars, marketing assets)
 * - avatars: User profile pictures (public)
 */
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export type StorageBucket = 'documents' | 'images' | 'avatars';

export interface UploadResult {
  path: string;
  fullPath: string;
  publicUrl?: string;
}

/**
 * Upload a file to Supabase Storage
 *
 * @param bucket - The storage bucket ('documents', 'images', 'avatars')
 * @param path - The path within the bucket (e.g., 'referral/image.jpg')
 * @param file - The file data (File, Blob, or Buffer)
 * @param contentType - MIME type of the file
 * @returns Upload result with path and public URL (for public buckets)
 */
export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  file: File | Blob | Buffer | ArrayBuffer,
  contentType: string
): Promise<UploadResult> {
  const supabase = await createClient();

  // Convert ArrayBuffer to Blob if needed
  let uploadData: File | Blob | Buffer = file as File | Blob | Buffer;
  if (file instanceof ArrayBuffer) {
    uploadData = new Blob([file], { type: contentType });
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, uploadData, {
      contentType,
      upsert: true,
    });

  if (error) {
    logger.error('[Storage] Upload failed', { bucket, path, error: error.message });
    throw new Error(`Upload failed: ${error.message}`);
  }

  logger.info('[Storage] File uploaded', { bucket, path: data.path });

  // Get public URL for public buckets
  let publicUrl: string | undefined;
  if (bucket === 'images' || bucket === 'avatars') {
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    publicUrl = urlData.publicUrl;
  }

  return {
    path: data.path,
    fullPath: `${bucket}/${data.path}`,
    publicUrl,
  };
}

/**
 * Get public URL for a file in a public bucket
 *
 * @param bucket - The storage bucket
 * @param path - The file path within the bucket
 * @returns The public URL
 */
export async function getPublicUrl(bucket: StorageBucket, path: string): Promise<string> {
  const supabase = await createClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Get a signed URL for private file access
 *
 * @param bucket - The storage bucket
 * @param path - The file path within the bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns The signed URL
 */
export async function getSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    logger.error('[Storage] Failed to create signed URL', { bucket, path, error: error.message });
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete a file from storage
 *
 * @param bucket - The storage bucket
 * @param path - The file path within the bucket
 */
export async function deleteFile(bucket: StorageBucket, path: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    logger.error('[Storage] Delete failed', { bucket, path, error: error.message });
    throw new Error(`Delete failed: ${error.message}`);
  }

  logger.info('[Storage] File deleted', { bucket, path });
}

/**
 * Delete multiple files from storage
 *
 * @param bucket - The storage bucket
 * @param paths - Array of file paths within the bucket
 */
export async function deleteFiles(bucket: StorageBucket, paths: string[]): Promise<void> {
  if (paths.length === 0) return;

  const supabase = await createClient();

  const { error } = await supabase.storage.from(bucket).remove(paths);

  if (error) {
    logger.error('[Storage] Bulk delete failed', { bucket, count: paths.length, error: error.message });
    throw new Error(`Bulk delete failed: ${error.message}`);
  }

  logger.info('[Storage] Files deleted', { bucket, count: paths.length });
}

/**
 * List files in a bucket/folder
 *
 * @param bucket - The storage bucket
 * @param folder - The folder path (optional)
 * @param options - List options (limit, offset)
 * @returns Array of file objects
 */
export async function listFiles(
  bucket: StorageBucket,
  folder?: string,
  options?: { limit?: number; offset?: number }
) {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder, {
      limit: options?.limit || 100,
      offset: options?.offset || 0,
    });

  if (error) {
    logger.error('[Storage] List failed', { bucket, folder, error: error.message });
    throw new Error(`List failed: ${error.message}`);
  }

  return data;
}

/**
 * Download a file from storage
 *
 * @param bucket - The storage bucket
 * @param path - The file path within the bucket
 * @returns The file as a Blob
 */
export async function downloadFile(bucket: StorageBucket, path: string): Promise<Blob> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) {
    logger.error('[Storage] Download failed', { bucket, path, error: error.message });
    throw new Error(`Download failed: ${error.message}`);
  }

  return data;
}

/**
 * Move/rename a file within a bucket
 *
 * @param bucket - The storage bucket
 * @param fromPath - Current file path
 * @param toPath - New file path
 */
export async function moveFile(
  bucket: StorageBucket,
  fromPath: string,
  toPath: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.storage.from(bucket).move(fromPath, toPath);

  if (error) {
    logger.error('[Storage] Move failed', { bucket, fromPath, toPath, error: error.message });
    throw new Error(`Move failed: ${error.message}`);
  }

  logger.info('[Storage] File moved', { bucket, fromPath, toPath });
}

/**
 * Copy a file within a bucket
 *
 * @param bucket - The storage bucket
 * @param fromPath - Source file path
 * @param toPath - Destination file path
 */
export async function copyFile(
  bucket: StorageBucket,
  fromPath: string,
  toPath: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.storage.from(bucket).copy(fromPath, toPath);

  if (error) {
    logger.error('[Storage] Copy failed', { bucket, fromPath, toPath, error: error.message });
    throw new Error(`Copy failed: ${error.message}`);
  }

  logger.info('[Storage] File copied', { bucket, fromPath, toPath });
}

/**
 * Generate a unique filename with timestamp
 *
 * @param originalName - Original filename
 * @param prefix - Optional prefix for the filename
 * @returns Unique filename
 */
export function generateUniqueFilename(originalName: string, prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = originalName.split('.').pop() || '';
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-');

  if (prefix) {
    return `${prefix}/${baseName}-${timestamp}-${random}.${ext}`;
  }
  return `${baseName}-${timestamp}-${random}.${ext}`;
}

/**
 * Upload an image with optional resizing
 * For now, just uploads as-is. Image processing can be added later.
 *
 * @param bucket - The storage bucket
 * @param path - The file path
 * @param imageData - The image data
 * @param contentType - MIME type
 * @returns Upload result with public URL
 */
export async function uploadImage(
  bucket: StorageBucket,
  path: string,
  imageData: File | Blob | Buffer | ArrayBuffer,
  contentType: string = 'image/jpeg'
): Promise<UploadResult> {
  // Upload directly for now
  // Image processing/resizing can be added here if needed
  return uploadFile(bucket, path, imageData, contentType);
}
