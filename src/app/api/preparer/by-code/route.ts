import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/preparer/by-code?code={trackingCode}
 *
 * Fetches preparer information based on tracking code (e.g., 'gw')
 * Public endpoint - used by contact page to show preparer contact info
 */
export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');

    if (!code) {
      return NextResponse.json({ preparer: null }, { status: 200 });
    }

    // Fetch preparer profile by tracking code OR short link username
    // Include both tax_preparer and admin roles (admins may also have marketing links)
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { trackingCode: code },
          { customTrackingCode: code },
          { shortLinkUsername: code },
        ],
        role: { in: ['tax_preparer', 'admin'] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        companyName: true,
        phone: true,
        trackingCode: true,
        customTrackingCode: true,
        shortLinkUsername: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!profile || !profile.firstName || !profile.lastName) {
      return NextResponse.json({ preparer: null }, { status: 200 });
    }

    // Determine the tracking code to use for links
    const linkCode = profile.customTrackingCode || profile.shortLinkUsername || profile.trackingCode;

    return NextResponse.json(
      {
        preparer: {
          id: profile.id,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUrl: profile.avatarUrl,
          companyName: profile.companyName,
          phone: profile.phone,
          email: profile.user?.email,
          trackingCode: linkCode,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error fetching preparer by code:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preparer info', preparer: null },
      { status: 500 }
    );
  }
}
