import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/referrals/resolve?username=xxx
 *
 * Resolve a referral username/tracking code to a preparer ID
 * Used for direct booking via referral links
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username parameter required' }, { status: 400 });
    }

    // Find profile by various username/code fields
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { shortLinkUsername: username },
          { trackingCode: username },
          { customTrackingCode: username },
          { vanitySlug: username },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        companyName: true,
        affiliateBondedToPreparerId: true, // For affiliates, get bonded preparer
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Referral code not found' }, { status: 404 });
    }

    // Determine the preparer ID based on role
    let preparerId: string | null = null;

    switch (profile.role) {
      case 'TAX_PREPARER':
      case 'ADMIN':
      case 'SUPER_ADMIN':
        // Direct booking with preparer
        preparerId = profile.id;
        break;

      case 'CLIENT':
        // Book with client's assigned preparer
        // TODO: Look up client's assigned preparer via ClientPreparer relation
        preparerId = null;
        break;

      case 'AFFILIATE':
        // Book with affiliate's bonded preparer
        preparerId = profile.affiliateBondedToPreparerId || null;
        break;

      default:
        // Unknown role, use default preparer
        preparerId = null;
    }

    return NextResponse.json({
      success: true,
      preparerId,
      referralSource: {
        id: profile.id,
        name: `${profile.firstName} ${profile.lastName}`,
        role: profile.role,
        companyName: profile.companyName,
      },
    });
  } catch (error) {
    logger.error('[Referral Resolve API] Error resolving referral code', error);
    return NextResponse.json({ error: 'Failed to resolve referral code' }, { status: 500 });
  }
}
