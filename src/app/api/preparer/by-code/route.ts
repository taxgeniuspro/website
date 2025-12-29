import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces for Supabase responses
interface ProfileWithUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  companyName: string | null;
  phone: string | null;
  trackingCode: string | null;
  customTrackingCode: string | null;
  shortLinkUsername: string | null;
  affiliateBondedToPreparerId: string | null;
  role: string;
  user: { email: string } | null;
}

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
    // Try to find by tracking codes first
    const { data: owliverData } = await db
      .from('profiles')
      .select('id, firstName, lastName, avatarUrl, companyName, phone, trackingCode, customTrackingCode, userId')
      .or('customTrackingCode.eq.ow,trackingCode.eq.ow')
      .limit(1);

    let owliver = firstOrNull(owliverData);

    // If not found by tracking code, try to find by email via users table
    if (!owliver) {
      const { data: userWithProfile } = await db
        .from('users')
        .select('id, email, profiles(id, firstName, lastName, avatarUrl, companyName, phone, trackingCode, customTrackingCode)')
        .eq('email', 'taxgenius.tax@gmail.com')
        .limit(1);

      const userResult = firstOrNull(userWithProfile);
      if (userResult?.profiles) {
        const profileData = Array.isArray(userResult.profiles) ? userResult.profiles[0] : userResult.profiles;
        owliver = { ...profileData, userId: userResult.id };
      }
    }

    if (owliver) {
      // Get user email if we have userId
      let email = DEFAULT_PREPARER.email;
      if (owliver.userId) {
        const { data: userData } = await db
          .from('users')
          .select('email')
          .eq('id', owliver.userId)
          .limit(1);
        if (userData?.[0]) {
          email = userData[0].email;
        }
      }

      return {
        id: owliver.id,
        firstName: owliver.firstName || DEFAULT_PREPARER.firstName,
        lastName: owliver.lastName || DEFAULT_PREPARER.lastName,
        avatarUrl: owliver.avatarUrl || DEFAULT_PREPARER.avatarUrl,
        companyName: owliver.companyName || DEFAULT_PREPARER.companyName,
        phone: owliver.phone || DEFAULT_PREPARER.phone,
        email: email,
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
    const { data: preparerData } = await db
      .from('profiles')
      .select('id, firstName, lastName, avatarUrl, companyName, phone, trackingCode, customTrackingCode, shortLinkUsername, userId, role')
      .or(`trackingCode.eq.${code},customTrackingCode.eq.${code},shortLinkUsername.eq.${code}`)
      .in('role', ['tax_preparer', 'admin'])
      .limit(1);

    const preparerProfile = firstOrNull(preparerData);

    if (preparerProfile && preparerProfile.firstName && preparerProfile.lastName) {
      // Found a tax preparer - return their info
      const linkCode =
        preparerProfile.customTrackingCode ||
        preparerProfile.shortLinkUsername ||
        preparerProfile.trackingCode;

      // Get user email
      let preparerEmail: string | undefined;
      if (preparerProfile.userId) {
        const { data: userData } = await db
          .from('users')
          .select('email')
          .eq('id', preparerProfile.userId)
          .limit(1);
        preparerEmail = userData?.[0]?.email;
      }

      return NextResponse.json(
        {
          preparer: {
            id: preparerProfile.id,
            firstName: preparerProfile.firstName,
            lastName: preparerProfile.lastName,
            avatarUrl: preparerProfile.avatarUrl,
            companyName: preparerProfile.companyName,
            phone: preparerProfile.phone,
            email: preparerEmail,
            trackingCode: linkCode,
          },
        },
        { status: 200 }
      );
    }

    // Step 2: Check if it's an affiliate or client code
    const { data: affiliateData } = await db
      .from('profiles')
      .select('id, firstName, lastName, affiliateBondedToPreparerId')
      .or(`trackingCode.eq.${code},customTrackingCode.eq.${code}`)
      .in('role', ['client', 'affiliate'])
      .limit(1);

    const affiliateProfile = firstOrNull(affiliateData);

    if (affiliateProfile) {
      // Found an affiliate - check if they're bonded to a specific preparer
      if (affiliateProfile.affiliateBondedToPreparerId) {
        const { data: bondedData } = await db
          .from('profiles')
          .select('id, firstName, lastName, avatarUrl, companyName, phone, trackingCode, customTrackingCode, userId')
          .eq('id', affiliateProfile.affiliateBondedToPreparerId)
          .limit(1);

        const bondedPreparer = firstOrNull(bondedData);

        if (bondedPreparer && bondedPreparer.firstName && bondedPreparer.lastName) {
          // Get user email
          let bondedEmail: string | undefined;
          if (bondedPreparer.userId) {
            const { data: userData } = await db
              .from('users')
              .select('email')
              .eq('id', bondedPreparer.userId)
              .limit(1);
            bondedEmail = userData?.[0]?.email;
          }

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
                email: bondedEmail,
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
