/**
 * Fluid Booking API - Manage Preparer Availability
 * Allows preparers to get and update their availability schedule
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { auth } from '@/lib/auth';
import { parseISO } from 'date-fns';
import { logger } from '@/lib/logger';

// TypeScript interfaces for Supabase responses
interface PreparerAvailability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  serviceIds: string[];
  isOverride: boolean;
  overrideFrom: string | null;
  overrideUntil: string | null;
  overrideLabel: string | null;
  isActive: boolean;
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

    // Check permissions
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
        { error: 'You do not have permission to view this availability' },
        { status: 403 }
      );
    }

    // Get all availability rules
    const { data: availability } = await db
      .from('preparer_availability')
      .select('*')
      .eq('preparerId', preparerId)
      .order('isOverride', { ascending: true })
      .order('dayOfWeek', { ascending: true })
      .order('startTime', { ascending: true });

    // Get booking preferences from profile
    const { data: profileData } = await db
      .from('profiles')
      .select('bookingEnabled, allowPhoneBookings, allowVideoBookings, allowInPersonBookings, requireApprovalForBookings, customBookingMessage, bookingCalendarColor, appointmentBufferMinutes, defaultAppointmentDuration, timezone')
      .eq('id', preparerId)
      .limit(1);

    const profile = firstOrNull(profileData);

    return NextResponse.json({
      success: true,
      preparerId,
      bookingPreferences: profile,
      availability: (availability || []).map((avail: PreparerAvailability) => ({
        id: avail.id,
        dayOfWeek: avail.dayOfWeek,
        startTime: avail.startTime,
        endTime: avail.endTime,
        serviceIds: avail.serviceIds,
        isOverride: avail.isOverride,
        overrideFrom: avail.overrideFrom,
        overrideUntil: avail.overrideUntil,
        overrideLabel: avail.overrideLabel,
        isActive: avail.isActive,
      })),
    });
  } catch (error) {
    logger.error('Error fetching availability', { error: error instanceof Error ? error.message : 'Unknown error' });
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: preparerId } = await params;
    const body = await request.json();
    const { weeklySchedule, overrides, bookingPreferences } = body;

    // Check permissions
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
        { error: 'You do not have permission to update this availability' },
        { status: 403 }
      );
    }

    // Update booking preferences in Profile if provided
    if (bookingPreferences) {
      await db
        .from('profiles')
        .update({
          bookingEnabled: bookingPreferences.bookingEnabled,
          allowPhoneBookings: bookingPreferences.allowPhoneBookings,
          allowVideoBookings: bookingPreferences.allowVideoBookings,
          allowInPersonBookings: bookingPreferences.allowInPersonBookings,
          requireApprovalForBookings: bookingPreferences.requireApprovalForBookings,
          customBookingMessage: bookingPreferences.customBookingMessage,
          bookingCalendarColor: bookingPreferences.bookingCalendarColor,
          appointmentBufferMinutes: bookingPreferences.appointmentBufferMinutes,
          defaultAppointmentDuration: bookingPreferences.defaultAppointmentDuration,
          timezone: bookingPreferences.timezone,
        })
        .eq('id', preparerId);
    }

    // Update weekly schedule if provided
    if (weeklySchedule && Array.isArray(weeklySchedule)) {
      // Delete existing regular (non-override) availability
      await db
        .from('preparer_availability')
        .delete()
        .eq('preparerId', preparerId)
        .eq('isOverride', false);

      // Create new weekly schedule
      if (weeklySchedule.length > 0) {
        await db
          .from('preparer_availability')
          .insert(
            weeklySchedule.map((schedule: any) => ({
              preparerId,
              dayOfWeek: schedule.dayOfWeek,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              serviceIds: schedule.serviceIds || [],
              isOverride: false,
              isActive: true,
            }))
          );
      }
    }

    // Update overrides if provided
    if (overrides && Array.isArray(overrides)) {
      // Process each override (create, update, or delete)
      for (const override of overrides) {
        if (override.action === 'delete' && override.id) {
          await db
            .from('preparer_availability')
            .delete()
            .eq('id', override.id);
        } else if (override.action === 'update' && override.id) {
          await db
            .from('preparer_availability')
            .update({
              startTime: override.startTime,
              endTime: override.endTime,
              overrideFrom: override.overrideFrom ? parseISO(override.overrideFrom).toISOString() : undefined,
              overrideUntil: override.overrideUntil ? parseISO(override.overrideUntil).toISOString() : undefined,
              overrideLabel: override.overrideLabel,
              serviceIds: override.serviceIds || [],
              isActive: override.isActive !== undefined ? override.isActive : true,
            })
            .eq('id', override.id);
        } else if (override.action === 'create') {
          await db
            .from('preparer_availability')
            .insert({
              preparerId,
              dayOfWeek: 0, // Not used for overrides
              startTime: override.startTime || '00:00',
              endTime: override.endTime || '00:00',
              serviceIds: override.serviceIds || [],
              isOverride: true,
              overrideFrom: parseISO(override.overrideFrom).toISOString(),
              overrideUntil: parseISO(override.overrideUntil).toISOString(),
              overrideLabel: override.overrideLabel,
              isActive: true,
            });
        }
      }
    }

    // Return updated availability
    const { data: updatedAvailability } = await db
      .from('preparer_availability')
      .select('*')
      .eq('preparerId', preparerId)
      .order('isOverride', { ascending: true })
      .order('dayOfWeek', { ascending: true })
      .order('startTime', { ascending: true });

    return NextResponse.json({
      success: true,
      message: 'Availability updated successfully',
      preparerId,
      availability: (updatedAvailability || []).map((avail: PreparerAvailability) => ({
        id: avail.id,
        dayOfWeek: avail.dayOfWeek,
        startTime: avail.startTime,
        endTime: avail.endTime,
        serviceIds: avail.serviceIds,
        isOverride: avail.isOverride,
        overrideFrom: avail.overrideFrom,
        overrideUntil: avail.overrideUntil,
        overrideLabel: avail.overrideLabel,
        isActive: avail.isActive,
      })),
    });
  } catch (error) {
    logger.error('Error updating availability', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      {
        error: 'Failed to update availability',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
