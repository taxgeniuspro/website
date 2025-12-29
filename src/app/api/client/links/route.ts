import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getOrCreateMarketingLinks } from '@/lib/services/marketing-links.service';

// TypeScript interfaces for Supabase data
interface Profile {
  id: string;
  role: string;
  trackingCode: string | null;
  customTrackingCode: string | null;
}

/**
 * GET /api/client/links
 *
 * Fetches or auto-generates client referral links with QR codes.
 * Now delegates to unified marketing-links.service for consistency.
 *
 * Clients get 2 links: lead, intake
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's profile - use OR conditions for Supabase Auth compatibility
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id, role, tracking_code, custom_tracking_code')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (profileError) {
      logger.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const profile = firstOrNull<Profile>(profileData);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Clients and admins can access this endpoint
    const isClient = profile.role === 'client';
    const isAdmin = profile.role === 'admin';

    if (!isClient && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only clients can access this endpoint' },
        { status: 403 }
      );
    }

    // Check if profile has a tracking code
    const trackingCode = profile.customTrackingCode || profile.trackingCode;
    if (!trackingCode) {
      return NextResponse.json({
        success: true,
        links: [],
        message: 'No tracking code assigned yet. Please contact support.',
      });
    }

    // Use unified service to get or create links
    // Override link types to only generate lead and intake for clients
    const result = await getOrCreateMarketingLinks(profile.id, {
      linkTypes: ['lead', 'intake'],
    });

    if (!result.success) {
      return NextResponse.json({
        success: true,
        links: [],
        message: result.message,
      });
    }

    // Transform to backward-compatible format
    const links = result.links.map((link) => ({
      id: link.id,
      shortCode: link.code,
      shortUrl: link.shortUrl,
      fullUrl: link.url,
      destination: link.targetPage,
      title: link.title,
      description:
        link.type === 'lead'
          ? 'Share this link with friends to earn referral bonuses'
          : 'Share this link with friends who are ready to start their taxes',
      qrCodeUrl: link.qrCodeDataUrl,
      clicks: link.clicks,
      leads: link.leads,
      conversions: link.conversions,
      isActive: link.isActive,
      type: link.type,
    }));

    logger.info(`Fetched client referral links for profile ${profile.id}`, {
      linkCount: links.length,
    });

    return NextResponse.json({
      success: true,
      links,
      trackingCode: result.trackingCode,
    });
  } catch (error) {
    logger.error('Error fetching client links:', error);
    return NextResponse.json({ error: 'Failed to fetch client links' }, { status: 500 });
  }
}
