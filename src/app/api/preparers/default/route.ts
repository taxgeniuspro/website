import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Hardcoded fallback for Ray Hamilton (default preparer for English forms)
const DEFAULT_PREPARER_FALLBACK = {
  id: null,
  firstName: 'Ray',
  lastName: 'Hamilton',
  role: 'admin',
  avatarUrl:
    'https://res.cloudinary.com/dhktmiigh/image/upload/v1765487894/taxgeniuspro/preparers/preparer_rh.jpg',
};

/**
 * GET /api/preparers/default
 *
 * Get the default preparer for new appointments/forms
 * Returns Ray Hamilton (rhamiltonfirm@gmail.com or tracking code 'rh')
 *
 * Note: Owliver Owl is now an affiliate, not a tax preparer
 */
export async function GET() {
  try {
    // First, try to find Ray Hamilton (the default preparer for English forms)
    const rayHamilton = await prisma.profile.findFirst({
      where: {
        OR: [
          { customTrackingCode: 'rh' },
          { trackingCode: 'rh' },
          { user: { email: 'rhamiltonfirm@gmail.com' } },
        ],
        role: { in: ['admin', 'tax_preparer'] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
      },
    });

    if (rayHamilton) {
      return NextResponse.json({
        success: true,
        preparerId: rayHamilton.id,
        preparer: {
          id: rayHamilton.id,
          name: `${rayHamilton.firstName || 'Ray'} ${rayHamilton.lastName || 'Hamilton'}`,
          role: rayHamilton.role,
          avatarUrl: rayHamilton.avatarUrl || DEFAULT_PREPARER_FALLBACK.avatarUrl,
        },
      });
    }

    // Fallback: find any admin or tax_preparer with booking enabled
    const fallbackPreparer = await prisma.profile.findFirst({
      where: {
        role: { in: ['admin', 'tax_preparer'] },
        bookingEnabled: true,
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
      },
    });

    if (fallbackPreparer) {
      return NextResponse.json({
        success: true,
        preparerId: fallbackPreparer.id,
        preparer: {
          id: fallbackPreparer.id,
          name: `${fallbackPreparer.firstName} ${fallbackPreparer.lastName}`,
          role: fallbackPreparer.role,
          avatarUrl: fallbackPreparer.avatarUrl,
        },
      });
    }

    // Ultimate fallback: return hardcoded Ray Hamilton
    logger.warn('[Default Preparer API] No preparers found in database, using hardcoded fallback');
    return NextResponse.json({
      success: true,
      preparerId: null,
      preparer: {
        id: null,
        name: `${DEFAULT_PREPARER_FALLBACK.firstName} ${DEFAULT_PREPARER_FALLBACK.lastName}`,
        role: DEFAULT_PREPARER_FALLBACK.role,
        avatarUrl: DEFAULT_PREPARER_FALLBACK.avatarUrl,
      },
    });
  } catch (error) {
    logger.error('[Default Preparer API] Error fetching default preparer', error);
    return NextResponse.json({ error: 'Failed to fetch default preparer' }, { status: 500 });
  }
}
