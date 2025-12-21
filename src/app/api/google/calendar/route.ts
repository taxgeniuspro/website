/**
 * Google Calendar Company API
 *
 * GET /api/google/calendar
 * Returns today's appointments and sync stats
 *
 * GET /api/google/calendar?view=week
 * Returns upcoming week's events
 *
 * POST /api/google/calendar
 * Syncs appointments or adds company events
 *
 * Query params for POST:
 * - action: 'sync' | 'add-event' | 'block-holiday' | 'sync-range'
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { googleCalendarCompanyService } from '@/lib/services/google';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userRole = user.role as string;
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can view company calendar' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'today';

    if (view === 'week') {
      const weekEvents = await googleCalendarCompanyService.getWeekEvents();
      return NextResponse.json({
        success: true,
        view: 'week',
        events: weekEvents,
      });
    }

    // Default: today's view
    const [todayAppointments, stats] = await Promise.all([
      googleCalendarCompanyService.getTodaysAppointments(),
      googleCalendarCompanyService.getSyncStats(),
    ]);

    return NextResponse.json({
      success: true,
      view: 'today',
      appointments: todayAppointments,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching calendar data:', error);
    return NextResponse.json(
      { error: 'Failed to get calendar data', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userRole = user.role as string;
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can manage company calendar' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'sync';
    const body = await req.json().catch(() => ({}));

    switch (action) {
      case 'sync': {
        const { appointmentId } = body;
        if (!appointmentId) {
          return NextResponse.json(
            { error: 'appointmentId is required for sync' },
            { status: 400 }
          );
        }

        const result = await googleCalendarCompanyService.syncAppointment(appointmentId);
        logger.info(`Appointment synced to calendar: ${appointmentId}`, { result });
        return NextResponse.json({
          success: true,
          ...result,
        });
      }

      case 'sync-range': {
        const { startDate, endDate } = body;
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'startDate and endDate are required for sync-range' },
            { status: 400 }
          );
        }

        const result = await googleCalendarCompanyService.syncAppointmentsInRange(
          new Date(startDate),
          new Date(endDate)
        );
        logger.info('Appointments synced in range', { startDate, endDate, result });
        return NextResponse.json({
          success: true,
          ...result,
        });
      }

      case 'add-event': {
        const { title, description, date, isAllDay, durationHours } = body;
        if (!title || !date) {
          return NextResponse.json(
            { error: 'title and date are required for add-event' },
            { status: 400 }
          );
        }

        const result = await googleCalendarCompanyService.addCompanyEvent({
          title,
          description,
          date: new Date(date),
          isAllDay,
          durationHours,
        });
        logger.info(`Company event added: ${title}`, { result });
        return NextResponse.json({
          success: true,
          ...result,
        });
      }

      case 'block-holiday': {
        const { date, name } = body;
        if (!date || !name) {
          return NextResponse.json(
            { error: 'date and name are required for block-holiday' },
            { status: 400 }
          );
        }

        const result = await googleCalendarCompanyService.blockHoliday(
          new Date(date),
          name
        );
        logger.info(`Holiday blocked: ${name}`, { date, result });
        return NextResponse.json({
          success: true,
          ...result,
        });
      }

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Use 'sync', 'sync-range', 'add-event', or 'block-holiday'` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Calendar action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform calendar action', details: (error as Error).message },
      { status: 500 }
    );
  }
}
