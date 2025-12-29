import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { trackCreativeUsage } from '@/lib/services/creative.service';
import { hasAffiliateAccess } from '@/lib/permissions';

// TypeScript interfaces (replacing Prisma types)
interface Profile {
  id: string;
  role: string | null;
  affiliateStatus: string | null;
}

interface AffiliateCreative {
  id: string;
}

/**
 * POST /api/affiliate/creatives/[id]/track
 * Track creative usage (download, share, view)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile - use Supabase OR conditions for Supabase Auth compatibility
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id, role, affiliateStatus')
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
    const body = await req.json();
    const { action, platform, campaignId } = body;

    // Validate action
    const validActions = ['DOWNLOAD', 'VIEW', 'SHARE', 'CLICK', 'COPY'];
    if (!action || !validActions.includes(action.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid action. Must be DOWNLOAD, VIEW, SHARE, CLICK, or COPY' },
        { status: 400 }
      );
    }

    // Check if creative exists
    const { data: creativeData, error: creativeError } = await db
      .from('affiliate_creatives')
      .select('id')
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

    // Get request context for tracking
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = req.headers.get('user-agent') || undefined;

    // Track usage
    await trackCreativeUsage(id, profile.id, action.toUpperCase(), {
      platform,
      campaignId,
      ipAddress,
      userAgent,
    });

    logger.info('Creative usage tracked', {
      creativeId: id,
      affiliateId: profile.id,
      action: action.toUpperCase(),
      platform,
    });

    return NextResponse.json({ success: true, message: 'Usage tracked successfully' });
  } catch (error) {
    logger.error('Failed to track creative usage', error);
    return NextResponse.json({ error: 'Failed to track usage' }, { status: 500 });
  }
}
