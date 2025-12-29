/**
 * Fluid Booking API - Reschedule Appointment
 * Allows rescheduling an existing appointment to a new time
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { AvailabilityService } from '@/lib/services/availability.service';
import { EmailService } from '@/lib/services/email.service';
import { addMinutes, parseISO } from 'date-fns';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

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
  clientId: string | null;
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

interface Profile {
  id: string;
  role: string | null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { newScheduledFor, newDuration, reason } = body;

    // Validate required fields
    if (!newScheduledFor) {
      return NextResponse.json(
        { error: 'newScheduledFor is required (ISO 8601 format)' },
        { status: 400 }
      );
    }

    // Parse new date
    let scheduledFor: Date;
    try {
      scheduledFor = parseISO(newScheduledFor);
      if (isNaN(scheduledFor.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid date format for newScheduledFor' },
        { status: 400 }
      );
    }

    // Get existing appointment with client and preparer info for emails
    const { data: appointmentData } = await db
      .from('appointments')
      .select('id, preparerId:preparer_id, clientId:client_id, clientName:client_name, clientEmail:client_email, type, status, scheduledFor:scheduled_for, scheduledEnd:scheduled_end, duration, notes, serviceId:service_id, location, meetingLink:meeting_link')
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
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check permissions: only preparer, client, or admin can reschedule
    const { data: userProfileData } = await db
      .from('profiles')
      .select('id, role')
      .eq('user_id', session.user.id)
      .limit(1);
    const userProfile = firstOrNull<Profile>(userProfileData);

    const isAuthorized =
      userProfile?.id === appointment.preparerId ||
      userProfile?.id === appointment.clientId ||
      userProfile?.role === 'admin' ||
      userProfile?.role === 'admin';

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'You do not have permission to reschedule this appointment' },
        { status: 403 }
      );
    }

    // Use existing duration or provided new duration
    const duration = newDuration || appointment.duration || 30;
    const scheduledEnd = addMinutes(scheduledFor, duration);

    // Validate new slot is available
    const validation = await AvailabilityService.validateBookingSlot(
      appointment.preparerId,
      scheduledFor,
      duration,
      appointment.serviceId || undefined
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Selected time slot is not available' },
        { status: 400 }
      );
    }

    // Update appointment
    const { data: updatedData, error: updateError } = await db
      .from('appointments')
      .update({
        scheduled_for: scheduledFor.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        duration,
        notes: reason
          ? `${appointment.notes || ''}\n\nRescheduled: ${reason}`.trim()
          : appointment.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, scheduledFor:scheduled_for, scheduledEnd:scheduled_end, duration, status')
      .single();

    if (updateError) {
      throw new Error(`Failed to reschedule appointment: ${updateError.message}`);
    }
    const updatedAppointment = updatedData;

    // Send reschedule notification emails to both client and preparer
    const oldScheduledFor = appointment.scheduledFor ? new Date(appointment.scheduledFor) : new Date();
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
      logger.info('Reschedule email sent to client', { appointmentId: id, clientEmail: appointment.clientEmail });
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
        logger.info('Reschedule email sent to preparer', { appointmentId: id, preparerEmail });
      } catch (emailError) {
        logger.error('Failed to send reschedule email to preparer', { appointmentId: id, error: emailError });
      }
    }

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
    logger.error('Error rescheduling appointment', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      {
        error: 'Failed to reschedule appointment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
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
