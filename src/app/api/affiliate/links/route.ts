import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getOrCreateMarketingLinks } from '@/lib/services/marketing-links.service';

/**
 * GET /api/affiliate/links
 *
 * Fetches marketing links for clients (all clients are affiliates).
 * Now delegates to unified marketing-links.service for consistency.
 *
 * Clients get 2 links: lead, intake
 * Note: affiliateStatus controls commission tiers, NOT link access
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        id: true,
        role: true,
        trackingCode: true,
        customTrackingCode: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // All clients and admins can access affiliate links (all clients are affiliates)
    // Note: 'affiliate' is technically a STATUS not a ROLE, but we handle it for safety
    const isClient = profile.role === 'client' || profile.role === 'affiliate';
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
    // Override link types to only generate lead and intake for affiliates
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
      description: link.description,
      qrCodeUrl: link.qrCodeDataUrl,
      clicks: link.clicks,
      leads: link.leads,
      conversions: link.conversions,
      isActive: link.isActive,
      type: link.type,
    }));

    logger.info(`Fetched affiliate links for profile ${profile.id}`, {
      linkCount: links.length,
    });

    return NextResponse.json({
      success: true,
      links,
      trackingCode: result.trackingCode,
    });
  } catch (error) {
    logger.error('Error fetching affiliate links:', error);
    return NextResponse.json({ error: 'Failed to fetch affiliate links' }, { status: 500 });
  }
}
