import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Hardcoded fallback for Owliver Owl
const DEFAULT_PREPARER_FALLBACK = {
  id: null,
  firstName: 'Owliver',
  lastName: 'Owl',
  role: 'admin',
  avatarUrl:
    'https://res.cloudinary.com/dhktmiigh/image/upload/v1765487894/taxgeniuspro/preparers/preparer_ow.jpg',
};

/**
 * GET /api/preparers/default
 *
 * Get the default preparer for new appointments
 * Returns Owliver Owl (taxgenius.tax@gmail.com or tracking code 'ow')
 */
export async function GET() {
  try {
    // First, try to find Owliver (the default corporate preparer)
    const owliver = await prisma.profile.findFirst({
      where: {
        OR: [
          { customTrackingCode: 'ow' },
          { trackingCode: 'ow' },
          { user: { email: 'taxgenius.tax@gmail.com' } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
      },
    });

    if (owliver) {
      return NextResponse.json({
        success: true,
        preparerId: owliver.id,
        preparer: {
          id: owliver.id,
          name: `${owliver.firstName || 'Owliver'} ${owliver.lastName || 'Owl'}`,
          role: owliver.role,
          avatarUrl: owliver.avatarUrl || DEFAULT_PREPARER_FALLBACK.avatarUrl,
        },
      });
    }

    // Fallback: find any admin with booking enabled
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

    // Ultimate fallback: return hardcoded Owliver
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
