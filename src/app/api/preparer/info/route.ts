import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
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
    if (attribution.attribution.referrerType !== 'tax_preparer') {
      return NextResponse.json({ preparer: null }, { status: 200 });
    }

    // Fetch preparer profile by tracking code OR short link username
    const referrerUsername = attribution.attribution.referrerUsername;
    const { data: profileData } = await db
      .from('profiles')
      .select('firstName, lastName, avatarUrl, qrCodeLogoUrl, companyName, licenseNo, bio, phone, trackingCodeQRUrl, userId')
      .or(`trackingCode.eq.${referrerUsername},customTrackingCode.eq.${referrerUsername},shortLinkUsername.eq.${referrerUsername}`)
      .eq('role', 'tax_preparer')
      .limit(1);

    const profile = firstOrNull(profileData);

    if (!profile || !profile.firstName || !profile.lastName) {
      return NextResponse.json({ preparer: null }, { status: 200 });
    }

    // Get user email
    let email: string | undefined;
    if (profile.userId) {
      const { data: userData } = await db
        .from('users')
        .select('email')
        .eq('id', profile.userId)
        .limit(1);
      email = userData?.[0]?.email;
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
          email: email,
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
