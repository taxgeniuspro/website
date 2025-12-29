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
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { EmailService } from '@/lib/services/email.service';

// TypeScript interfaces
interface PreparerProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

interface AppointmentWithPreparer {
  id: string;
  clientEmail: string;
  clientName: string;
  type: string;
  scheduledFor: string;
  duration: number | null;
  meetingLink: string | null;
  location: string | null;
  preparer: PreparerProfile | null;
}

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
    const twentyThreeAndHalfHours = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
    const twentyFourAndHalfHours = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);

    const { data: appointments24hRaw, error: error24h } = await db
      .from('appointments')
      .select(`
        id,
        clientEmail,
        clientName,
        type,
        scheduledFor,
        duration,
        meetingLink,
        location,
        preparerId
      `)
      .gte('scheduledFor', twentyThreeAndHalfHours.toISOString())
      .lte('scheduledFor', twentyFourAndHalfHours.toISOString())
      .eq('reminder24hSent', false)
      .in('status', ['SCHEDULED', 'CONFIRMED']);

    if (error24h) {
      throw error24h;
    }

    // Fetch preparer details for each appointment
    const appointments24h: AppointmentWithPreparer[] = [];
    for (const appt of appointments24hRaw || []) {
      let preparer: PreparerProfile | null = null;
      if (appt.preparerId) {
        const { data: preparerData } = await db
          .from('profiles')
          .select('id, firstName, lastName')
          .eq('id', appt.preparerId)
          .single();
        preparer = preparerData as PreparerProfile | null;
      }
      appointments24h.push({
        ...appt,
        preparer,
      } as AppointmentWithPreparer);
    }

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
            scheduledFor: new Date(appointment.scheduledFor),
            duration: appointment.duration || 30,
            reminderType: '24h',
            meetingLink: appointment.meetingLink || undefined,
            location: appointment.location || undefined,
          }
        );

        // Update flag to prevent duplicate emails
        const { error: updateError } = await db
          .from('appointments')
          .update({
            reminder24hSent: true,
            reminderSentAt: new Date().toISOString(),
          })
          .eq('id', appointment.id);

        if (updateError) {
          throw updateError;
        }

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
    const fortyFiveMinutes = new Date(now.getTime() + 45 * 60 * 1000);
    const oneHourFifteen = new Date(now.getTime() + 75 * 60 * 1000);

    const { data: appointments1hRaw, error: error1h } = await db
      .from('appointments')
      .select(`
        id,
        clientEmail,
        clientName,
        type,
        scheduledFor,
        duration,
        meetingLink,
        location,
        preparerId
      `)
      .gte('scheduledFor', fortyFiveMinutes.toISOString())
      .lte('scheduledFor', oneHourFifteen.toISOString())
      .eq('reminder1hSent', false)
      .in('status', ['SCHEDULED', 'CONFIRMED']);

    if (error1h) {
      throw error1h;
    }

    // Fetch preparer details for each appointment
    const appointments1h: AppointmentWithPreparer[] = [];
    for (const appt of appointments1hRaw || []) {
      let preparer: PreparerProfile | null = null;
      if (appt.preparerId) {
        const { data: preparerData } = await db
          .from('profiles')
          .select('id, firstName, lastName')
          .eq('id', appt.preparerId)
          .single();
        preparer = preparerData as PreparerProfile | null;
      }
      appointments1h.push({
        ...appt,
        preparer,
      } as AppointmentWithPreparer);
    }

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
            scheduledFor: new Date(appointment.scheduledFor),
            duration: appointment.duration || 30,
            reminderType: '1h',
            meetingLink: appointment.meetingLink || undefined,
            location: appointment.location || undefined,
          }
        );

        // Update flag to prevent duplicate emails
        const { error: updateError } = await db
          .from('appointments')
          .update({
            reminder1hSent: true,
            reminderSentAt: new Date().toISOString(),
          })
          .eq('id', appointment.id);

        if (updateError) {
          throw updateError;
        }

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
