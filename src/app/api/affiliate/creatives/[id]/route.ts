import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { hasAffiliateAccess } from '@/lib/permissions';

// TypeScript interfaces (replacing Prisma types)
type CreativePrivacy = 'PUBLIC' | 'PRIVATE' | 'GROUP_ONLY';
type CreativeStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

interface Profile {
  id: string;
  role: string | null;
  affiliateStatus: string | null;
  affiliateGroupId: string | null;
}

interface AffiliateCreative {
  id: string;
  status: CreativeStatus;
  privacy: CreativePrivacy;
  affiliateIds: string[];
  groupIds: string[];
  views: number;
  groups?: { id: string; name: string }[];
}

/**
 * GET /api/affiliate/creatives/[id]
 * Get a single creative if accessible to the affiliate
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile - use Supabase OR conditions for Supabase Auth compatibility
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id, role, affiliateStatus, affiliateGroupId')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (profileError) {
      logger.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const profile = firstOrNull<Profile>(profileData);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user has affiliate access using centralized function
    if (!hasAffiliateAccess(profile.role as any, profile.affiliateStatus as any)) {
      return NextResponse.json({ error: 'Affiliate access required' }, { status: 403 });
    }

    const { id } = await params;

    // Get creative with groups (using Supabase join syntax)
    const { data: creativeData, error: creativeError } = await db
      .from('affiliate_creatives')
      .select('*, affiliate_creative_groups(id, name)')
      .eq('id', id)
      .limit(1);

    if (creativeError) {
      logger.error('Error fetching creative:', creativeError);
      return NextResponse.json({ error: 'Failed to fetch creative' }, { status: 500 });
    }

    const creative = firstOrNull<AffiliateCreative>(creativeData);

    if (!creative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
    }

    // Check if creative is active
    if (creative.status !== 'ACTIVE') {
      // Admins can see all
      if (profile.role !== 'admin') {
        return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
      }
    }

    // Check access based on privacy
    if (creative.privacy === 'PRIVATE') {
      // Check if affiliate is in the allowed list
      if (!creative.affiliateIds.includes(profile.id)) {
        // Admins can see all
        if (profile.role !== 'admin') {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }
    } else if (creative.privacy === 'GROUP_ONLY') {
      // Check if affiliate's group is in the allowed list
      const hasAccess =
        (profile.affiliateGroupId && creative.groupIds.includes(profile.affiliateGroupId)) ||
        creative.affiliateIds.includes(profile.id);

      if (!hasAccess) {
        // Admins can see all
        if (profile.role !== 'admin') {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }
    }

    // Increment views (don't wait for this)
    db.from('affiliate_creatives')
      .update({ views: (creative.views || 0) + 1 })
      .eq('id', id)
      .then(() => {})
      .catch((err) => {
        logger.error('Failed to increment creative views', err);
      });

    return NextResponse.json(creative);
  } catch (error) {
    logger.error('Failed to fetch creative', error);
    return NextResponse.json({ error: 'Failed to fetch creative' }, { status: 500 });
  }
}
