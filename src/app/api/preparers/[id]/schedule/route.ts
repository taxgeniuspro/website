/**
 * Fluid Booking API - Get Preparer Schedule
 * Returns a preparer's schedule (appointments) for a date range
 */

import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/services/availability.service';
import { parseISO, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: preparerId } = params;
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    // Check permissions: only the preparer, admin, or super_admin can view schedule
    const userProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    const isAuthorized =
      userProfile?.id === preparerId ||
      userProfile?.role === 'admin' ||
      userProfile?.role === 'super_admin';

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

    // Get preparer's schedule
    const schedule = await AvailabilityService.getPreparerSchedule(
      preparerId,
      startDate,
      endDate
    );

    return NextResponse.json({
      success: true,
      preparerId: schedule.preparerId,
      preparerName: schedule.preparerName,
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
    });
  } catch (error) {
    console.error('Error fetching preparer schedule:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch schedule',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
