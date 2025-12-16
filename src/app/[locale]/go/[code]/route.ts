/**
 * Short Link Redirect Handler
 *
 * Handles: taxgeniuspro.tax/go/[code]
 *
 * Supports two types of codes:
 * 1. Marketing Links (e.g., gw-intake, gw-appt, johnatlanta)
 * 2. Client Referral Codes (7-character codes like "tsj1I53")
 *
 * Flow:
 * 1. Try to resolve as MarketingLink first
 * 2. If not found, try to resolve as ClientReferralInvitation
 * 3. Track the click
 * 4. Redirect to appropriate destination
 *
 * Examples:
 * - taxgeniuspro.tax/go/johnatlanta → marketing link redirect
 * - taxgeniuspro.tax/go/tsj1I53 → client referral link → /new/?tp=gw&cl=Natori&co=tsj1I53
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { incrementShortLinkClick } from '@/lib/services/short-link.service';
import { trackLinkClick, resolveReferralCode } from '@/lib/services/client-referral.service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await params;
    const code = rawCode.toLowerCase();

    // 1. First, try to look up as a MarketingLink
    const link = await prisma.marketingLink.findUnique({
      where: { code },
    });

    // 2. If not found as marketing link, try as client referral code
    if (!link) {
      // Client referral codes are case-sensitive and 7 characters
      const referralData = await resolveReferralCode(rawCode);

      if (referralData) {
        // Track the click
        await trackLinkClick(rawCode).catch((err) => {
          logger.error('Error tracking referral click:', err);
        });

        // Redirect to the /new/ page with referral parameters
        const newUrl = new URL('/new/', request.url);
        newUrl.searchParams.set('tp', referralData.preparerCode);
        newUrl.searchParams.set('cl', referralData.clientName);
        newUrl.searchParams.set('co', referralData.referralCode);

        logger.info('Redirecting client referral short link', {
          code: rawCode,
          preparerCode: referralData.preparerCode,
          clientName: referralData.clientName,
        });

        return NextResponse.redirect(newUrl.toString());
      }

      // Neither marketing link nor referral code found
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

    // Create link click record for analytics (including UTM parameters)
    try {
      const userAgent = request.headers.get('user-agent') || undefined;
      const referer = request.headers.get('referer') || undefined;
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        undefined;

      // Extract UTM parameters from the request URL
      const searchParams = new URL(request.url).searchParams;
      const utmSource = searchParams.get('utm_source') || undefined;
      const utmMedium = searchParams.get('utm_medium') || undefined;
      const utmCampaign = searchParams.get('utm_campaign') || undefined;
      const utmContent = searchParams.get('utm_content') || undefined;
      const utmTerm = searchParams.get('utm_term') || undefined;

      await prisma.linkClick.create({
        data: {
          linkId: link.id,
          ipAddress: ip,
          userAgent,
          referrer: referer,
          clickedAt: new Date(),
          // UTM tracking for source attribution
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
          utmTerm,
        },
      });

      logger.info('Link click recorded', {
        code,
        utmSource,
        utmMedium,
        utmCampaign,
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
