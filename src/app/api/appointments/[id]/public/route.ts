/**
 * Public Appointment API - Token-based access for clients
 * Allows clients to view/reschedule/cancel appointments via email links
 *
 * Token format: base64(appointmentId:clientEmail:timestamp)
 * Token is valid for 7 days from creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

// Local TypeScript interfaces
interface ServiceInfo {
  name: string;
  duration: number | null;
}

interface PrepararProfile {
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  userId: string;
}

interface Appointment {
  id: string;
  preparerId: string;
  clientName: string;
  clientEmail: string;
  type: string;
  status: string;
  subject: string | null;
  scheduledFor: string | null;
  scheduledEnd: string | null;
  duration: number | null;
  timezone: string | null;
  serviceId: string | null;
  location: string | null;
  meetingLink: string | null;
}

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

    const { data: appointmentData } = await db
      .from('appointments')
      .select('id, preparerId:preparer_id, clientName:client_name, clientEmail:client_email, type, status, subject, scheduledFor:scheduled_for, scheduledEnd:scheduled_end, duration, timezone, serviceId:service_id, location, meetingLink:meeting_link')
      .eq('id', id)
      .limit(1);
    const appointment = firstOrNull<Appointment>(appointmentData);

    // Get preparer info
    let preparerInfo: { name: string; avatarUrl: string | null } | null = null;
    if (appointment?.preparerId) {
      const { data: preparerData } = await db
        .from('profiles')
        .select('firstName:first_name, lastName:last_name, avatarUrl:avatar_url')
        .eq('id', appointment.preparerId)
        .limit(1);
      const preparer = firstOrNull<PrepararProfile>(preparerData);
      if (preparer) {
        preparerInfo = {
          name: `${preparer.firstName || ''} ${preparer.lastName || ''}`.trim(),
          avatarUrl: preparer.avatarUrl,
        };
      }
    }

    // Get service info
    let serviceInfo: { name: string; duration: number | null } | null = null;
    if (appointment?.serviceId) {
      const { data: serviceData } = await db
        .from('services')
        .select('name, duration')
        .eq('id', appointment.serviceId)
        .limit(1);
      serviceInfo = firstOrNull<ServiceInfo>(serviceData);
    }

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
      preparer: preparerInfo,
      service: serviceInfo,
      canReschedule: appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED',
      canCancel: appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED',
    });
  } catch (error) {
    logger.error('Error fetching public appointment', { error });
    return NextResponse.json({ error: 'Failed to fetch appointment' }, { status: 500 });
  }
}
