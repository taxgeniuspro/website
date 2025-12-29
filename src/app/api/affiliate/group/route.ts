import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { hasAffiliateAccess } from '@/lib/permissions';

// TypeScript interfaces (replacing Prisma types)
interface AffiliateGroup {
  id: string;
  name: string;
  description: string | null;
  commissionType: string;
  commissionRate: number | null;
  flatAmount: number | null;
  tieredRates: unknown;
  minimumPayout: number;
  payoutFrequency: string;
  isActive: boolean;
}

interface Profile {
  id: string;
  role: string | null;
  affiliateStatus: string | null;
  affiliateGroupId: string | null;
  affiliateGroup?: AffiliateGroup | null;
}

/**
 * GET /api/affiliate/group
 * Get the current affiliate's group information
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with group - use Supabase OR conditions for Supabase Auth compatibility
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id, role, affiliateStatus, affiliateGroupId, affiliate_groups(*)')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (profileError) {
      logger.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const profileWithGroup = firstOrNull<Profile & { affiliate_groups?: AffiliateGroup }>(profileData);

    if (!profileWithGroup) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user has affiliate access using centralized function
    if (!hasAffiliateAccess(profileWithGroup.role as any, profileWithGroup.affiliateStatus as any)) {
      return NextResponse.json({ error: 'Affiliate access required' }, { status: 403 });
    }

    const group = profileWithGroup.affiliate_groups;

    if (!group) {
      return NextResponse.json({
        group: null,
        message: 'Not assigned to any affiliate group',
      });
    }

    // Serialize group (Supabase returns numbers directly, no Decimal conversion needed)
    const serializedGroup = {
      id: group.id,
      name: group.name,
      description: group.description,
      commissionType: group.commissionType,
      commissionRate: group.commissionRate ?? null,
      flatAmount: group.flatAmount ?? null,
      tieredRates: group.tieredRates,
      minimumPayout: group.minimumPayout,
      payoutFrequency: group.payoutFrequency,
      isActive: group.isActive,
    };

    return NextResponse.json({ group: serializedGroup });
  } catch (error) {
    logger.error('Failed to fetch affiliate group', error);
    return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
  }
}
