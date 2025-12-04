import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getAffiliateLinks } from '@/lib/services/affiliate-links.service';

/**
 * GET /api/affiliate/links
 * Fetches the two standard affiliate links with QR codes
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
        trackingCodeFinalized: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user is affiliate
    const isAffiliate = profile.role === 'affiliate';
    const isAdmin = profile.role === 'admin' || profile.role === 'super_admin';

    if (!isAffiliate && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only affiliates can access this endpoint' },
        { status: 403 }
      );
    }

    // If tracking code not finalized, return empty
    if (!profile.trackingCodeFinalized) {
      return NextResponse.json({
        success: true,
        links: [],
        message: 'Tracking code must be finalized before affiliate links are available',
      });
    }

    // Get affiliate links
    const affiliateLinks = await getAffiliateLinks(profile.id);

    if (!affiliateLinks) {
      return NextResponse.json({
        success: true,
        links: [],
        message: 'No affiliate links found. They should be generated automatically.',
      });
    }

    // Transform to component-friendly format
    const links = [
      {
        id: affiliateLinks.leadLink.id,
        shortCode: affiliateLinks.leadLink.code,
        shortUrl: affiliateLinks.leadLink.shortUrl,
        fullUrl: affiliateLinks.leadLink.url,
        destination: '/contact',
        title: affiliateLinks.leadLink.title,
        description: 'Quick contact form for potential clients to submit their information',
        qrCodeUrl: affiliateLinks.leadLink.qrCodeDataUrl,
        clicks: 0, // Will be populated from analytics
        leads: 0,
        conversions: 0,
        isActive: true,
        type: 'lead',
      },
      {
        id: affiliateLinks.intakeLink.id,
        shortCode: affiliateLinks.intakeLink.code,
        shortUrl: affiliateLinks.intakeLink.shortUrl,
        fullUrl: affiliateLinks.intakeLink.url,
        destination: '/start-filing/form',
        title: affiliateLinks.intakeLink.title,
        description: 'Complete tax intake form for clients ready to start their tax preparation',
        qrCodeUrl: affiliateLinks.intakeLink.qrCodeDataUrl,
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

    logger.info(`📋 Fetched affiliate links for profile ${profile.id}`);

    return NextResponse.json({
      success: true,
      links: linksWithAnalytics,
    });
  } catch (error) {
    logger.error('Error fetching affiliate links:', error);
    return NextResponse.json({ error: 'Failed to fetch affiliate links' }, { status: 500 });
  }
}
