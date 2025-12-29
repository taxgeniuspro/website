/**
 * Public Appointment Reschedule API
 * Token-based access for clients to reschedule appointments
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { AvailabilityService } from '@/lib/services/availability.service';
import { EmailService } from '@/lib/services/email.service';
import { logger } from '@/lib/logger';
import { addMinutes, parseISO } from 'date-fns';
import crypto from 'crypto';

// Local TypeScript interfaces
interface PreparerUser {
  email: string;
}

interface Preparer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  user: PreparerUser | null;
}

interface Appointment {
  id: string;
  preparerId: string;
  clientName: string;
  clientEmail: string;
  type: string;
  status: string;
  scheduledFor: string | null;
  scheduledEnd: string | null;
  duration: number | null;
  notes: string | null;
  serviceId: string | null;
  location: string | null;
  meetingLink: string | null;
}

const TOKEN_SECRET = process.env.AUTH_SECRET || 'appointment-management-secret';
const TOKEN_EXPIRY_DAYS = 7;

function verifyToken(token: string): { appointmentId: string; clientEmail: string; valid: boolean; error?: string } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const parts = decoded.split(':');
    if (parts.length !== 4) {
      return { appointmentId: '', clientEmail: '', valid: false, error: 'Invalid token format' };
    }

    const [appointmentId, clientEmail, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);

    const expiryMs = TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - timestamp > expiryMs) {
      return { appointmentId, clientEmail, valid: false, error: 'Token expired' };
    }

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { token, newScheduledFor, reason } = body;

    if (!token) {
      return NextResponse.json({ error: 'Management token required' }, { status: 400 });
    }

    if (!newScheduledFor) {
      return NextResponse.json({ error: 'newScheduledFor is required' }, { status: 400 });
    }

    const verification = verifyToken(token);
    if (!verification.valid) {
      logger.warn('Invalid appointment reschedule token', { appointmentId: id, error: verification.error });
      return NextResponse.json({ error: verification.error || 'Invalid or expired token' }, { status: 401 });
    }

    if (verification.appointmentId !== id) {
      return NextResponse.json({ error: 'Token does not match appointment' }, { status: 401 });
    }

    // Parse new date
    let scheduledFor: Date;
    try {
      scheduledFor = parseISO(newScheduledFor);
      if (isNaN(scheduledFor.getTime())) {
        throw new Error('Invalid date');
      }
    } catch {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Get appointment with preparer info
    const { data: appointmentData } = await db
      .from('appointments')
      .select('id, preparerId:preparer_id, clientName:client_name, clientEmail:client_email, type, status, scheduledFor:scheduled_for, scheduledEnd:scheduled_end, duration, notes, serviceId:service_id, location, meetingLink:meeting_link')
      .eq('id', id)
      .limit(1);
    const appointment = firstOrNull<Appointment>(appointmentData);

    // Get preparer info separately if appointment exists
    let preparer: Preparer | null = null;
    if (appointment?.preparerId) {
      const { data: preparerData } = await db
        .from('profiles')
        .select('id, firstName:first_name, lastName:last_name, userId:user_id')
        .eq('id', appointment.preparerId)
        .limit(1);
      const preparerProfile = firstOrNull(preparerData);

      if (preparerProfile) {
        const { data: userData } = await db
          .from('users')
          .select('email')
          .eq('id', preparerProfile.userId)
          .limit(1);
        const user = firstOrNull(userData);
        preparer = {
          id: preparerProfile.id,
          firstName: preparerProfile.firstName,
          lastName: preparerProfile.lastName,
          user: user ? { email: user.email } : null,
        };
      }
    }

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Verify client email
    if (appointment.clientEmail.toLowerCase() !== verification.clientEmail.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid token for this appointment' }, { status: 401 });
    }

    // Check if appointment can be rescheduled
    if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
      return NextResponse.json({ error: 'This appointment cannot be rescheduled' }, { status: 400 });
    }

    const duration = appointment.duration || 30;
    const scheduledEnd = addMinutes(scheduledFor, duration);

    // Validate new slot is available
    const validation = await AvailabilityService.validateBookingSlot(
      appointment.preparerId,
      scheduledFor,
      duration,
      appointment.serviceId || undefined
    );

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Selected time slot is not available' }, { status: 400 });
    }

    const oldScheduledFor = appointment.scheduledFor ? new Date(appointment.scheduledFor) : new Date();

    // Update appointment
    const { data: updatedData, error: updateError } = await db
      .from('appointments')
      .update({
        scheduled_for: scheduledFor.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        notes: reason ? `${appointment.notes || ''}\n\nRescheduled by client: ${reason}`.trim() : appointment.notes,
        // Reset reminder flags since time changed
        reminder_24h_sent: false,
        reminder_1h_sent: false,
        reminder_sent_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, scheduledFor:scheduled_for, scheduledEnd:scheduled_end, duration, status')
      .single();

    if (updateError) {
      throw new Error(`Failed to reschedule appointment: ${updateError.message}`);
    }
    const updatedAppointment = updatedData;

    // Send notification emails
    const preparerName = preparer
      ? `${preparer.firstName || ''} ${preparer.lastName || ''}`.trim() || 'Tax Preparer'
      : 'Tax Preparer';
    const preparerEmail = preparer?.user?.email;
    const appointmentType = formatAppointmentType(appointment.type);

    // Send email to client
    try {
      await EmailService.sendAppointmentRescheduledEmail(appointment.clientEmail, {
        recipientName: appointment.clientName,
        recipientType: 'client',
        appointmentType,
        oldDate: oldScheduledFor,
        newDate: scheduledFor,
        duration,
        preparerName,
        meetingLink: appointment.meetingLink || undefined,
        location: appointment.location || undefined,
        reason,
      });
    } catch (emailError) {
      logger.error('Failed to send reschedule email to client', { appointmentId: id, error: emailError });
    }

    // Send email to preparer
    if (preparerEmail) {
      try {
        await EmailService.sendAppointmentRescheduledEmail(preparerEmail, {
          recipientName: preparerName,
          recipientType: 'preparer',
          appointmentType,
          oldDate: oldScheduledFor,
          newDate: scheduledFor,
          duration,
          clientName: appointment.clientName,
          meetingLink: appointment.meetingLink || undefined,
          location: appointment.location || undefined,
          reason,
        });
      } catch (emailError) {
        logger.error('Failed to send reschedule email to preparer', { appointmentId: id, error: emailError });
      }
    }

    logger.info('Appointment rescheduled via public link', {
      appointmentId: id,
      clientEmail: appointment.clientEmail,
      oldTime: oldScheduledFor,
      newTime: scheduledFor,
    });

    return NextResponse.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      appointment: {
        id: updatedAppointment.id,
        scheduledFor: updatedAppointment.scheduledFor,
        scheduledEnd: updatedAppointment.scheduledEnd,
        duration: updatedAppointment.duration,
        status: updatedAppointment.status,
      },
    });
  } catch (error) {
    logger.error('Error rescheduling appointment via public link', { error });
    return NextResponse.json({ error: 'Failed to reschedule appointment' }, { status: 500 });
  }
}

function formatAppointmentType(type: string): string {
  const typeLabels: Record<string, string> = {
    PHONE_CALL: 'Phone Call',
    VIDEO_CALL: 'Video Call',
    IN_PERSON: 'In-Person Meeting',
    TAX_CONSULTATION: 'Tax Consultation',
    FOLLOW_UP: 'Follow-Up',
  };
  return typeLabels[type] || type;
}
