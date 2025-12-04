/**
 * Fluid Booking API - Get Available Time Slots
 * Returns available booking slots for a preparer on a specific date
 */

import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/services/availability.service';
import { parseISO } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const preparerId = searchParams.get('preparerId');
    const dateStr = searchParams.get('date');
    const durationStr = searchParams.get('duration');
    const serviceId = searchParams.get('serviceId') || undefined;
    const timezone = searchParams.get('timezone') || 'America/New_York';

    // Validate required parameters
    if (!preparerId) {
      return NextResponse.json(
        { error: 'preparerId is required' },
        { status: 400 }
      );
    }

    if (!dateStr) {
      return NextResponse.json(
        { error: 'date is required (format: YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    if (!durationStr) {
      return NextResponse.json(
        { error: 'duration (in minutes) is required' },
        { status: 400 }
      );
    }

    // Parse and validate date
    let date: Date;
    try {
      date = parseISO(dateStr);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Parse duration
    const duration = parseInt(durationStr, 10);
    if (isNaN(duration) || duration <= 0) {
      return NextResponse.json(
        { error: 'Duration must be a positive number' },
        { status: 400 }
      );
    }

    // Calculate available slots
    const slots = await AvailabilityService.calculateAvailableSlots({
      preparerId,
      date,
      duration,
      serviceId,
      timezone,
    });

    // Return slots with metadata
    return NextResponse.json({
      success: true,
      date: dateStr,
      preparerId,
      duration,
      serviceId,
      timezone,
      slotsCount: slots.length,
      slots: slots.map((slot) => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        startTime: slot.startTime,
        endTime: slot.endTime,
        available: slot.available,
      })),
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch available slots',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
