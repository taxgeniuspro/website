import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getTaxPreparerLinks } from '@/lib/services/tax-preparer-links.service';

/**
 * GET /api/tax-preparer/links
 * Fetches the two standard tax preparer links with QR codes
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

    // Check if user is tax preparer
    const isTaxPreparer = profile.role === 'tax_preparer';
    const isAdmin = profile.role === 'admin' || profile.role === 'super_admin';

    if (!isTaxPreparer && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only tax preparers can access this endpoint' },
        { status: 403 }
      );
    }

    // If tracking code not finalized, return empty
    if (!profile.trackingCodeFinalized) {
      return NextResponse.json({
        success: true,
        links: [],
        message: 'Tracking code must be finalized before tax preparer links are available',
      });
    }

    // Get tax preparer links
    const preparerLinks = await getTaxPreparerLinks(profile.id);

    if (!preparerLinks) {
      return NextResponse.json({
        success: true,
        links: [],
        message: 'No tax preparer links found. They should be generated automatically.',
      });
    }

    // Transform to component-friendly format
    const links = [
      {
        id: preparerLinks.leadLink.id,
        shortCode: preparerLinks.leadLink.code,
        shortUrl: preparerLinks.leadLink.shortUrl,
        fullUrl: preparerLinks.leadLink.url,
        destination: '/contact',
        title: preparerLinks.leadLink.title,
        description: 'Quick contact form for potential clients to submit their information',
        qrCodeUrl: preparerLinks.leadLink.qrCodeDataUrl,
        clicks: 0, // Will be populated from analytics
        leads: 0,
        conversions: 0,
        isActive: true,
        type: 'lead',
      },
      {
        id: preparerLinks.intakeLink.id,
        shortCode: preparerLinks.intakeLink.code,
        shortUrl: preparerLinks.intakeLink.shortUrl,
        fullUrl: preparerLinks.intakeLink.url,
        destination: '/start-filing/form',
        title: preparerLinks.intakeLink.title,
        description: 'Complete tax intake form for clients ready to start their tax preparation',
        qrCodeUrl: preparerLinks.intakeLink.qrCodeDataUrl,
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

    logger.info(`📋 Fetched tax preparer links for profile ${profile.id}`);

    return NextResponse.json({
      success: true,
      links: linksWithAnalytics,
    });
  } catch (error) {
    logger.error('Error fetching tax preparer links:', error);
    return NextResponse.json({ error: 'Failed to fetch tax preparer links' }, { status: 500 });
  }
}
