/**
 * Public Appointment Cancel API
 * Token-based access for clients to cancel appointments
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/services/email.service';
import { logger } from '@/lib/logger';
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
    const { token, reason } = body;

    if (!token) {
      return NextResponse.json({ error: 'Management token required' }, { status: 400 });
    }

    const verification = verifyToken(token);
    if (!verification.valid) {
      logger.warn('Invalid appointment cancel token', { appointmentId: id, error: verification.error });
      return NextResponse.json({ error: verification.error || 'Invalid or expired token' }, { status: 401 });
    }

    if (verification.appointmentId !== id) {
      return NextResponse.json({ error: 'Token does not match appointment' }, { status: 401 });
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

    // Check if appointment can be cancelled
    if (appointment.status === 'CANCELLED') {
      return NextResponse.json({ error: 'This appointment is already cancelled' }, { status: 400 });
    }

    if (appointment.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Completed appointments cannot be cancelled' }, { status: 400 });
    }

    // Cancel appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: 'client',
        cancellationReason: reason,
        updatedAt: new Date(),
      },
    });

    // Send notification emails
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
        cancelledBy: 'client',
        reason,
        rebookUrl,
      });
    } catch (emailError) {
      logger.error('Failed to send cancel email to client', { appointmentId: id, error: emailError });
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
          cancelledBy: 'client',
          reason,
        });
      } catch (emailError) {
        logger.error('Failed to send cancel email to preparer', { appointmentId: id, error: emailError });
      }
    }

    logger.info('Appointment cancelled via public link', {
      appointmentId: id,
      clientEmail: appointment.clientEmail,
    });

    return NextResponse.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment: {
        id: updatedAppointment.id,
        status: updatedAppointment.status,
        cancelledAt: updatedAppointment.cancelledAt,
      },
    });
  } catch (error) {
    logger.error('Error cancelling appointment via public link', { error });
    return NextResponse.json({ error: 'Failed to cancel appointment' }, { status: 500 });
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
