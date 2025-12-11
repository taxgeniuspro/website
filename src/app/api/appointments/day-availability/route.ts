import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AvailabilityService } from '@/lib/services/availability.service';
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';

/**
 * GET /api/appointments/day-availability
 *
 * Returns availability information for each day in a month
 * Used by calendar to show capacity indicators
 *
 * Query params:
 * - preparerId: Required - The tax preparer's profile ID
 * - month: Required - Month in YYYY-MM format
 * - duration: Optional - Appointment duration in minutes (default 30)
 */
export async function GET(req: NextRequest) {
  try {
    const preparerId = req.nextUrl.searchParams.get('preparerId');
    const month = req.nextUrl.searchParams.get('month');
    const duration = parseInt(req.nextUrl.searchParams.get('duration') || '30');

    if (!preparerId) {
      return NextResponse.json({ error: 'preparerId is required' }, { status: 400 });
    }

    if (!month) {
      return NextResponse.json({ error: 'month is required (YYYY-MM format)' }, { status: 400 });
    }

    // Parse month
    const [year, monthNum] = month.split('-').map(Number);
    if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM' }, { status: 400 });
    }

    const monthDate = new Date(year, monthNum - 1, 1);
    const startDate = startOfMonth(monthDate);
    const endDate = endOfMonth(monthDate);

    // Get all days in the month
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Get preparer's availability settings
    const profile = await prisma.profile.findUnique({
      where: { id: preparerId },
      select: {
        bookingEnabled: true,
        availability: {
          where: { isActive: true },
          select: {
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            isOverride: true,
            overrideFrom: true,
            overrideUntil: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Preparer not found' }, { status: 404 });
    }

    if (!profile.bookingEnabled) {
      // Return all days as unavailable
      const availability: Record<string, { available: number; total: number; status: string }> = {};
      for (const day of days) {
        availability[format(day, 'yyyy-MM-dd')] = {
          available: 0,
          total: 0,
          status: 'disabled',
        };
      }
      return NextResponse.json({ availability });
    }

    // Get all appointments for the month
    const appointments = await prisma.appointment.findMany({
      where: {
        preparerId,
        scheduledFor: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'PENDING_APPROVAL', 'REQUESTED'],
        },
      },
      select: {
        scheduledFor: true,
        duration: true,
      },
    });

    // Calculate availability for each day
    const availability: Record<string, { available: number; total: number; status: string }> = {};

    for (const day of days) {
      const dayOfWeek = day.getDay();
      const dateStr = format(day, 'yyyy-MM-dd');

      // Find availability rules for this day
      const dayRules = profile.availability.filter((rule) => {
        if (rule.isOverride) {
          // Check if override applies to this date
          if (rule.overrideFrom && rule.overrideUntil) {
            return day >= rule.overrideFrom && day <= rule.overrideUntil;
          }
          return false;
        }
        return rule.dayOfWeek === dayOfWeek;
      });

      // Check for blocking override
      const hasBlockingOverride = profile.availability.some(
        (rule) =>
          rule.isOverride &&
          rule.overrideFrom &&
          rule.overrideUntil &&
          day >= rule.overrideFrom &&
          day <= rule.overrideUntil &&
          !rule.startTime // No start time = vacation/blocked
      );

      if (hasBlockingOverride || dayRules.length === 0) {
        availability[dateStr] = {
          available: 0,
          total: 0,
          status: 'unavailable',
        };
        continue;
      }

      // Calculate total slots for the day
      let totalSlots = 0;
      for (const rule of dayRules) {
        if (rule.startTime && rule.endTime) {
          const [startHour, startMin] = rule.startTime.split(':').map(Number);
          const [endHour, endMin] = rule.endTime.split(':').map(Number);
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          // Each slot is 30 minutes (or the specified duration)
          totalSlots += Math.floor((endMinutes - startMinutes) / duration);
        }
      }

      // Count booked appointments for this day
      const dayAppointments = appointments.filter((appt) => {
        const apptDate = new Date(appt.scheduledFor);
        return (
          apptDate.getDate() === day.getDate() &&
          apptDate.getMonth() === day.getMonth() &&
          apptDate.getFullYear() === day.getFullYear()
        );
      });

      const bookedSlots = dayAppointments.length;
      const availableSlots = Math.max(0, totalSlots - bookedSlots);

      // Determine status
      let status = 'available';
      if (availableSlots === 0 && totalSlots > 0) {
        status = 'full';
      } else if (availableSlots <= totalSlots * 0.25) {
        status = 'limited';
      } else if (day < new Date()) {
        status = 'past';
      }

      availability[dateStr] = {
        available: availableSlots,
        total: totalSlots,
        status,
      };
    }

    return NextResponse.json({ availability });
  } catch (error) {
    logger.error('Error fetching day availability:', error);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}
