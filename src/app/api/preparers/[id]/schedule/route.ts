/**
 * Fluid Booking API - Get Preparer Schedule
 * Returns a preparer's schedule (appointments) for a date range
 */

import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/services/availability.service';
import { parseISO, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces for Supabase responses
interface PreparerAvailability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isOverride: boolean;
  overrideFrom: string | null;
  overrideUntil: string | null;
  overrideLabel: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: preparerId } = await params;
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    // Check permissions: only the preparer, admin, or super_admin can view schedule
    const { data: userProfileData } = await db
      .from('profiles')
      .select('id, role')
      .eq('userId', session.user.id)
      .limit(1);

    const userProfile = firstOrNull(userProfileData);

    const isAuthorized =
      userProfile?.id === preparerId ||
      userProfile?.role === 'admin' ||
      userProfile?.role === 'admin';

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'You do not have permission to view this schedule' },
        { status: 403 }
      );
    }

    // Default to current month if no dates provided
    let startDate: Date;
    let endDate: Date;

    if (startDateStr && endDateStr) {
      try {
        startDate = parseISO(startDateStr);
        endDate = parseISO(endDateStr);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }
    } else {
      // Default to current month
      const now = new Date();
      startDate = startOfMonth(now);
      endDate = endOfMonth(addMonths(now, 1)); // Include next month
    }

    // Get preparer's schedule (appointments)
    const schedule = await AvailabilityService.getPreparerSchedule(
      preparerId,
      startDate,
      endDate
    );

    // Get preparer's availability rules
    const { data: availability } = await db
      .from('preparer_availability')
      .select('id, dayOfWeek, startTime, endTime, isOverride, overrideFrom, overrideUntil, overrideLabel')
      .eq('preparerId', preparerId)
      .eq('isActive', true)
      .order('isOverride', { ascending: true })
      .order('dayOfWeek', { ascending: true })
      .order('startTime', { ascending: true });

    // Get preparer's timezone
    const { data: preparerProfileData } = await db
      .from('profiles')
      .select('timezone, defaultAppointmentDuration, appointmentBufferMinutes')
      .eq('id', preparerId)
      .limit(1);

    const preparerProfile = firstOrNull(preparerProfileData);

    return NextResponse.json({
      success: true,
      preparerId: schedule.preparerId,
      preparerName: schedule.preparerName,
      timezone: preparerProfile?.timezone || 'America/New_York',
      defaultDuration: preparerProfile?.defaultAppointmentDuration || 30,
      bufferMinutes: preparerProfile?.appointmentBufferMinutes || 15,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      appointmentsCount: schedule.appointments.length,
      appointments: schedule.appointments.map((appt) => ({
        id: appt.id,
        clientName: appt.clientName,
        scheduledFor: appt.scheduledFor.toISOString(),
        scheduledEnd: appt.scheduledEnd.toISOString(),
        status: appt.status,
        subject: appt.subject,
        type: appt.type,
      })),
      availability: (availability || []).map((avail: PreparerAvailability) => ({
        id: avail.id,
        dayOfWeek: avail.dayOfWeek,
        startTime: avail.startTime,
        endTime: avail.endTime,
        isOverride: avail.isOverride,
        overrideFrom: avail.overrideFrom,
        overrideUntil: avail.overrideUntil,
        overrideLabel: avail.overrideLabel,
      })),
    });
  } catch (error) {
    logger.error('Error fetching preparer schedule', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      {
        error: 'Failed to fetch schedule',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
