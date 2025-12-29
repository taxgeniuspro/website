import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
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

    const { data: preparerData } = await db
      .from('profiles')
      .select('id, firstName, lastName, companyName, phone, avatarUrl, publicAddress, role, bookingEnabled, allowPhoneBookings, allowVideoBookings, allowInPersonBookings, requireApprovalForBookings, customBookingMessage, bookingCalendarColor, userId')
      .eq('id', preparerId)
      .limit(1);

    const preparer = firstOrNull(preparerData);

    if (!preparer) {
      return NextResponse.json({ error: 'Preparer not found' }, { status: 404 });
    }

    // Only allow booking preferences for tax preparers, admins, and super admins
    if (!['tax_preparer', 'admin', 'admin'].includes(preparer.role)) {
      return NextResponse.json(
        { error: 'This user is not available for booking' },
        { status: 400 }
      );
    }

    // Get user email
    let email: string | undefined;
    if (preparer.userId) {
      const { data: userData } = await db
        .from('users')
        .select('email')
        .eq('id', preparer.userId)
        .limit(1);
      email = userData?.[0]?.email;
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
        phone: preparer.phone,
        email: email,
        avatarUrl: preparer.avatarUrl,
        publicAddress: preparer.publicAddress,
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
    const { data: userProfileData } = await db
      .from('profiles')
      .select('id')
      .eq('userId', user.id)
      .limit(1);

    const userProfile = firstOrNull(userProfileData);

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

    // Build update object with only defined values
    const updateData: Record<string, any> = {};
    if (bookingEnabled !== undefined) updateData.bookingEnabled = bookingEnabled;
    if (allowPhoneBookings !== undefined) updateData.allowPhoneBookings = allowPhoneBookings;
    if (allowVideoBookings !== undefined) updateData.allowVideoBookings = allowVideoBookings;
    if (allowInPersonBookings !== undefined) updateData.allowInPersonBookings = allowInPersonBookings;
    if (requireApprovalForBookings !== undefined) updateData.requireApprovalForBookings = requireApprovalForBookings;
    if (customBookingMessage !== undefined) updateData.customBookingMessage = customBookingMessage;
    if (bookingCalendarColor !== undefined) updateData.bookingCalendarColor = bookingCalendarColor;

    const { data: updatedData } = await db
      .from('profiles')
      .update(updateData)
      .eq('id', preparerId)
      .select('id, bookingEnabled, allowPhoneBookings, allowVideoBookings, allowInPersonBookings, requireApprovalForBookings, customBookingMessage, bookingCalendarColor');

    const updated = firstOrNull(updatedData);

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
