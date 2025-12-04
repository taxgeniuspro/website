/**
 * Fluid Booking API - Cancel Appointment
 * Allows canceling an existing appointment
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    const { reason, cancelledBy } = body;

    // Get existing appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check if already cancelled
    if (appointment.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Appointment is already cancelled' },
        { status: 400 }
      );
    }

    // Check permissions: only preparer, client, or admin can cancel
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
        { error: 'You do not have permission to cancel this appointment' },
        { status: 403 }
      );
    }

    // Determine who cancelled
    let canceller = cancelledBy;
    if (!canceller) {
      if (userProfile?.id === appointment.preparerId) {
        canceller = 'preparer';
      } else if (userProfile?.id === appointment.clientId) {
        canceller = 'client';
      } else {
        canceller = 'admin';
      }
    }

    // Cancel appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: canceller,
        cancellationReason: reason,
        updatedAt: new Date(),
      },
    });

    // TODO: Send cancellation notification emails to both client and preparer
    // This will be implemented in Phase 6 with email templates

    // TODO: Remove from external calendars (Google Calendar, Outlook)
    // This will be implemented in Phase 5 with calendar sync

    return NextResponse.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment: {
        id: updatedAppointment.id,
        status: updatedAppointment.status,
        cancelledAt: updatedAppointment.cancelledAt,
        cancelledBy: updatedAppointment.cancelledBy,
        cancellationReason: updatedAppointment.cancellationReason,
      },
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return NextResponse.json(
      {
        error: 'Failed to cancel appointment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
