/**
 * Tracking Code Redirect Handler
 *
 * Handles: taxgeniuspro.tax/ref/[code]
 *
 * Flow:
 * 1. Look up user by tracking code (TGP-123456 or custom vanity name)
 * 2. Record click tracking
 * 3. Redirect to intake form with tracking parameters
 *
 * Example:
 * User visits: taxgeniuspro.tax/ref/johnatlanta
 * Redirects to: taxgeniuspro.tax/start-filing/form?ref=johnatlanta&utm_source=referral&utm_medium=tracking-code
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildTrackingUrl } from '@/lib/utils/tracking-integration';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await params;
    const code = rawCode.trim();

    // Look up user by tracking code (could be TGP-XXXXXX or custom vanity name)
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [{ trackingCode: code }, { customTrackingCode: code }],
      },
      select: {
        id: true,
        trackingCode: true,
        customTrackingCode: true,
        role: true,
      },
    });

    // Handle not found
    if (!profile) {
      logger.warn(`Tracking code not found: ${code}`);
      return NextResponse.redirect(new URL('/?error=tracking-code-not-found', request.url));
    }

    // Get the active tracking code (custom takes precedence)
    const activeCode = profile.customTrackingCode || profile.trackingCode;

    // Record click tracking - try to find or create a MarketingLink for tracking
    // This allows us to track clicks even if auto-generated link doesn't exist yet
    try {
      const userAgent = request.headers.get('user-agent') || undefined;
      const referer = request.headers.get('referer') || undefined;
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        undefined;

      // Find the intake link for this user
      const intakeLink = await prisma.marketingLink.findFirst({
        where: {
          creatorId: profile.id,
          code: {
            contains: '-intake',
          },
        },
      });

      if (intakeLink) {
        // Create link click record
        await prisma.linkClick.create({
          data: {
            linkId: intakeLink.id,
            ipAddress: ip,
            userAgent,
            referrer: referer,
            clickedAt: new Date(),
          },
        });

        // Increment click counter
        await prisma.marketingLink.update({
          where: { id: intakeLink.id },
          data: {
            clicks: { increment: 1 },
            uniqueClicks: { increment: 1 },
          },
        });
      }
    } catch (err) {
      logger.error('Error recording tracking code click:', err);
      // Continue anyway - don't block redirect
    }

    // Build destination URL with tracking parameters
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
    const destinationUrl = buildTrackingUrl(`${baseUrl}/start-filing/form`, {
      trackingCode: activeCode,
      source: 'tracking-code',
      medium: 'referral',
      campaign: 'tracking-code-redirect',
      content: code,
    });

    // Add any additional query parameters from the request
    const url = new URL(destinationUrl);
    const searchParams = new URL(request.url).searchParams;

    searchParams.forEach((value, key) => {
      if (!url.searchParams.has(key)) {
        url.searchParams.set(key, value);
      }
    });

    return NextResponse.redirect(url.toString());
  } catch (error) {
    logger.error('Error handling tracking code redirect:', error);

    // Fallback to home page with error
    return NextResponse.redirect(new URL('/?error=redirect-failed', request.url));
  }
}

// Also handle POST for tracking purposes
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  // Redirect POST to GET
  return GET(request, { params });
}
