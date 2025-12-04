/**
 * Short Link Redirect Handler
 *
 * Handles: taxgeniuspro.tax/go/[code]
 *
 * Flow:
 * 1. Look up MarketingLink by short code
 * 2. Increment click counter
 * 3. Redirect to destination URL with tracking parameters
 * 4. Google Analytics tracks the click on the destination page
 *
 * Example:
 * User visits: taxgeniuspro.tax/go/johnatlanta
 * Redirects to: taxgeniuspro.tax/start-filing/form?ref=TGP-123456&link=johnatlanta
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { incrementShortLinkClick } from '@/lib/services/short-link.service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await params;
    const code = rawCode.toLowerCase();

    // Look up the short link
    const link = await prisma.marketingLink.findUnique({
      where: { code },
    });

    // Handle not found
    if (!link) {
      return NextResponse.redirect(new URL('/?error=link-not-found', request.url));
    }

    // Handle inactive links
    if (!link.isActive) {
      return NextResponse.redirect(new URL('/?error=link-inactive', request.url));
    }

    // Increment click counter (async, don't wait)
    incrementShortLinkClick(code).catch((err) => {
      logger.error('Error incrementing click count:', err);
    });

    // Create link click record for analytics
    try {
      const userAgent = request.headers.get('user-agent') || undefined;
      const referer = request.headers.get('referer') || undefined;
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        undefined;

      await prisma.linkClick.create({
        data: {
          linkId: link.id,
          ipAddress: ip,
          userAgent,
          referrer: referer,
          clickedAt: new Date(),
        },
      });
    } catch (err) {
      logger.error('Error creating link click record:', err);
      // Continue anyway - don't block redirect
    }

    // Redirect to the full URL (which already has tracking parameters)
    const redirectUrl = link.url;

    // Add any additional UTM parameters from the short link request
    const url = new URL(redirectUrl);
    const searchParams = new URL(request.url).searchParams;

    // Pass through any additional query parameters
    searchParams.forEach((value, key) => {
      if (!url.searchParams.has(key)) {
        url.searchParams.set(key, value);
      }
    });

    return NextResponse.redirect(url.toString());
  } catch (error) {
    logger.error('Error handling short link redirect:', error);

    // Fallback to home page with error
    return NextResponse.redirect(new URL('/?error=redirect-failed', request.url));
  }
}

// Also handle POST for tracking purposes
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  // Redirect POST to GET
  return GET(request, { params });
}
