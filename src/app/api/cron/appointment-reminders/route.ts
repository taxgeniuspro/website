/**
 * Cron Job: Appointment Reminders
 *
 * Runs every 15 minutes to send appointment reminder emails:
 * - 24 hours before: Send 24h reminder
 * - 1 hour before: Send 1h reminder
 *
 * Uses the Appointment.reminder24hSent and reminder1hSent flags
 * to prevent duplicate emails.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { EmailService } from '@/lib/services/email.service';

// Coolify cron jobs use GET requests
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, require authorization
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        logger.warn('Unauthorized cron job attempt - appointment-reminders');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const now = new Date();
    const results = {
      sent24h: 0,
      sent1h: 0,
      errors: 0,
    };

    // ========================================
    // 24-HOUR REMINDERS
    // ========================================
    // Find appointments scheduled between 23.5 and 24.5 hours from now
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twentyThreeAndHalfHours = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
    const twentyFourAndHalfHours = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);

    const appointments24h = await prisma.appointment.findMany({
      where: {
        scheduledFor: {
          gte: twentyThreeAndHalfHours,
          lte: twentyFourAndHalfHours,
        },
        reminder24hSent: false,
        status: {
          in: ['SCHEDULED', 'CONFIRMED'],
        },
      },
      include: {
        preparer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: {
              select: { email: true },
            },
          },
        },
      },
    });

    logger.info(`Found ${appointments24h.length} appointments for 24h reminder`);

    for (const appointment of appointments24h) {
      try {
        // Send reminder to client
        await EmailService.sendAppointmentReminderEmail(
          appointment.clientEmail,
          {
            clientName: appointment.clientName,
            preparerName: `${appointment.preparer?.firstName || ''} ${appointment.preparer?.lastName || ''}`.trim() || 'Your Tax Preparer',
            appointmentType: formatAppointmentType(appointment.type),
            scheduledFor: appointment.scheduledFor!,
            duration: appointment.duration || 30,
            reminderType: '24h',
            meetingLink: appointment.meetingLink || undefined,
            location: appointment.location || undefined,
          }
        );

        // Update flag to prevent duplicate emails
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            reminder24hSent: true,
            reminderSentAt: new Date(),
          },
        });

        results.sent24h++;
        logger.info('24h reminder sent', {
          appointmentId: appointment.id,
          clientEmail: appointment.clientEmail,
        });
      } catch (error) {
        results.errors++;
        logger.error('Failed to send 24h reminder', {
          appointmentId: appointment.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // ========================================
    // 1-HOUR REMINDERS
    // ========================================
    // Find appointments scheduled between 45 min and 1h 15min from now
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const fortyFiveMinutes = new Date(now.getTime() + 45 * 60 * 1000);
    const oneHourFifteen = new Date(now.getTime() + 75 * 60 * 1000);

    const appointments1h = await prisma.appointment.findMany({
      where: {
        scheduledFor: {
          gte: fortyFiveMinutes,
          lte: oneHourFifteen,
        },
        reminder1hSent: false,
        status: {
          in: ['SCHEDULED', 'CONFIRMED'],
        },
      },
      include: {
        preparer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: {
              select: { email: true },
            },
          },
        },
      },
    });

    logger.info(`Found ${appointments1h.length} appointments for 1h reminder`);

    for (const appointment of appointments1h) {
      try {
        // Send reminder to client
        await EmailService.sendAppointmentReminderEmail(
          appointment.clientEmail,
          {
            clientName: appointment.clientName,
            preparerName: `${appointment.preparer?.firstName || ''} ${appointment.preparer?.lastName || ''}`.trim() || 'Your Tax Preparer',
            appointmentType: formatAppointmentType(appointment.type),
            scheduledFor: appointment.scheduledFor!,
            duration: appointment.duration || 30,
            reminderType: '1h',
            meetingLink: appointment.meetingLink || undefined,
            location: appointment.location || undefined,
          }
        );

        // Update flag to prevent duplicate emails
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            reminder1hSent: true,
            reminderSentAt: new Date(),
          },
        });

        results.sent1h++;
        logger.info('1h reminder sent', {
          appointmentId: appointment.id,
          clientEmail: appointment.clientEmail,
        });
      } catch (error) {
        results.errors++;
        logger.error('Failed to send 1h reminder', {
          appointmentId: appointment.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Summary log
    logger.info('Appointment reminders cron completed', results);

    return NextResponse.json({
      success: true,
      message: `Sent ${results.sent24h} 24h reminders, ${results.sent1h} 1h reminders`,
      ...results,
    });
  } catch (error) {
    logger.error('Error in appointment-reminders cron job', { error });
    return NextResponse.json(
      { error: 'Failed to process appointment reminders' },
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
