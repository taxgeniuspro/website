/**
 * Fluid Booking API - Cancel Appointment
 * Allows canceling an existing appointment
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/services/email.service';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

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
    const { reason, cancelledBy } = body;

    // Get existing appointment with preparer info for emails
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
      userProfile?.role === 'admin';

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

    // Send cancellation notification emails to both client and preparer
    const preparerName = appointment.preparer
      ? `${appointment.preparer.firstName || ''} ${appointment.preparer.lastName || ''}`.trim() || 'Tax Preparer'
      : 'Tax Preparer';
    const preparerEmail = appointment.preparer?.user?.email;
    const appointmentType = formatAppointmentType(appointment.type);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
    const rebookUrl = appointment.preparerId
      ? `${appUrl}/book?preparer=${appointment.preparerId}`
      : `${appUrl}/book`;

    // Send email to client
    try {
      await EmailService.sendAppointmentCancelledEmail(appointment.clientEmail, {
        recipientName: appointment.clientName,
        recipientType: 'client',
        appointmentType,
        scheduledFor: appointment.scheduledFor!,
        duration: appointment.duration || 30,
        preparerName,
        cancelledBy: canceller as 'client' | 'preparer' | 'admin',
        reason,
        rebookUrl,
      });
      logger.info('Cancellation email sent to client', { appointmentId: id, clientEmail: appointment.clientEmail });
    } catch (emailError) {
      logger.error('Failed to send cancellation email to client', { appointmentId: id, error: emailError });
    }

    // Send email to preparer
    if (preparerEmail) {
      try {
        await EmailService.sendAppointmentCancelledEmail(preparerEmail, {
          recipientName: preparerName,
          recipientType: 'preparer',
          appointmentType,
          scheduledFor: appointment.scheduledFor!,
          duration: appointment.duration || 30,
          clientName: appointment.clientName,
          cancelledBy: canceller as 'client' | 'preparer' | 'admin',
          reason,
        });
        logger.info('Cancellation email sent to preparer', { appointmentId: id, preparerEmail });
      } catch (emailError) {
        logger.error('Failed to send cancellation email to preparer', { appointmentId: id, error: emailError });
      }
    }

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
    logger.error('Error cancelling appointment', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      {
        error: 'Failed to cancel appointment',
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
