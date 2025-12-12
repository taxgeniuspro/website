import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { trackingCode: ref },
          { customTrackingCode: ref },
          { shortLinkUsername: ref },
        ],
        role: 'tax_preparer',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        publicAddress: true,
        companyName: true,
        professionalTitle: true,
        avatarUrl: true,
        // Social media links
        facebookUrl: true,
        instagramUrl: true,
        linkedinUrl: true,
        twitterUrl: true,
        youtubeUrl: true,
        tiktokUrl: true,
        // Include user email
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Preparer not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching preparer by ref:', error);
    return NextResponse.json({ error: 'Failed to fetch preparer' }, { status: 500 });
  }
}
