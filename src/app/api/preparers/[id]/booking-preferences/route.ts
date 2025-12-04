import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { getUserPermissions, UserRole } from '@/lib/permissions';

/**
 * GET /api/preparers/[id]/booking-preferences
 *
 * Get booking preferences for a specific preparer
 * Public endpoint - used by booking forms to show available options
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: preparerId } = await params;

    const preparer = await prisma.profile.findUnique({
      where: { id: preparerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        role: true,
        bookingEnabled: true,
        allowPhoneBookings: true,
        allowVideoBookings: true,
        allowInPersonBookings: true,
        requireApprovalForBookings: true,
        customBookingMessage: true,
        bookingCalendarColor: true,
      },
    });

    if (!preparer) {
      return NextResponse.json({ error: 'Preparer not found' }, { status: 404 });
    }

    // Only allow booking preferences for tax preparers, admins, and super admins
    if (!['TAX_PREPARER', 'ADMIN', 'SUPER_ADMIN'].includes(preparer.role)) {
      return NextResponse.json(
        { error: 'This user is not available for booking' },
        { status: 400 }
      );
    }

    // Calculate available booking methods
    const availableBookingMethods = [];
    if (preparer.bookingEnabled) {
      if (preparer.allowPhoneBookings) availableBookingMethods.push('PHONE_CALL');
      if (preparer.allowVideoBookings) availableBookingMethods.push('VIDEO_CALL');
      if (preparer.allowInPersonBookings) availableBookingMethods.push('IN_PERSON');
    }

    return NextResponse.json({
      success: true,
      preparer: {
        id: preparer.id,
        name: `${preparer.firstName} ${preparer.lastName}`,
        companyName: preparer.companyName,
      },
      bookingEnabled: preparer.bookingEnabled,
      availableBookingMethods,
      requiresApproval: preparer.requireApprovalForBookings,
      customMessage: preparer.customBookingMessage,
      calendarColor: preparer.bookingCalendarColor || '#3B82F6',
    });
  } catch (error) {
    logger.error('[Booking Preferences API] Error fetching preparer booking preferences', error);
    return NextResponse.json({ error: 'Failed to fetch booking preferences' }, { status: 500 });
  }
}

/**
 * PUT /api/preparers/[id]/booking-preferences
 *
 * Update booking preferences for a preparer
 * Admin-only or self-update
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth(); const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: preparerId } = await params;
    const role = user?.role as UserRole | undefined;
    const permissions = getUserPermissions(role || 'client');

    // Check if user is admin or the preparer themselves
    const userProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    const isAdmin = permissions.users === 'full';
    const isSelf = userProfile?.id === preparerId;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: "You do not have permission to update this preparer's preferences" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      bookingEnabled,
      allowPhoneBookings,
      allowVideoBookings,
      allowInPersonBookings,
      requireApprovalForBookings,
      customBookingMessage,
      bookingCalendarColor,
    } = body;

    const updated = await prisma.profile.update({
      where: { id: preparerId },
      data: {
        bookingEnabled: bookingEnabled !== undefined ? bookingEnabled : undefined,
        allowPhoneBookings: allowPhoneBookings !== undefined ? allowPhoneBookings : undefined,
        allowVideoBookings: allowVideoBookings !== undefined ? allowVideoBookings : undefined,
        allowInPersonBookings:
          allowInPersonBookings !== undefined ? allowInPersonBookings : undefined,
        requireApprovalForBookings:
          requireApprovalForBookings !== undefined ? requireApprovalForBookings : undefined,
        customBookingMessage: customBookingMessage !== undefined ? customBookingMessage : undefined,
        bookingCalendarColor: bookingCalendarColor !== undefined ? bookingCalendarColor : undefined,
      },
      select: {
        id: true,
        bookingEnabled: true,
        allowPhoneBookings: true,
        allowVideoBookings: true,
        allowInPersonBookings: true,
        requireApprovalForBookings: true,
        customBookingMessage: true,
        bookingCalendarColor: true,
      },
    });

    logger.info('[Booking Preferences API] Updated booking preferences', {
      preparerId,
      updatedBy: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Booking preferences updated successfully',
      preferences: updated,
    });
  } catch (error) {
    logger.error('[Booking Preferences API] Error updating booking preferences', error);
    return NextResponse.json({ error: 'Failed to update booking preferences' }, { status: 500 });
  }
}
