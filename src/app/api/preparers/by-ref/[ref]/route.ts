import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET: Fetch preparer profile by tracking code or short link username
 * Used by the footer to display preparer-specific contact info and social links
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  try {
    const { ref } = await params;

    if (!ref) {
      return NextResponse.json({ error: 'Missing ref parameter' }, { status: 400 });
    }

    // Find preparer by tracking code, custom tracking code, or short link username
    const { data: profileData } = await db
      .from('profiles')
      .select('id, firstName, lastName, phone, publicAddress, companyName, professionalTitle, avatarUrl, facebookUrl, instagramUrl, linkedinUrl, twitterUrl, youtubeUrl, tiktokUrl, userId')
      .or(`trackingCode.eq.${ref},customTrackingCode.eq.${ref},shortLinkUsername.eq.${ref}`)
      .eq('role', 'tax_preparer')
      .limit(1);

    const profile = firstOrNull(profileData);

    if (!profile) {
      return NextResponse.json({ error: 'Preparer not found' }, { status: 404 });
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

    // Return profile with user email
    return NextResponse.json({
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      publicAddress: profile.publicAddress,
      companyName: profile.companyName,
      professionalTitle: profile.professionalTitle,
      avatarUrl: profile.avatarUrl,
      facebookUrl: profile.facebookUrl,
      instagramUrl: profile.instagramUrl,
      linkedinUrl: profile.linkedinUrl,
      twitterUrl: profile.twitterUrl,
      youtubeUrl: profile.youtubeUrl,
      tiktokUrl: profile.tiktokUrl,
      user: email ? { email } : null,
    });
  } catch (error) {
    logger.error('Error fetching preparer by ref', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: 'Failed to fetch preparer' }, { status: 500 });
  }
}
