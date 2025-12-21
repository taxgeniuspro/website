/**
 * HMAC Utility for State Token Signing
 *
 * Used for signing OAuth state parameters to prevent CSRF attacks
 * during account linking flows.
 */

import crypto from 'crypto';

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '';

if (!AUTH_SECRET) {
  console.warn('Warning: AUTH_SECRET not set. State token signing will be insecure.');
}

/**
 * Create a signed state token for OAuth flows
 * @param payload - Object to encode in the token
 * @param expiresInMs - Token expiration time in milliseconds (default: 10 minutes)
 * @returns Base64URL encoded signed token
 */
export function createStateToken(
  payload: Record<string, unknown>,
  expiresInMs: number = 10 * 60 * 1000
): string {
  const tokenData = {
    ...payload,
    exp: Date.now() + expiresInMs,
    iat: Date.now(),
  };

  const payloadStr = JSON.stringify(tokenData);
  const signature = createHmacSignature(payloadStr);

  // Combine payload and signature with a separator
  const combined = `${payloadStr}|${signature}`;

  // Base64URL encode for URL safety
  return Buffer.from(combined).toString('base64url');
}

/**
 * Verify and decode a signed state token
 * @param token - Base64URL encoded signed token
 * @returns Decoded payload or null if invalid/expired
 */
export function verifyStateToken(token: string): Record<string, unknown> | null {
  try {
    // Decode from base64url
    const combined = Buffer.from(token, 'base64url').toString('utf-8');

    // Split payload and signature
    const separatorIndex = combined.lastIndexOf('|');
    if (separatorIndex === -1) {
      return null;
    }

    const payloadStr = combined.substring(0, separatorIndex);
    const signature = combined.substring(separatorIndex + 1);

    // Verify signature
    const expectedSignature = createHmacSignature(payloadStr);
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    // Parse payload
    const payload = JSON.parse(payloadStr);

    // Check expiration
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Create HMAC-SHA256 signature
 * @param data - String to sign
 * @returns Hex-encoded signature
 */
function createHmacSignature(data: string): string {
  return crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('hex');
}

/**
 * Generate a random nonce for additional security
 * @returns Random hex string
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}
