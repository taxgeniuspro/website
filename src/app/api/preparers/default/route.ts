import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/preparers/default
 *
 * Get the default preparer for new appointments
 * Returns the first SUPER_ADMIN, then ADMIN, then TAX_PREPARER
 */
export async function GET() {
  try {
    const defaultPreparer = await prisma.profile.findFirst({
      where: {
        OR: [{ role: 'super_admin' }, { role: 'admin' }, { role: 'tax_preparer' }],
        bookingEnabled: true, // Only return preparers who accept bookings
      },
      orderBy: [
        {
          role: 'asc', // SUPER_ADMIN comes first alphabetically
        },
        {
          createdAt: 'asc', // Then oldest account
        },
      ],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!defaultPreparer) {
      return NextResponse.json({ error: 'No preparers available for booking' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      preparerId: defaultPreparer.id,
      preparer: {
        id: defaultPreparer.id,
        name: `${defaultPreparer.firstName} ${defaultPreparer.lastName}`,
        role: defaultPreparer.role,
      },
    });
  } catch (error) {
    logger.error('[Default Preparer API] Error fetching default preparer', error);
    return NextResponse.json({ error: 'Failed to fetch default preparer' }, { status: 500 });
  }
}
