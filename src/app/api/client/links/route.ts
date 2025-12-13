import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getOrCreateClientLinks } from '@/lib/services/client-links.service';

/**
 * GET /api/client/links
 * Fetches or auto-generates the two standard client referral links with QR codes.
 * Unlike affiliates, clients don't need to finalize their tracking code -
 * links are generated automatically on first access.
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

    // Clients can access this endpoint
    const isClient = profile.role === 'client';
    const isAdmin = profile.role === 'admin' || profile.role === 'super_admin';

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

    // Get or create client links (auto-generates if they don't exist)
    const clientLinks = await getOrCreateClientLinks(profile.id);

    // Transform to component-friendly format
    const links = [
      {
        id: clientLinks.leadLink.id,
        shortCode: clientLinks.leadLink.code,
        shortUrl: clientLinks.leadLink.shortUrl,
        fullUrl: clientLinks.leadLink.url,
        destination: '/contact',
        title: clientLinks.leadLink.title,
        description: 'Share this link with friends to earn referral bonuses',
        qrCodeUrl: clientLinks.leadLink.qrCodeDataUrl,
        clicks: 0, // Will be populated from analytics
        leads: 0,
        conversions: 0,
        isActive: true,
        type: 'lead',
      },
      {
        id: clientLinks.intakeLink.id,
        shortCode: clientLinks.intakeLink.code,
        shortUrl: clientLinks.intakeLink.shortUrl,
        fullUrl: clientLinks.intakeLink.url,
        destination: '/start-filing/form',
        title: clientLinks.intakeLink.title,
        description: 'Share this link with friends who are ready to start their taxes',
        qrCodeUrl: clientLinks.intakeLink.qrCodeDataUrl,
        clicks: 0, // Will be populated from analytics
        leads: 0,
        conversions: 0,
        isActive: true,
        type: 'intake',
      },
    ];

    // Fetch analytics for each link
    const linkIds = links.map((l) => l.id);
    const marketingLinks = await prisma.marketingLink.findMany({
      where: { id: { in: linkIds } },
      select: {
        id: true,
        clicks: true,
        uniqueClicks: true,
        intakeStarts: true,
        intakeCompletes: true,
        conversions: true,
      },
    });

    // Merge analytics into links
    const linksWithAnalytics = links.map((link) => {
      const analytics = marketingLinks.find((ml) => ml.id === link.id);
      if (analytics) {
        return {
          ...link,
          clicks: analytics.clicks || 0,
          leads: analytics.intakeStarts || 0,
          conversions: analytics.conversions || 0,
        };
      }
      return link;
    });

    logger.info(`📋 Fetched client referral links for profile ${profile.id}`);

    return NextResponse.json({
      success: true,
      links: linksWithAnalytics,
    });
  } catch (error) {
    logger.error('Error fetching client links:', error);
    return NextResponse.json({ error: 'Failed to fetch client links' }, { status: 500 });
  }
}
