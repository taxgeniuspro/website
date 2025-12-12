/**
 * Fluid Booking - Availability Calculation Service
 * Calculates available time slots for tax preparers based on their schedule,
 * existing appointments, and booking preferences.
 */

import { prisma } from '@/lib/prisma';
import {
  startOfDay,
  endOfDay,
  addMinutes,
  format,
  parse,
  isWithinInterval,
  isBefore,
  isAfter,
  addDays,
  getDay,
  parseISO,
  formatISO,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export interface TimeSlot {
  start: Date;
  end: Date;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  available: boolean;
  preparerId: string;
  serviceId?: string;
}

export interface AvailabilityParams {
  preparerId: string;
  date: Date;
  duration: number; // minutes
  serviceId?: string;
  timezone?: string; // Client timezone (defaults to preparer's)
  includeUnavailable?: boolean; // Return all slots including unavailable ones
}

export interface PreparerSchedule {
  preparerId: string;
  preparerName: string;
  appointments: Array<{
    id: string;
    clientName: string;
    scheduledFor: Date;
    scheduledEnd: Date;
    status: string;
    subject?: string;
    type: string;
  }>;
}

/**
 * Calculate available time slots for a preparer on a specific date
 */
export async function calculateAvailableSlots(
  params: AvailabilityParams
): Promise<TimeSlot[]> {
  const { preparerId, date, duration, serviceId, timezone = 'America/New_York', includeUnavailable = false } = params;

  // 1. Get preparer profile and check if booking is enabled
  const preparer = await prisma.profile.findUnique({
    where: { id: preparerId },
    select: {
      bookingEnabled: true,
      allowPhoneBookings: true,
      allowVideoBookings: true,
      allowInPersonBookings: true,
      requireApprovalForBookings: true,
      firstName: true,
      lastName: true,
      timezone: true, // Get preparer's timezone
    },
  });

  if (!preparer || !preparer.bookingEnabled) {
    return [];
  }

  // Use preparer's timezone for availability calculation
  const preparerTimezone = preparer.timezone || 'America/New_York';
  const clientTimezone = timezone;

  // Convert the date to preparer's timezone for availability lookup
  const dateInPreparerTz = toZonedTime(date, preparerTimezone);

  // 2. Get the day of week (0 = Sunday) in preparer's timezone
  const dayOfWeek = getDay(dateInPreparerTz);

  // 3. Get preparer's availability for this day
  const availability = await prisma.preparerAvailability.findMany({
    where: {
      preparerId,
      isActive: true,
      OR: [
        // Regular weekly schedule for this day
        {
          dayOfWeek,
          isOverride: false,
        },
        // Override periods that include this date
        {
          isOverride: true,
          overrideFrom: { lte: date },
          overrideUntil: { gte: date },
        },
      ],
    },
  });

  if (availability.length === 0) {
    return []; // No availability configured
  }

  // 4. Check for override periods (vacations block all availability)
  const blockingOverrides = availability.filter(
    (avail) =>
      avail.isOverride &&
      avail.overrideFrom &&
      avail.overrideUntil &&
      isWithinInterval(date, { start: avail.overrideFrom, end: avail.overrideUntil }) &&
      avail.startTime === '00:00' &&
      avail.endTime === '00:00'
  );

  if (blockingOverrides.length > 0) {
    return []; // Preparer is unavailable (vacation/blocked)
  }

  // 5. Get applicable availability rules (prefer overrides)
  const overrideRules = availability.filter((a) => a.isOverride);
  const regularRules = availability.filter((a) => !a.isOverride && a.dayOfWeek === dayOfWeek);
  const applicableRules = overrideRules.length > 0 ? overrideRules : regularRules;

  // 6. Filter by service if specified
  const serviceFilteredRules = applicableRules.filter(
    (rule) => rule.serviceIds.length === 0 || (serviceId && rule.serviceIds.includes(serviceId))
  );

  if (serviceFilteredRules.length === 0) {
    return []; // No availability for this service
  }

  // 7. Get booking service details (for buffer time)
  let bufferAfter = 15; // Default 15 minutes
  if (serviceId) {
    const service = await prisma.bookingService.findUnique({
      where: { id: serviceId },
      select: { bufferAfter: true },
    });
    if (service) {
      bufferAfter = service.bufferAfter;
    }
  }

  // 8. Get existing appointments for this day
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      preparerId,
      scheduledFor: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: {
        in: ['SCHEDULED', 'CONFIRMED', 'PENDING_APPROVAL'],
      },
    },
    select: {
      scheduledFor: true,
      scheduledEnd: true,
      duration: true,
    },
  });

  // 9. Generate time slots
  const slots: TimeSlot[] = [];
  const slotInterval = 30; // 30-minute slot intervals

  for (const rule of serviceFilteredRules) {
    // Parse availability times in preparer's timezone
    // Create date in preparer's timezone
    const dateStr = format(dateInPreparerTz, 'yyyy-MM-dd');

    // Parse the start and end times in the context of the preparer's timezone
    const startTimeStr = `${dateStr}T${rule.startTime}:00`;
    const endTimeStr = `${dateStr}T${rule.endTime}:00`;

    // Convert from preparer timezone to UTC for comparison
    const startTime = fromZonedTime(new Date(startTimeStr), preparerTimezone);
    const endTime = fromZonedTime(new Date(endTimeStr), preparerTimezone);

    let currentSlot = startTime;

    while (isBefore(addMinutes(currentSlot, duration), endTime) ||
           currentSlot.getTime() === endTime.getTime() - duration * 60000) {
      const slotEnd = addMinutes(currentSlot, duration);

      // Check if this slot conflicts with existing appointments (including buffer)
      const hasConflict = existingAppointments.some((appt) => {
        if (!appt.scheduledFor || !appt.scheduledEnd) return false;

        const apptEnd = addMinutes(appt.scheduledEnd, bufferAfter);

        // Check for overlap
        return (
          (currentSlot >= appt.scheduledFor && currentSlot < apptEnd) ||
          (slotEnd > appt.scheduledFor && slotEnd <= apptEnd) ||
          (currentSlot <= appt.scheduledFor && slotEnd >= apptEnd)
        );
      });

      // Only add future slots (can't book in the past)
      const isPast = isBefore(slotEnd, new Date());

      if (!isPast) {
        // Convert slot times to client timezone for display
        const slotInClientTz = toZonedTime(currentSlot, clientTimezone);
        const slotEndInClientTz = toZonedTime(slotEnd, clientTimezone);

        slots.push({
          start: currentSlot, // UTC time for booking
          end: slotEnd, // UTC time for booking
          startTime: format(slotInClientTz, 'HH:mm'), // Display time in client timezone
          endTime: format(slotEndInClientTz, 'HH:mm'), // Display time in client timezone
          available: !hasConflict,
          preparerId,
          serviceId,
        });
      }

      currentSlot = addMinutes(currentSlot, slotInterval);
    }
  }

  // Return all slots or only available based on parameter
  return includeUnavailable ? slots : slots.filter((slot) => slot.available);
}

/**
 * Check if a specific time slot has conflicts
 */
export async function checkConflicts(
  preparerId: string,
  startTime: Date,
  endTime: Date,
  excludeAppointmentId?: string
): Promise<boolean> {
  const conflicts = await prisma.appointment.findMany({
    where: {
      preparerId,
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      scheduledFor: {
        gte: startOfDay(startTime),
        lte: endOfDay(startTime),
      },
      status: {
        in: ['SCHEDULED', 'CONFIRMED', 'PENDING_APPROVAL'],
      },
    },
    select: {
      scheduledFor: true,
      scheduledEnd: true,
    },
  });

  return conflicts.some((appt) => {
    if (!appt.scheduledFor || !appt.scheduledEnd) return false;

    // Check for overlap
    return (
      (startTime >= appt.scheduledFor && startTime < appt.scheduledEnd) ||
      (endTime > appt.scheduledFor && endTime <= appt.scheduledEnd) ||
      (startTime <= appt.scheduledFor && endTime >= appt.scheduledEnd)
    );
  });
}

/**
 * Get a preparer's schedule for a date range
 */
export async function getPreparerSchedule(
  preparerId: string,
  startDate: Date,
  endDate: Date
): Promise<PreparerSchedule> {
  const preparer = await prisma.profile.findUnique({
    where: { id: preparerId },
    select: {
      firstName: true,
      lastName: true,
    },
  });

  if (!preparer) {
    throw new Error('Preparer not found');
  }

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
      id: true,
      clientName: true,
      scheduledFor: true,
      scheduledEnd: true,
      status: true,
      subject: true,
      type: true,
    },
    orderBy: {
      scheduledFor: 'asc',
    },
  });

  return {
    preparerId,
    preparerName: `${preparer.firstName} ${preparer.lastName}`,
    appointments: appointments.map((appt) => ({
      id: appt.id,
      clientName: appt.clientName,
      scheduledFor: appt.scheduledFor!,
      scheduledEnd: appt.scheduledEnd!,
      status: appt.status,
      subject: appt.subject || undefined,
      type: appt.type,
    })),
  };
}

/**
 * Validate a booking request before creating appointment
 */
export async function validateBookingSlot(
  preparerId: string,
  scheduledFor: Date,
  duration: number,
  serviceId?: string
): Promise<{ valid: boolean; error?: string }> {
  // 1. Check if preparer has booking enabled
  const preparer = await prisma.profile.findUnique({
    where: { id: preparerId },
    select: {
      bookingEnabled: true,
      requireApprovalForBookings: true,
    },
  });

  if (!preparer) {
    return { valid: false, error: 'Preparer not found' };
  }

  if (!preparer.bookingEnabled) {
    return { valid: false, error: 'This preparer is not accepting bookings' };
  }

  // 2. Check if slot is in the past
  if (isBefore(scheduledFor, new Date())) {
    return { valid: false, error: 'Cannot book appointments in the past' };
  }

  // 3. Check for conflicts
  const scheduledEnd = addMinutes(scheduledFor, duration);
  const hasConflict = await checkConflicts(preparerId, scheduledFor, scheduledEnd);

  if (hasConflict) {
    return { valid: false, error: 'This time slot is no longer available' };
  }

  // 4. Check if time falls within preparer's availability
  const dayOfWeek = getDay(scheduledFor);
  const timeStr = format(scheduledFor, 'HH:mm');

  const availability = await prisma.preparerAvailability.findFirst({
    where: {
      preparerId,
      isActive: true,
      OR: [
        {
          dayOfWeek,
          isOverride: false,
          startTime: { lte: timeStr },
          endTime: { gte: format(scheduledEnd, 'HH:mm') },
        },
        {
          isOverride: true,
          overrideFrom: { lte: scheduledFor },
          overrideUntil: { gte: scheduledFor },
        },
      ],
    },
  });

  if (!availability) {
    return { valid: false, error: 'Preparer is not available at this time' };
  }

  // 5. Check service restrictions
  if (serviceId && availability.serviceIds.length > 0) {
    if (!availability.serviceIds.includes(serviceId)) {
      return { valid: false, error: 'This service is not available at this time' };
    }
  }

  return { valid: true };
}

/**
 * Get next available slot for a preparer
 */
export async function getNextAvailableSlot(
  preparerId: string,
  duration: number,
  serviceId?: string,
  startFromDate: Date = new Date()
): Promise<TimeSlot | null> {
  // Check next 30 days
  for (let i = 0; i < 30; i++) {
    const checkDate = addDays(startFromDate, i);
    const slots = await calculateAvailableSlots({
      preparerId,
      date: checkDate,
      duration,
      serviceId,
    });

    if (slots.length > 0) {
      return slots[0]; // Return first available slot
    }
  }

  return null; // No availability in next 30 days
}

export const AvailabilityService = {
  calculateAvailableSlots,
  checkConflicts,
  getPreparerSchedule,
  validateBookingSlot,
  getNextAvailableSlot,
};
