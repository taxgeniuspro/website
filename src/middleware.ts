/**
 * Lightweight Edge Runtime Middleware
 *
 * This middleware handles:
 * - i18n routing (via next-intl)
 * - UTM/ref parameter tracking cookies
 *
 * Authentication and authorization are handled at the page/API route level
 * to avoid bundling heavy dependencies (bcrypt, prisma) into Edge Runtime.
 * The Edge Function size limit is 1MB for Vercel free tier.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

// Create i18n middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: false, // Disable Accept-Language header detection - always use defaultLocale for unprefixed routes
});

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/manifest.json') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // ==================================================================================
  // URL CONSOLIDATION REDIRECTS (Dec 2025)
  //
  // IMPORTANT: Only redirect routes that have been consolidated or moved.
  // Affiliate dashboard pages (/dashboard/affiliate/*) are KEPT as-is because:
  // - They are the canonical pages for affiliate features
  // - Clients with affiliateStatus='APPROVED' use these pages
  // - The pages exist and work correctly
  //
  // Tracking routes are consolidated into /dashboard/referrals
  // Store routes redirect to professional email settings
  // ==================================================================================
  const urlRedirectMap: Record<string, string> = {
    // Tracking → Unified Referrals page
    '/dashboard/affiliate/tracking': '/dashboard/referrals',
    '/dashboard/tax-preparer/tracking': '/dashboard/referrals',
    '/dashboard/client/tracking': '/dashboard/referrals',
    // Store → Professional Email settings (store has been removed)
    '/store': '/dashboard/tax-preparer/settings/professional-email',
    '/store/professional-email': '/dashboard/tax-preparer/settings/professional-email',
  };

  // Check for locale prefix in pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  let pathnameWithoutLocale = pathname;
  let localePrefix = '';
  if (pathnameHasLocale) {
    const segments = pathname.split('/');
    localePrefix = `/${segments[1]}`;
    pathnameWithoutLocale = '/' + segments.slice(2).join('/');
  }

  // Check if this route needs to be redirected
  const redirectPath = urlRedirectMap[pathnameWithoutLocale];
  if (redirectPath) {
    const newUrl = req.nextUrl.clone();
    newUrl.pathname = pathnameHasLocale ? `${localePrefix}${redirectPath}` : redirectPath;
    return NextResponse.redirect(newUrl, { status: 301 }); // Permanent redirect
  }

  // Apply i18n middleware to handle locale routing
  const intlResponse = intlMiddleware(req);

  // If intl middleware returns a redirect, return it immediately
  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse;
  }

  // Handle UTM tracking via cookies (lightweight - no DB queries)
  const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const hasUtmParams = utmParams.some((param) => req.nextUrl.searchParams.has(param));

  if (hasUtmParams) {
    const utmData: Record<string, string> = {};
    utmParams.forEach((param) => {
      const value = req.nextUrl.searchParams.get(param);
      if (value) {
        utmData[param] = value;
      }
    });

    intlResponse.cookies.set('__tgp_utm', JSON.stringify(utmData), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
  }

  // Capture ref parameter for referral tracking
  const refParam = req.nextUrl.searchParams.get('ref');
  if (refParam) {
    intlResponse.cookies.set('__tgp_ref', refParam, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60, // 14 days
      path: '/',
    });
  }

  // Handle booking redirect: ?book=true
  if (req.nextUrl.searchParams.get('book') === 'true') {
    const pathnameHasLocale = locales.some(
      (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    let pathnameWithoutLocale = pathname;
    if (pathnameHasLocale) {
      const segments = pathname.split('/');
      pathnameWithoutLocale = '/' + segments.slice(2).join('/');
    }

    const username = pathnameWithoutLocale.slice(1);
    if (username && !username.includes('/') && username !== '') {
      const bookingUrl = req.nextUrl.clone();
      bookingUrl.pathname = '/book';
      bookingUrl.searchParams.set('ref', username);
      return NextResponse.redirect(bookingUrl);
    }
  }

  return intlResponse;
}

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and PWA files
    '/((?!_next|sw\\.js|manifest\\.json|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
