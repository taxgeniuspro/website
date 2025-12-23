/**
 * Public Appointment Reschedule API
 * Token-based access for clients to reschedule appointments
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AvailabilityService } from '@/lib/services/availability.service';
import { EmailService } from '@/lib/services/email.service';
import { logger } from '@/lib/logger';
import { addMinutes, parseISO } from 'date-fns';
import crypto from 'crypto';

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
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        preparer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
          },
        },
      },
    });

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

    const oldScheduledFor = appointment.scheduledFor!;

    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        scheduledFor,
        scheduledEnd,
        notes: reason ? `${appointment.notes || ''}\n\nRescheduled by client: ${reason}`.trim() : appointment.notes,
        // Reset reminder flags since time changed
        reminder24hSent: false,
        reminder1hSent: false,
        reminderSentAt: null,
        updatedAt: new Date(),
      },
    });

    // Send notification emails
    const preparerName = appointment.preparer
      ? `${appointment.preparer.firstName || ''} ${appointment.preparer.lastName || ''}`.trim() || 'Tax Preparer'
      : 'Tax Preparer';
    const preparerEmail = appointment.preparer?.user?.email;
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
