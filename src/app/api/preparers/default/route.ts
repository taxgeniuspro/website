import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Owliver Owl - Company mascot/icon used as default display image
const OWLIVER_AVATAR_URL =
  'https://res.cloudinary.com/dhktmiigh/image/upload/v1765487894/taxgeniuspro/preparers/preparer_ow.jpg';

// Fallback when no preparer found in database
const DEFAULT_PREPARER_FALLBACK = {
  id: null,
  firstName: 'Tax Genius',
  lastName: 'Pro',
  role: 'admin',
  avatarUrl: OWLIVER_AVATAR_URL,
};

/**
 * GET /api/preparers/default
 *
 * Get the default preparer for new appointments/forms
 * Returns Ray Hamilton's ID for lead assignment, but Owliver's avatar for display
 *
 * Display: Owliver Owl (company icon/mascot)
 * Lead Assignment: Ray Hamilton (English) or Ale Hamilton (Spanish)
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
          // Display as "Tax Genius Pro" with Owliver's avatar (company icon)
          name: 'Tax Genius Pro',
          role: rayHamilton.role,
          avatarUrl: OWLIVER_AVATAR_URL,
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
          // Display as "Tax Genius Pro" with Owliver's avatar (company icon)
          name: 'Tax Genius Pro',
          role: fallbackPreparer.role,
          avatarUrl: OWLIVER_AVATAR_URL,
        },
      });
    }

    // Ultimate fallback: return hardcoded info
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
