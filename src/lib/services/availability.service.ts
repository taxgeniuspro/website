/**
 * Fluid Booking - Availability Calculation Service
 * Calculates available time slots for tax preparers based on their schedule,
 * existing appointments, and booking preferences.
 */

import { db, firstOrNull } from '@/lib/db';

// Local type definitions (replacing @prisma/client)
interface Profile {
  id: string;
  bookingEnabled?: boolean | null;
  allowPhoneBookings?: boolean | null;
  allowVideoBookings?: boolean | null;
  allowInPersonBookings?: boolean | null;
  requireApprovalForBookings?: boolean | null;
  firstName?: string | null;
  lastName?: string | null;
  timezone?: string | null;
}

interface PreparerAvailabilityRecord {
  id: string;
  preparerId: string;
  dayOfWeek?: number | null;
  startTime: string;
  endTime: string;
  isActive: boolean;
  isOverride: boolean;
  overrideFrom?: string | null;
  overrideUntil?: string | null;
  serviceIds: string[];
}

interface AppointmentRecord {
  id: string;
  preparerId: string;
  scheduledFor?: string | null;
  scheduledEnd?: string | null;
  duration?: number | null;
  status: string;
  clientName: string;
  subject?: string | null;
  type: string;
}

interface BookingServiceRecord {
  id: string;
  bufferAfter: number;
}
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
  const { data: profiles } = await db
    .from('profiles')
    .select('id, bookingEnabled, allowPhoneBookings, allowVideoBookings, allowInPersonBookings, requireApprovalForBookings, firstName, lastName, timezone')
    .eq('id', preparerId)
    .limit(1);

  const preparer = firstOrNull(profiles) as Profile | null;

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
  // Supabase doesn't support complex OR like Prisma, so we run two queries
  const dateStr = date.toISOString();

  // Regular weekly schedule for this day
  const { data: regularAvail } = await db
    .from('preparer_availability')
    .select('*')
    .eq('preparerId', preparerId)
    .eq('isActive', true)
    .eq('dayOfWeek', dayOfWeek)
    .eq('isOverride', false);

  // Override periods that include this date
  const { data: overrideAvail } = await db
    .from('preparer_availability')
    .select('*')
    .eq('preparerId', preparerId)
    .eq('isActive', true)
    .eq('isOverride', true)
    .lte('overrideFrom', dateStr)
    .gte('overrideUntil', dateStr);

  const availability = [
    ...((regularAvail || []) as PreparerAvailabilityRecord[]),
    ...((overrideAvail || []) as PreparerAvailabilityRecord[]),
  ];

  if (availability.length === 0) {
    return []; // No availability configured
  }

  // 4. Check for override periods (vacations block all availability)
  const blockingOverrides = availability.filter(
    (avail) =>
      avail.isOverride &&
      avail.overrideFrom &&
      avail.overrideUntil &&
      isWithinInterval(date, { start: new Date(avail.overrideFrom), end: new Date(avail.overrideUntil) }) &&
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
    const { data: services } = await db
      .from('booking_services')
      .select('bufferAfter')
      .eq('id', serviceId)
      .limit(1);

    const service = firstOrNull(services) as BookingServiceRecord | null;
    if (service) {
      bufferAfter = service.bufferAfter;
    }
  }

  // 8. Get existing appointments for this day
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const { data: existingAppointmentsData } = await db
    .from('appointments')
    .select('scheduledFor, scheduledEnd, duration')
    .eq('preparerId', preparerId)
    .gte('scheduledFor', dayStart.toISOString())
    .lte('scheduledFor', dayEnd.toISOString())
    .in('status', ['SCHEDULED', 'CONFIRMED', 'PENDING_APPROVAL']);

  const existingAppointments = (existingAppointmentsData || []).map((appt: { scheduledFor?: string; scheduledEnd?: string; duration?: number }) => ({
    scheduledFor: appt.scheduledFor ? new Date(appt.scheduledFor) : null,
    scheduledEnd: appt.scheduledEnd ? new Date(appt.scheduledEnd) : null,
    duration: appt.duration,
  }));

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
  let query = db
    .from('appointments')
    .select('id, scheduledFor, scheduledEnd')
    .eq('preparerId', preparerId)
    .gte('scheduledFor', startOfDay(startTime).toISOString())
    .lte('scheduledFor', endOfDay(startTime).toISOString())
    .in('status', ['SCHEDULED', 'CONFIRMED', 'PENDING_APPROVAL']);

  if (excludeAppointmentId) {
    query = query.neq('id', excludeAppointmentId);
  }

  const { data: conflictsData } = await query;

  const conflicts = (conflictsData || []).map((appt: { scheduledFor?: string; scheduledEnd?: string }) => ({
    scheduledFor: appt.scheduledFor ? new Date(appt.scheduledFor) : null,
    scheduledEnd: appt.scheduledEnd ? new Date(appt.scheduledEnd) : null,
  }));

  return conflicts.some((appt: { scheduledFor: Date | null; scheduledEnd: Date | null }) => {
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
  const { data: profiles } = await db
    .from('profiles')
    .select('firstName, lastName')
    .eq('id', preparerId)
    .limit(1);

  const preparer = firstOrNull(profiles) as Profile | null;

  if (!preparer) {
    throw new Error('Preparer not found');
  }

  const { data: appointmentsData } = await db
    .from('appointments')
    .select('id, clientName, scheduledFor, scheduledEnd, status, subject, type')
    .eq('preparerId', preparerId)
    .gte('scheduledFor', startDate.toISOString())
    .lte('scheduledFor', endDate.toISOString())
    .in('status', ['SCHEDULED', 'CONFIRMED', 'PENDING_APPROVAL', 'REQUESTED'])
    .order('scheduledFor', { ascending: true });

  const appointments = (appointmentsData || []) as AppointmentRecord[];

  return {
    preparerId,
    preparerName: `${preparer.firstName} ${preparer.lastName}`,
    appointments: appointments.map((appt) => ({
      id: appt.id,
      clientName: appt.clientName,
      scheduledFor: appt.scheduledFor ? new Date(appt.scheduledFor) : new Date(),
      scheduledEnd: appt.scheduledEnd ? new Date(appt.scheduledEnd) : new Date(),
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
  const { data: profiles } = await db
    .from('profiles')
    .select('bookingEnabled, requireApprovalForBookings')
    .eq('id', preparerId)
    .limit(1);

  const preparer = firstOrNull(profiles) as Profile | null;

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
  const endTimeStr = format(scheduledEnd, 'HH:mm');
  const scheduledForStr = scheduledFor.toISOString();

  // Check regular availability for this day
  const { data: regularAvail } = await db
    .from('preparer_availability')
    .select('*')
    .eq('preparerId', preparerId)
    .eq('isActive', true)
    .eq('dayOfWeek', dayOfWeek)
    .eq('isOverride', false)
    .lte('startTime', timeStr)
    .gte('endTime', endTimeStr)
    .limit(1);

  // Check override availability
  const { data: overrideAvail } = await db
    .from('preparer_availability')
    .select('*')
    .eq('preparerId', preparerId)
    .eq('isActive', true)
    .eq('isOverride', true)
    .lte('overrideFrom', scheduledForStr)
    .gte('overrideUntil', scheduledForStr)
    .limit(1);

  const availability = firstOrNull(regularAvail) || firstOrNull(overrideAvail);

  if (!availability) {
    return { valid: false, error: 'Preparer is not available at this time' };
  }

  const typedAvailability = availability as PreparerAvailabilityRecord;

  // 5. Check service restrictions
  if (serviceId && typedAvailability.serviceIds && typedAvailability.serviceIds.length > 0) {
    if (!typedAvailability.serviceIds.includes(serviceId)) {
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
