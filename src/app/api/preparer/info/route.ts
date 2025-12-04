import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getAttribution } from '@/lib/services/attribution.service';

/**
 * GET /api/preparer/info
 *
 * Fetches preparer information based on attribution tracking
 * Returns preparer details if user came from a tax preparer's referral link
 */
export async function GET(req: NextRequest) {
  try {
    // Get attribution from cookie
    const attribution = await getAttribution();

    // If no attribution or not from a tax preparer, return null
    if (!attribution.success || !attribution.attribution.referrerUsername) {
      return NextResponse.json({ preparer: null }, { status: 200 });
    }

    // Check if referrer is a tax preparer
    if (attribution.attribution.referrerType !== 'TAX_PREPARER') {
      return NextResponse.json({ preparer: null }, { status: 200 });
    }

    // Fetch preparer profile by tracking code OR short link username
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { trackingCode: attribution.attribution.referrerUsername },
          { customTrackingCode: attribution.attribution.referrerUsername },
          { shortLinkUsername: attribution.attribution.referrerUsername },
        ],
        role: 'tax_preparer',
      },
      select: {
        firstName: true,
        lastName: true,
        avatarUrl: true,
        qrCodeLogoUrl: true,
        companyName: true,
        licenseNo: true,
        bio: true,
        phone: true,
        email: true,
        trackingCodeQRUrl: true,
      },
    });

    if (!profile || !profile.firstName || !profile.lastName) {
      return NextResponse.json({ preparer: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        preparer: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUrl: profile.avatarUrl || profile.qrCodeLogoUrl,
          companyName: profile.companyName,
          licenseNo: profile.licenseNo,
          bio: profile.bio,
          phone: profile.phone,
          email: profile.email,
          qrCodeUrl: profile.trackingCodeQRUrl,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error fetching preparer info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preparer info', preparer: null },
      { status: 500 }
    );
  }
}
