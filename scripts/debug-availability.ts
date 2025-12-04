/**
 * Debug Availability Script
 * Tests why available slots are not showing
 */

import { PrismaClient } from '@prisma/client';
import { parseISO, getDay, format, startOfDay, endOfDay } from 'date-fns';

const prisma = new PrismaClient();

async function debugAvailability() {
  try {
    const preparerId = 'cmh9ze4aj0002jx5kkpnnu3no';
    const dateStr = '2025-01-13';
    const date = parseISO(dateStr);

    console.log('\n=== Debugging Availability ===\n');
    console.log('Date requested:', dateStr);
    console.log('Parsed date:', date);
    console.log('Current time:', new Date());
    console.log('Day of week:', getDay(date), '(0=Sunday, 1=Monday, etc.)');

    // 1. Check preparer
    const preparer = await prisma.profile.findUnique({
      where: { id: preparerId },
      select: {
        bookingEnabled: true,
        firstName: true,
        lastName: true,
        user: { select: { email: true } },
      },
    });

    console.log('\n--- Preparer Info ---');
    console.log('Name:', preparer?.firstName, preparer?.lastName);
    console.log('Email:', preparer?.user?.email);
    console.log('Booking enabled:', preparer?.bookingEnabled);

    // 2. Check availability entries
    const dayOfWeek = getDay(date);
    console.log('\n--- Availability Entries ---');

    const allAvailability = await prisma.preparerAvailability.findMany({
      where: { preparerId },
    });

    console.log(`Total entries: ${allAvailability.length}`);
    allAvailability.forEach((a, idx) => {
      console.log(`${idx + 1}. Day ${a.dayOfWeek} | ${a.startTime}-${a.endTime} | Active: ${a.isActive} | Override: ${a.isOverride}`);
    });

    const matchingAvailability = await prisma.preparerAvailability.findMany({
      where: {
        preparerId,
        isActive: true,
        OR: [
          {
            dayOfWeek,
            isOverride: false,
          },
          {
            isOverride: true,
            overrideFrom: { lte: date },
            overrideUntil: { gte: date },
          },
        ],
      },
    });

    console.log(`\nMatching entries for day ${dayOfWeek}: ${matchingAvailability.length}`);
    matchingAvailability.forEach((a) => {
      console.log(`- ${a.startTime} to ${a.endTime}`);
    });

    // 3. Check existing appointments
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
    });

    console.log('\n--- Existing Appointments ---');
    console.log(`Count: ${existingAppointments.length}`);
    existingAppointments.forEach((appt) => {
      console.log(`- ${appt.clientName} at ${appt.scheduledFor} (Status: ${appt.status})`);
    });

    console.log('\n=== End Debug ===\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAvailability();
