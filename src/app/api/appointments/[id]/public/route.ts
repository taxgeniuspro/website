/**
 * Public Appointment API - Token-based access for clients
 * Allows clients to view/reschedule/cancel appointments via email links
 *
 * Token format: base64(appointmentId:clientEmail:timestamp)
 * Token is valid for 7 days from creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

const TOKEN_SECRET = process.env.AUTH_SECRET || 'appointment-management-secret';
const TOKEN_EXPIRY_DAYS = 7;

/**
 * Generate a management token for an appointment
 */
export function generateAppointmentToken(appointmentId: string, clientEmail: string): string {
  const timestamp = Date.now();
  const data = `${appointmentId}:${clientEmail.toLowerCase()}:${timestamp}`;
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('hex').substring(0, 16);
  const token = Buffer.from(`${data}:${signature}`).toString('base64url');
  return token;
}

/**
 * Verify a management token
 */
function verifyToken(token: string): { appointmentId: string; clientEmail: string; valid: boolean; error?: string } {
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

/**
 * GET /api/appointments/[id]/public?token=xxx
 * Get appointment details for public management page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Management token required' }, { status: 400 });
    }

    const verification = verifyToken(token);
    if (!verification.valid) {
      logger.warn('Invalid appointment management token', { appointmentId: id, error: verification.error });
      return NextResponse.json({ error: verification.error || 'Invalid or expired token' }, { status: 401 });
    }

    if (verification.appointmentId !== id) {
      return NextResponse.json({ error: 'Token does not match appointment' }, { status: 401 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        preparer: {
          select: {
            firstName: true,
            lastName: true,
            avatarUrl: true,
            user: { select: { email: true } },
          },
        },
        service: {
          select: {
            name: true,
            duration: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Verify client email matches
    if (appointment.clientEmail.toLowerCase() !== verification.clientEmail.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid token for this appointment' }, { status: 401 });
    }

    // Return appointment details (excluding sensitive data)
    return NextResponse.json({
      id: appointment.id,
      clientName: appointment.clientName,
      status: appointment.status,
      type: appointment.type,
      scheduledFor: appointment.scheduledFor,
      scheduledEnd: appointment.scheduledEnd,
      duration: appointment.duration,
      timezone: appointment.timezone,
      subject: appointment.subject,
      meetingLink: appointment.meetingLink,
      location: appointment.location,
      preparer: appointment.preparer ? {
        name: `${appointment.preparer.firstName || ''} ${appointment.preparer.lastName || ''}`.trim(),
        avatarUrl: appointment.preparer.avatarUrl,
      } : null,
      service: appointment.service ? {
        name: appointment.service.name,
        duration: appointment.service.duration,
      } : null,
      canReschedule: appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED',
      canCancel: appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED',
    });
  } catch (error) {
    logger.error('Error fetching public appointment', { error });
    return NextResponse.json({ error: 'Failed to fetch appointment' }, { status: 500 });
  }
}
