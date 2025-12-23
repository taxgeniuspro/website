/**
 * Appointment Management Token Utilities
 * Generates and verifies tokens for public appointment management
 */

import crypto from 'crypto';

const TOKEN_SECRET = process.env.AUTH_SECRET || 'appointment-management-secret';
const TOKEN_EXPIRY_DAYS = 7;

/**
 * Generate a management token for an appointment
 * Token format: base64url(appointmentId:clientEmail:timestamp:signature)
 */
export function generateAppointmentToken(appointmentId: string, clientEmail: string): string {
  const timestamp = Date.now();
  const data = `${appointmentId}:${clientEmail.toLowerCase()}:${timestamp}`;
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('hex').substring(0, 16);
  const token = Buffer.from(`${data}:${signature}`).toString('base64url');
  return token;
}

/**
 * Generate the management URL for an appointment
 */
export function generateAppointmentManageUrl(appointmentId: string, clientEmail: string): string {
  const token = generateAppointmentToken(appointmentId, clientEmail);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
  return `${appUrl}/appointments/${appointmentId}/manage?token=${token}`;
}

/**
 * Verify a management token
 */
export function verifyAppointmentToken(token: string): {
  appointmentId: string;
  clientEmail: string;
  valid: boolean;
  error?: string;
} {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const parts = decoded.split(':');
    if (parts.length !== 4) {
      return { appointmentId: '', clientEmail: '', valid: false, error: 'Invalid token format' };
    }

    const [appointmentId, clientEmail, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);

    // Check expiry
    const expiryMs = TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - timestamp > expiryMs) {
      return { appointmentId, clientEmail, valid: false, error: 'Token expired' };
    }

    // Verify signature
    const data = `${appointmentId}:${clientEmail}:${timestampStr}`;
    const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('hex').substring(0, 16);
    if (signature !== expectedSignature) {
      return { appointmentId, clientEmail, valid: false, error: 'Invalid token signature' };
    }

    return { appointmentId, clientEmail, valid: true };
  } catch {
    return { appointmentId: '', clientEmail: '', valid: false, error: 'Token decoding failed' };
  }
}
