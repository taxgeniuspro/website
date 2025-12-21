/**
 * Google Calendar Company Service - Master Calendar View
 *
 * Manages company-level calendar for viewing all preparer appointments.
 * Events are synced to the taxgenius.tax@gmail.com calendar.
 *
 * Features:
 * - Master view of ALL preparer appointments
 * - Company events (tax deadlines, training, holidays)
 * - Color-coded by preparer
 */

import { calendar_v3 } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { googleAuthService } from './google-auth.service';
import { logger } from '@/lib/logger';

// Calendar ID for the company calendar (primary = default calendar)
const COMPANY_CALENDAR_ID = 'primary';

// Color palette for preparers (Google Calendar color IDs)
// https://developers.google.com/calendar/api/v3/reference/colors/get
const PREPARER_COLORS = [
  '1', // Lavender
  '2', // Sage
  '3', // Grape
  '4', // Flamingo
  '5', // Banana
  '6', // Tangerine
  '7', // Peacock
  '8', // Graphite
  '9', // Blueberry
  '10', // Basil
  '11', // Tomato
];

class GoogleCalendarCompanyService {
  private calendar: calendar_v3.Calendar | null = null;
  private preparerColorMap: Map<string, string> = new Map();

  /**
   * Get authenticated Calendar client
   */
  private async getClient(): Promise<calendar_v3.Calendar> {
    if (!this.calendar) {
      this.calendar = await googleAuthService.getCalendarClient();
    }
    return this.calendar;
  }

  /**
   * Get a consistent color for a preparer
   */
  private getPreparerColor(preparerId: string): string {
    if (!this.preparerColorMap.has(preparerId)) {
      const colorIndex = this.preparerColorMap.size % PREPARER_COLORS.length;
      this.preparerColorMap.set(preparerId, PREPARER_COLORS[colorIndex]);
    }
    return this.preparerColorMap.get(preparerId)!;
  }

  /**
   * Create a calendar event
   */
  async createEvent(params: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    preparerId?: string;
    appointmentId?: string;
    attendees?: string[];
    location?: string;
  }): Promise<{ eventId: string; eventUrl: string; meetLink?: string }> {
    const calendar = await this.getClient();

    try {
      const event: calendar_v3.Schema$Event = {
        summary: params.title,
        description: params.description || '',
        start: {
          dateTime: params.startTime.toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: params.endTime.toISOString(),
          timeZone: 'America/New_York',
        },
        location: params.location,
      };

      // Add color for preparer
      if (params.preparerId) {
        event.colorId = this.getPreparerColor(params.preparerId);
      }

      // Add attendees if provided
      if (params.attendees && params.attendees.length > 0) {
        event.attendees = params.attendees.map((email) => ({ email }));
      }

      const response = await calendar.events.insert({
        calendarId: COMPANY_CALENDAR_ID,
        requestBody: event,
        conferenceDataVersion: 0, // Don't auto-create Meet link for company calendar
      });

      const eventId = response.data.id!;
      const eventUrl = response.data.htmlLink || '';

      // Save to database
      await prisma.googleCalendarEvent.create({
        data: {
          googleEventId: eventId,
          calendarId: COMPANY_CALENDAR_ID,
          appointmentId: params.appointmentId,
          preparerId: params.preparerId,
          title: params.title,
          description: params.description,
          startTime: params.startTime,
          endTime: params.endTime,
          syncStatus: 'SYNCED',
        },
      });

      logger.info(`Created calendar event: ${params.title}`, { eventId });
      return { eventId, eventUrl };
    } catch (error) {
      logger.error('Failed to create calendar event', { params, error });
      throw error;
    }
  }

  /**
   * Update a calendar event
   */
  async updateEvent(
    eventId: string,
    updates: {
      title?: string;
      description?: string;
      startTime?: Date;
      endTime?: Date;
      location?: string;
    }
  ): Promise<void> {
    const calendar = await this.getClient();

    try {
      const event: calendar_v3.Schema$Event = {};

      if (updates.title) event.summary = updates.title;
      if (updates.description) event.description = updates.description;
      if (updates.location) event.location = updates.location;
      if (updates.startTime) {
        event.start = {
          dateTime: updates.startTime.toISOString(),
          timeZone: 'America/New_York',
        };
      }
      if (updates.endTime) {
        event.end = {
          dateTime: updates.endTime.toISOString(),
          timeZone: 'America/New_York',
        };
      }

      await calendar.events.patch({
        calendarId: COMPANY_CALENDAR_ID,
        eventId,
        requestBody: event,
      });

      // Update database
      await prisma.googleCalendarEvent.update({
        where: { googleEventId: eventId },
        data: {
          title: updates.title,
          description: updates.description,
          startTime: updates.startTime,
          endTime: updates.endTime,
          lastSyncAt: new Date(),
        },
      });

      logger.info(`Updated calendar event: ${eventId}`);
    } catch (error) {
      logger.error('Failed to update calendar event', { eventId, updates, error });
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<void> {
    const calendar = await this.getClient();

    try {
      await calendar.events.delete({
        calendarId: COMPANY_CALENDAR_ID,
        eventId,
      });

      // Remove from database
      await prisma.googleCalendarEvent.deleteMany({
        where: { googleEventId: eventId },
      });

      logger.info(`Deleted calendar event: ${eventId}`);
    } catch (error) {
      logger.error('Failed to delete calendar event', { eventId, error });
      throw error;
    }
  }

  /**
   * Sync an appointment to Google Calendar
   */
  async syncAppointment(appointmentId: string): Promise<{
    eventId: string;
    eventUrl: string;
  }> {
    // Get appointment details
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        preparer: {
          include: { user: true },
        },
      },
    });

    if (!appointment) {
      throw new Error(`Appointment not found: ${appointmentId}`);
    }

    // Check if already synced
    const existing = await prisma.googleCalendarEvent.findUnique({
      where: { appointmentId },
    });

    if (existing) {
      // Update existing event
      await this.updateEvent(existing.googleEventId, {
        title: `${appointment.clientName} - ${appointment.type}`,
        description: appointment.notes || '',
        startTime: appointment.scheduledFor!,
        endTime: appointment.scheduledEnd!,
      });
      return {
        eventId: existing.googleEventId,
        eventUrl: '',
      };
    }

    // Create new event
    const preparerName = appointment.preparer
      ? `${appointment.preparer.firstName} ${appointment.preparer.lastName}`.trim()
      : 'Unknown';

    return this.createEvent({
      title: `[${preparerName}] ${appointment.clientName} - ${appointment.type}`,
      description: `
Client: ${appointment.clientName}
Email: ${appointment.clientEmail || 'N/A'}
Phone: ${appointment.clientPhone || 'N/A'}
Type: ${appointment.type}
Notes: ${appointment.notes || 'None'}
      `.trim(),
      startTime: appointment.scheduledFor!,
      endTime: appointment.scheduledEnd!,
      preparerId: appointment.preparerId || undefined,
      appointmentId,
      attendees: appointment.clientEmail ? [appointment.clientEmail] : [],
    });
  }

  /**
   * Sync all appointments from a date range
   */
  async syncAppointmentsInRange(
    startDate: Date,
    endDate: Date
  ): Promise<{ synced: number; failed: number }> {
    const appointments = await prisma.appointment.findMany({
      where: {
        scheduledFor: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['CONFIRMED', 'PENDING_APPROVAL'],
        },
      },
    });

    let synced = 0;
    let failed = 0;

    for (const appointment of appointments) {
      try {
        await this.syncAppointment(appointment.id);
        synced++;
      } catch (error) {
        logger.error(`Failed to sync appointment ${appointment.id}`, { error });
        failed++;
      }
    }

    logger.info(`Synced ${synced} appointments, ${failed} failed`);
    return { synced, failed };
  }

  /**
   * Add a company-wide event (holiday, deadline, etc.)
   */
  async addCompanyEvent(params: {
    title: string;
    description?: string;
    date: Date;
    isAllDay?: boolean;
    durationHours?: number;
  }): Promise<{ eventId: string; eventUrl: string }> {
    const calendar = await this.getClient();

    try {
      const event: calendar_v3.Schema$Event = {
        summary: `[Company] ${params.title}`,
        description: params.description || '',
        colorId: '11', // Tomato red for company events
      };

      if (params.isAllDay) {
        // All-day event
        event.start = {
          date: params.date.toISOString().split('T')[0],
        };
        event.end = {
          date: params.date.toISOString().split('T')[0],
        };
      } else {
        // Timed event
        const endTime = new Date(params.date);
        endTime.setHours(endTime.getHours() + (params.durationHours || 1));

        event.start = {
          dateTime: params.date.toISOString(),
          timeZone: 'America/New_York',
        };
        event.end = {
          dateTime: endTime.toISOString(),
          timeZone: 'America/New_York',
        };
      }

      const response = await calendar.events.insert({
        calendarId: COMPANY_CALENDAR_ID,
        requestBody: event,
      });

      const eventId = response.data.id!;
      const eventUrl = response.data.htmlLink || '';

      // Save to database
      await prisma.googleCalendarEvent.create({
        data: {
          googleEventId: eventId,
          calendarId: COMPANY_CALENDAR_ID,
          title: `[Company] ${params.title}`,
          description: params.description,
          startTime: params.date,
          endTime: params.isAllDay
            ? params.date
            : new Date(
                params.date.getTime() + (params.durationHours || 1) * 3600000
              ),
          syncStatus: 'SYNCED',
        },
      });

      logger.info(`Created company event: ${params.title}`, { eventId });
      return { eventId, eventUrl };
    } catch (error) {
      logger.error('Failed to create company event', { params, error });
      throw error;
    }
  }

  /**
   * Block a holiday for all preparers
   */
  async blockHoliday(
    date: Date,
    name: string
  ): Promise<{ eventId: string; eventUrl: string }> {
    return this.addCompanyEvent({
      title: `HOLIDAY: ${name}`,
      description: 'Office closed - No appointments available',
      date,
      isAllDay: true,
    });
  }

  /**
   * Get today's appointments across all preparers
   */
  async getTodaysAppointments(): Promise<
    {
      eventId: string;
      title: string;
      startTime: Date;
      endTime: Date;
      preparerName: string;
    }[]
  > {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const events = await prisma.googleCalendarEvent.findMany({
      where: {
        startTime: {
          gte: today,
          lt: tomorrow,
        },
        appointmentId: { not: null },
      },
      include: {
        preparer: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return events.map((e) => ({
      eventId: e.googleEventId,
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
      preparerName: e.preparer
        ? `${e.preparer.firstName} ${e.preparer.lastName}`.trim()
        : 'Unknown',
    }));
  }

  /**
   * Get upcoming events for the week
   */
  async getWeekEvents(): Promise<
    {
      date: string;
      events: {
        eventId: string;
        title: string;
        startTime: string;
        endTime: string;
        isCompanyEvent: boolean;
      }[];
    }[]
  > {
    const calendar = await this.getClient();
    const now = new Date();
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);

    try {
      const response = await calendar.events.list({
        calendarId: COMPANY_CALENDAR_ID,
        timeMin: now.toISOString(),
        timeMax: weekLater.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];

      // Group by date
      const byDate = new Map<
        string,
        {
          eventId: string;
          title: string;
          startTime: string;
          endTime: string;
          isCompanyEvent: boolean;
        }[]
      >();

      for (const event of events) {
        const startDate =
          event.start?.dateTime?.split('T')[0] || event.start?.date || '';
        if (!byDate.has(startDate)) {
          byDate.set(startDate, []);
        }
        byDate.get(startDate)!.push({
          eventId: event.id!,
          title: event.summary || '',
          startTime: event.start?.dateTime || event.start?.date || '',
          endTime: event.end?.dateTime || event.end?.date || '',
          isCompanyEvent: event.summary?.startsWith('[Company]') || false,
        });
      }

      return Array.from(byDate.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, events]) => ({ date, events }));
    } catch (error) {
      logger.error('Failed to get week events', { error });
      throw error;
    }
  }

  /**
   * Get calendar sync stats
   */
  async getSyncStats(): Promise<{
    totalEvents: number;
    appointmentEvents: number;
    companyEvents: number;
    lastSyncAt: Date | null;
  }> {
    const [total, appointments, lastSync] = await Promise.all([
      prisma.googleCalendarEvent.count(),
      prisma.googleCalendarEvent.count({
        where: { appointmentId: { not: null } },
      }),
      prisma.googleCalendarEvent.findFirst({
        orderBy: { lastSyncAt: 'desc' },
        select: { lastSyncAt: true },
      }),
    ]);

    return {
      totalEvents: total,
      appointmentEvents: appointments,
      companyEvents: total - appointments,
      lastSyncAt: lastSync?.lastSyncAt || null,
    };
  }
}

// Export singleton instance
export const googleCalendarCompanyService = new GoogleCalendarCompanyService();
