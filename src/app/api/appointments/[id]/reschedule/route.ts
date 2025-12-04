/**
 * Fluid Booking API - Reschedule Appointment
 * Allows rescheduling an existing appointment to a new time
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AvailabilityService } from '@/lib/services/availability.service';
import { addMinutes, parseISO } from 'date-fns';
import { auth } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
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

    // Get existing appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        // We'll need preparer info for validation
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check permissions: only preparer, client, or admin can reschedule
    const userProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    const isAuthorized =
      userProfile?.id === appointment.preparerId ||
      userProfile?.id === appointment.clientId ||
      userProfile?.role === 'admin' ||
      userProfile?.role === 'super_admin';

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
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        scheduledFor,
        scheduledEnd,
        duration,
        notes: reason
          ? `${appointment.notes || ''}\n\nRescheduled: ${reason}`.trim()
          : appointment.notes,
        updatedAt: new Date(),
      },
    });

    // TODO: Send reschedule notification emails to both client and preparer
    // This will be implemented in Phase 6 with email templates

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
    console.error('Error rescheduling appointment:', error);
    return NextResponse.json(
      {
        error: 'Failed to reschedule appointment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
