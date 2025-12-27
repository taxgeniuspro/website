/**
 * Lightweight Edge Runtime Middleware
 *
 * This middleware handles:
 * - Supabase session refresh
 * - i18n routing (via next-intl)
 * - UTM/ref parameter tracking cookies
 * - Protected route redirects
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
import { updateSession } from '@/lib/supabase/middleware';

// Create i18n middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: false,
});

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/admin',
  '/crm',
];

// Check if path matches protected routes
function isProtectedRoute(pathname: string): boolean {
  // Remove locale prefix if present
  const pathWithoutLocale = pathname.replace(/^\/(en|es)/, '') || '/';
  return protectedRoutes.some(route => pathWithoutLocale.startsWith(route));
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Skip middleware for API routes, auth callbacks, static files, mockups, and Next.js internals
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/mockups/') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/manifest.json') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Update Supabase session (refresh tokens if needed)
  const { supabaseResponse, user } = await updateSession(req);

  // Check protected routes
  if (isProtectedRoute(pathname) && !user) {
    // Redirect to sign in
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // ==================================================================================
  // URL CONSOLIDATION REDIRECTS
  // ==================================================================================
  const urlRedirectMap: Record<string, string> = {
    '/dashboard/affiliate/tracking': '/dashboard/referrals',
    '/dashboard/tax-preparer/tracking': '/dashboard/referrals',
    '/dashboard/client/tracking': '/dashboard/referrals',
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
    return NextResponse.redirect(newUrl, { status: 301 });
  }

  // Apply i18n middleware to handle locale routing
  const intlResponse = intlMiddleware(req);

  // If intl middleware returns a redirect, return it immediately
  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse;
  }

  // Merge cookies from Supabase session refresh into the response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value, {
      ...cookie,
    });
  });

  // Handle UTM tracking via cookies
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
      maxAge: 30 * 24 * 60 * 60,
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
      maxAge: 14 * 24 * 60 * 60,
      path: '/',
    });
  }

  // Handle booking redirect: ?book=true
  if (req.nextUrl.searchParams.get('book') === 'true') {
    const pathHasLocale = locales.some(
      (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    let pathWithoutLocale = pathname;
    if (pathHasLocale) {
      const segments = pathname.split('/');
      pathWithoutLocale = '/' + segments.slice(2).join('/');
    }

    const username = pathWithoutLocale.slice(1);
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
    '/((?!_next|mockups|sw\\.js|manifest\\.json|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
