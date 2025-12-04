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
