/**
 * Encryption Utilities for Professional Email System
 *
 * Provides secure encryption/decryption for sensitive credentials:
 * - SMTP passwords
 * - OAuth tokens
 * - Gmail access tokens
 *
 * Uses AES-256-CBC encryption with the EMAIL_ENCRYPTION_KEY from environment
 */

import crypto from 'crypto';
import { logger } from '@/lib/logger';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES block size

/**
 * Get encryption key from environment
 * Converts hex string to Buffer for crypto operations
 */
function getEncryptionKey(): Buffer {
  const key = process.env.EMAIL_ENCRYPTION_KEY;

  if (!key) {
    throw new Error('EMAIL_ENCRYPTION_KEY environment variable is not set');
  }

  if (key.length !== 64) {
    throw new Error('EMAIL_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a password or sensitive string
 * Returns encrypted data as hex string with format: IV:EncryptedData
 *
 * @param text - Plain text to encrypt
 * @returns Encrypted string (hex format with IV prefix)
 *
 * @example
 * const encrypted = encryptPassword('mySecretPassword123');
 * // Returns: "a1b2c3d4....:e5f6g7h8...."
 */
export function encryptPassword(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV:encrypted format so we can decrypt later
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    logger.error('Failed to encrypt password:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt an encrypted password
 * Expects format: IV:EncryptedData (as returned by encryptPassword)
 *
 * @param encryptedText - Encrypted string from encryptPassword()
 * @returns Decrypted plain text
 *
 * @example
 * const decrypted = decryptPassword('a1b2c3d4....:e5f6g7h8....');
 * // Returns: "mySecretPassword123"
 */
export function decryptPassword(encryptedText: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Failed to decrypt password:', error);
    throw new Error('Decryption failed');
  }
}

/**
 * Generate a random secure token
 * Useful for verification codes, API keys, etc.
 *
 * @param length - Number of random bytes (output will be 2x length in hex)
 * @returns Random hex string
 *
 * @example
 * const token = generateRandomToken(16);
 * // Returns 32-character hex string: "a1b2c3d4e5f6g7h8..."
 */
export function generateRandomToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a password for comparison (not encryption)
 * Uses SHA-256 for quick hashing
 *
 * @param text - Text to hash
 * @returns SHA-256 hash (hex)
 */
export function hashPassword(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Verify a hashed password
 *
 * @param text - Plain text to verify
 * @param hash - Hash to compare against
 * @returns True if text matches hash
 */
export function verifyHash(text: string, hash: string): boolean {
  const textHash = hashPassword(text);
  return crypto.timingSafeEqual(Buffer.from(textHash), Buffer.from(hash));
}

/**
 * Encrypt OAuth tokens (Gmail access tokens, etc.)
 * Alias for encryptPassword with better naming
 */
export const encryptToken = encryptPassword;

/**
 * Decrypt OAuth tokens
 * Alias for decryptPassword with better naming
 */
export const decryptToken = decryptPassword;
