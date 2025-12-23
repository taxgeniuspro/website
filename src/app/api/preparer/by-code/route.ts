import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// Default preparer (Owliver Owl) - used for affiliates and fallback
const DEFAULT_PREPARER = {
  firstName: 'Owliver',
  lastName: 'Owl',
  phone: '1 (404) 627-1015',
  email: 'taxgenius.tax@gmail.com',
  avatarUrl:
    'https://res.cloudinary.com/dhktmiigh/image/upload/v1765487894/taxgeniuspro/preparers/preparer_ow.jpg',
  trackingCode: 'ow',
  companyName: 'Tax Genius Pro',
};

/**
 * Get Owliver's profile from database, or use hardcoded fallback
 */
async function getDefaultPreparer() {
  try {
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
        avatarUrl: true,
        companyName: true,
        phone: true,
        trackingCode: true,
        customTrackingCode: true,
        user: { select: { email: true } },
      },
    });

    if (owliver) {
      return {
        id: owliver.id,
        firstName: owliver.firstName || DEFAULT_PREPARER.firstName,
        lastName: owliver.lastName || DEFAULT_PREPARER.lastName,
        avatarUrl: owliver.avatarUrl || DEFAULT_PREPARER.avatarUrl,
        companyName: owliver.companyName || DEFAULT_PREPARER.companyName,
        phone: owliver.phone || DEFAULT_PREPARER.phone,
        email: owliver.user?.email || DEFAULT_PREPARER.email,
        trackingCode: owliver.customTrackingCode || owliver.trackingCode || DEFAULT_PREPARER.trackingCode,
      };
    }
  } catch (error) {
    logger.error('Error fetching Owliver profile:', error);
  }

  // Fallback to hardcoded values
  return { id: null, ...DEFAULT_PREPARER };
}

/**
 * GET /api/preparer/by-code?code={trackingCode}
 *
 * Fetches preparer information based on tracking code (e.g., 'gw')
 * Public endpoint - used by contact page to show preparer contact info
 *
 * Logic:
 * 1. If code matches a tax_preparer/admin -> return that preparer
 * 2. If code matches an affiliate/client -> return Owliver (default preparer)
 * 3. If no code or invalid code -> return Owliver (default preparer)
 */
export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');

    // If no code provided, return default preparer (Owliver)
    if (!code) {
      const defaultPreparer = await getDefaultPreparer();
      return NextResponse.json({ preparer: defaultPreparer }, { status: 200 });
    }

    // Step 1: Try to find tax preparer or admin by tracking code
    const preparerProfile = await prisma.profile.findFirst({
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

    if (preparerProfile && preparerProfile.firstName && preparerProfile.lastName) {
      // Found a tax preparer - return their info
      const linkCode =
        preparerProfile.customTrackingCode ||
        preparerProfile.shortLinkUsername ||
        preparerProfile.trackingCode;

      return NextResponse.json(
        {
          preparer: {
            id: preparerProfile.id,
            firstName: preparerProfile.firstName,
            lastName: preparerProfile.lastName,
            avatarUrl: preparerProfile.avatarUrl,
            companyName: preparerProfile.companyName,
            phone: preparerProfile.phone,
            email: preparerProfile.user?.email,
            trackingCode: linkCode,
          },
        },
        { status: 200 }
      );
    }

    // Step 2: Check if it's an affiliate or client code
    const affiliateProfile = await prisma.profile.findFirst({
      where: {
        OR: [
          { trackingCode: code },
          { customTrackingCode: code },
        ],
        role: { in: ['client', 'affiliate'] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        affiliateBondedToPreparerId: true,
      },
    });

    if (affiliateProfile) {
      // Found an affiliate - check if they're bonded to a specific preparer
      if (affiliateProfile.affiliateBondedToPreparerId) {
        const bondedPreparer = await prisma.profile.findUnique({
          where: { id: affiliateProfile.affiliateBondedToPreparerId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            companyName: true,
            phone: true,
            trackingCode: true,
            customTrackingCode: true,
            user: { select: { email: true } },
          },
        });

        if (bondedPreparer && bondedPreparer.firstName && bondedPreparer.lastName) {
          const linkCode = bondedPreparer.customTrackingCode || bondedPreparer.trackingCode;
          return NextResponse.json(
            {
              preparer: {
                id: bondedPreparer.id,
                firstName: bondedPreparer.firstName,
                lastName: bondedPreparer.lastName,
                avatarUrl: bondedPreparer.avatarUrl,
                companyName: bondedPreparer.companyName,
                phone: bondedPreparer.phone,
                email: bondedPreparer.user?.email,
                trackingCode: linkCode,
              },
              referrerName: `${affiliateProfile.firstName || ''} ${affiliateProfile.lastName || ''}`.trim(),
            },
            { status: 200 }
          );
        }
      }

      // Affiliate not bonded - return Owliver as default
      const defaultPreparer = await getDefaultPreparer();
      return NextResponse.json(
        {
          preparer: defaultPreparer,
          referrerName: `${affiliateProfile.firstName || ''} ${affiliateProfile.lastName || ''}`.trim(),
        },
        { status: 200 }
      );
    }

    // Step 3: Code not found anywhere - return default preparer (Owliver)
    const defaultPreparer = await getDefaultPreparer();
    return NextResponse.json({ preparer: defaultPreparer }, { status: 200 });
  } catch (error) {
    logger.error('Error fetching preparer by code:', error);
    // Even on error, return default preparer so forms still work
    return NextResponse.json(
      {
        preparer: { id: null, ...DEFAULT_PREPARER },
        error: 'Failed to fetch preparer info',
      },
      { status: 200 }
    );
  }
}
