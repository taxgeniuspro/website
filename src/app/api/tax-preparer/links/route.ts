import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getOrCreateMarketingLinks } from '@/lib/services/marketing-links.service';

// Local type definitions
interface Profile {
  id: string;
  role: string;
  trackingCode: string | null;
  customTrackingCode: string | null;
  trackingCodeFinalized: boolean;
}

interface MarketingLink {
  id: string;
  code: string;
  shortUrl: string;
  url: string;
  targetPage: string;
  title: string;
  description: string | null;
  qrCodeDataUrl: string | null;
  clicks: number;
  leads: number;
  conversions: number;
  isActive: boolean;
  type: string;
}

/**
 * GET /api/tax-preparer/links
 *
 * Fetches marketing links for tax preparers.
 * Now delegates to unified marketing-links.service for consistency.
 *
 * Tax preparers get 4 links: lead, intake, appt, advance
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id, role, trackingCode, customTrackingCode, trackingCodeFinalized')
      .eq('userId', userId)
      .limit(1);

    const profile = firstOrNull(profiles) as Profile | null;

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user is tax preparer or admin
    const isTaxPreparer = profile.role === 'tax_preparer';
    const isAdmin = profile.role === 'admin';

    if (!isTaxPreparer && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only tax preparers can access this endpoint' },
        { status: 403 }
      );
    }

    // Use unified service to get or create links
    const result = await getOrCreateMarketingLinks(profile.id);

    if (!result.success) {
      return NextResponse.json({
        success: true,
        links: [],
        message: result.message,
      });
    }

    // Transform to backward-compatible format
    const links = result.links.map((link: MarketingLink) => ({
      id: link.id,
      shortCode: link.code,
      shortUrl: link.shortUrl,
      fullUrl: link.url,
      destination: link.targetPage,
      title: link.title,
      description: link.description,
      qrCodeUrl: link.qrCodeDataUrl,
      clicks: link.clicks,
      leads: link.leads,
      conversions: link.conversions,
      isActive: link.isActive,
      type: link.type,
    }));

    logger.info(`Fetched tax preparer links for profile ${profile.id}`, {
      linkCount: links.length,
    });

    return NextResponse.json({
      success: true,
      links,
      trackingCode: result.trackingCode,
    });
  } catch (error) {
    logger.error('Error fetching tax preparer links:', error);
    return NextResponse.json({ error: 'Failed to fetch tax preparer links' }, { status: 500 });
  }
}
