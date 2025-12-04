/**
 * Fluid Booking API - Manage Preparer Availability
 * Allows preparers to get and update their availability schedule
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { parseISO } from 'date-fns';

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

    // Check permissions
    const userProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    const isAuthorized =
      userProfile?.id === preparerId ||
      userProfile?.role === 'admin' ||
      userProfile?.role === 'super_admin';

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'You do not have permission to view this availability' },
        { status: 403 }
      );
    }

    // Get all availability rules
    const availability = await prisma.preparerAvailability.findMany({
      where: { preparerId },
      orderBy: [{ isOverride: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    // Get booking preferences from profile
    const profile = await prisma.profile.findUnique({
      where: { id: preparerId },
      select: {
        bookingEnabled: true,
        allowPhoneBookings: true,
        allowVideoBookings: true,
        allowInPersonBookings: true,
        requireApprovalForBookings: true,
        customBookingMessage: true,
        bookingCalendarColor: true,
      },
    });

    return NextResponse.json({
      success: true,
      preparerId,
      bookingPreferences: profile,
      availability: availability.map((avail) => ({
        id: avail.id,
        dayOfWeek: avail.dayOfWeek,
        startTime: avail.startTime,
        endTime: avail.endTime,
        serviceIds: avail.serviceIds,
        isOverride: avail.isOverride,
        overrideFrom: avail.overrideFrom?.toISOString(),
        overrideUntil: avail.overrideUntil?.toISOString(),
        overrideLabel: avail.overrideLabel,
        isActive: avail.isActive,
      })),
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch availability',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: preparerId } = params;
    const body = await request.json();
    const { weeklySchedule, overrides, bookingPreferences } = body;

    // Check permissions
    const userProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    const isAuthorized =
      userProfile?.id === preparerId ||
      userProfile?.role === 'admin' ||
      userProfile?.role === 'super_admin';

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'You do not have permission to update this availability' },
        { status: 403 }
      );
    }

    // Update booking preferences in Profile if provided
    if (bookingPreferences) {
      await prisma.profile.update({
        where: { id: preparerId },
        data: {
          bookingEnabled: bookingPreferences.bookingEnabled,
          allowPhoneBookings: bookingPreferences.allowPhoneBookings,
          allowVideoBookings: bookingPreferences.allowVideoBookings,
          allowInPersonBookings: bookingPreferences.allowInPersonBookings,
          requireApprovalForBookings: bookingPreferences.requireApprovalForBookings,
          customBookingMessage: bookingPreferences.customBookingMessage,
          bookingCalendarColor: bookingPreferences.bookingCalendarColor,
        },
      });
    }

    // Update weekly schedule if provided
    if (weeklySchedule && Array.isArray(weeklySchedule)) {
      // Delete existing regular (non-override) availability
      await prisma.preparerAvailability.deleteMany({
        where: {
          preparerId,
          isOverride: false,
        },
      });

      // Create new weekly schedule
      if (weeklySchedule.length > 0) {
        await prisma.preparerAvailability.createMany({
          data: weeklySchedule.map((schedule: any) => ({
            preparerId,
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            serviceIds: schedule.serviceIds || [],
            isOverride: false,
            isActive: true,
          })),
        });
      }
    }

    // Update overrides if provided
    if (overrides && Array.isArray(overrides)) {
      // Process each override (create, update, or delete)
      for (const override of overrides) {
        if (override.action === 'delete' && override.id) {
          await prisma.preparerAvailability.delete({
            where: { id: override.id },
          });
        } else if (override.action === 'update' && override.id) {
          await prisma.preparerAvailability.update({
            where: { id: override.id },
            data: {
              startTime: override.startTime,
              endTime: override.endTime,
              overrideFrom: override.overrideFrom ? parseISO(override.overrideFrom) : undefined,
              overrideUntil: override.overrideUntil ? parseISO(override.overrideUntil) : undefined,
              overrideLabel: override.overrideLabel,
              serviceIds: override.serviceIds || [],
              isActive: override.isActive !== undefined ? override.isActive : true,
            },
          });
        } else if (override.action === 'create') {
          await prisma.preparerAvailability.create({
            data: {
              preparerId,
              dayOfWeek: 0, // Not used for overrides
              startTime: override.startTime || '00:00',
              endTime: override.endTime || '00:00',
              serviceIds: override.serviceIds || [],
              isOverride: true,
              overrideFrom: parseISO(override.overrideFrom),
              overrideUntil: parseISO(override.overrideUntil),
              overrideLabel: override.overrideLabel,
              isActive: true,
            },
          });
        }
      }
    }

    // Return updated availability
    const updatedAvailability = await prisma.preparerAvailability.findMany({
      where: { preparerId },
      orderBy: [{ isOverride: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      message: 'Availability updated successfully',
      preparerId,
      availability: updatedAvailability.map((avail) => ({
        id: avail.id,
        dayOfWeek: avail.dayOfWeek,
        startTime: avail.startTime,
        endTime: avail.endTime,
        serviceIds: avail.serviceIds,
        isOverride: avail.isOverride,
        overrideFrom: avail.overrideFrom?.toISOString(),
        overrideUntil: avail.overrideUntil?.toISOString(),
        overrideLabel: avail.overrideLabel,
        isActive: avail.isActive,
      })),
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    return NextResponse.json(
      {
        error: 'Failed to update availability',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
