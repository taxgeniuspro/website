import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interface for profile (replacing @prisma/client types)
interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  companyName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  affiliateBondedToPreparerId: string | null;
}

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
    // Supabase doesn't support OR in the same way, so we use .or() filter
    const { data: profileData, error } = await db
      .from('profiles')
      .select('id, first_name, last_name, role, company_name, avatar_url, phone, affiliate_bonded_to_preparer_id')
      .or(`short_link_username.eq.${username},tracking_code.eq.${username},custom_tracking_code.eq.${username},vanity_slug.eq.${username}`)
      .limit(1);

    if (error || !profileData || profileData.length === 0) {
      return NextResponse.json({ error: 'Referral code not found' }, { status: 404 });
    }

    const dbProfile = profileData[0];
    const profile: Profile = {
      id: dbProfile.id,
      firstName: dbProfile.first_name,
      lastName: dbProfile.last_name,
      role: dbProfile.role,
      companyName: dbProfile.company_name,
      avatarUrl: dbProfile.avatar_url,
      phone: dbProfile.phone,
      affiliateBondedToPreparerId: dbProfile.affiliate_bonded_to_preparer_id,
    };

    // Determine the preparer ID based on role
    let preparerId: string | null = null;

    switch (profile.role) {
      case 'tax_preparer':
      case 'admin':
      case 'admin':
        // Direct booking with preparer
        preparerId = profile.id;
        break;

      case 'client':
        // Book with client's assigned preparer
        // TODO: Look up client's assigned preparer via ClientPreparer relation
        preparerId = null;
        break;

      case 'affiliate':
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
        firstName: profile.firstName,
        lastName: profile.lastName,
        role: profile.role,
        companyName: profile.companyName,
        avatarUrl: profile.avatarUrl,
        phone: profile.phone,
      },
    });
  } catch (error) {
    logger.error('[Referral Resolve API] Error resolving referral code', error);
    return NextResponse.json({ error: 'Failed to resolve referral code' }, { status: 500 });
  }
}
