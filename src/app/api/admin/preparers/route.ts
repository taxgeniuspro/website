import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { getUserPermissions, UserRole } from '@/lib/permissions';

/**
 * GET /api/admin/preparers
 *
 * Fetch all tax preparers with optional booking settings
 * Admin-only endpoint
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth(); const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user?.role as UserRole | undefined;
    const permissions = getUserPermissions(role || 'client');

    // Only admins can access this endpoint
    if (!['admin', 'full'].includes(permissions.users)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const includeBookingSettings = searchParams.get('includeBookingSettings') === 'true';

    const preparers = await prisma.profile.findMany({
      where: {
        role: {
          in: ['TAX_PREPARER', 'ADMIN', 'SUPER_ADMIN'],
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        companyName: true,
        phone: true,
        userId: true,
        // Include booking settings if requested
        ...(includeBookingSettings && {
          bookingEnabled: true,
          allowPhoneBookings: true,
          allowVideoBookings: true,
          allowInPersonBookings: true,
          requireApprovalForBookings: true,
          customBookingMessage: true,
          bookingCalendarColor: true,
        }),
      },
      orderBy: [
        { role: 'asc' }, // SUPER_ADMIN first
        { firstName: 'asc' },
      ],
    });

    // Format email for display (get from Clerk user or profile)
    const preparersWithEmail = await Promise.all(
      preparers.map(async (preparer) => {
        let email = '';

        if (preparer.userId) {
          // Fetch email from Clerk if we have userId
          // For now, we'll use placeholder - in production you'd fetch from Clerk
          email = `${preparer.firstName?.toLowerCase()}.${preparer.lastName?.toLowerCase()}@taxgeniuspro.tax`;
        }

        return {
          ...preparer,
          email,
        };
      })
    );

    return NextResponse.json({
      success: true,
      preparers: preparersWithEmail,
      count: preparersWithEmail.length,
    });
  } catch (error) {
    logger.error('[Admin Preparers API] Error fetching preparers', error);
    return NextResponse.json({ error: 'Failed to fetch preparers' }, { status: 500 });
  }
}
