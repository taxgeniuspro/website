import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserPermissions, UserRole, UserPermissions, Permission } from '@/lib/permissions';
import { utmTrackingMiddleware } from '@/middleware/utm-tracking';
import { refTrackingMiddleware } from '@/middleware/ref-tracking';
import {
  attributionTrackingMiddleware,
  isShortLinkRequest,
} from '@/middleware/attribution-tracking';
import { getEffectiveRole } from '@/lib/utils/role-switcher';
import { logger } from '@/lib/logger';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

// Create i18n middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

const isPublicRoute = (pathname: string): boolean => {
  const publicRoutes = [
    // ===== Authentication Routes =====
    '/auth/signin',
    '/auth/signup',
    '/auth/signout',
    '/auth/error',
    '/auth/test-login', // Test authentication page (development only)
    '/api/auth/test-login', // Test authentication API (development only)
    '/clear-session', // Clear cookies and break redirect loops

    // ===== Marketing & Info Pages =====
    '/',
    '/about',
    '/services',
    '/contact',
    '/testimonials', // Customer testimonials
    '/forbidden', // Error page (users get redirected here)

    // ===== Service Pages =====
    '/personal-tax-filing', // Personal tax services page
    '/business-tax', // Business tax services page
    '/tax-planning', // Tax planning & advisory page
    '/audit-protection', // Audit protection page
    '/irs-resolution', // IRS resolution services page

    // ===== Tools & Utilities =====
    '/tax-calculator', // Interactive tax calculator
    '/calculator', // Calculator page
    '/find-a-refund', // Public refund tracker utility
    '/refund-advance', // Refund advance information page
    '/tax-guide', // 2024 tax guide page
    '/guide', // Guide page
    '/blog', // Tax blog & tips page
    '/help', // Help center page
    '/support', // Support page

    // ===== Forms & Applications =====
    '/start-filing', // Customer lead generation page
    '/book', // Direct booking page (no login required)
    '/book-appointment', // Appointment booking - NO LOGIN REQUIRED
    '/apply', // General application page
    '/join-team', // Tax preparer recruitment landing page (PUBLIC)
    '/careers', // Careers/recruitment landing pages (PUBLIC)
    '/training', // Tax preparation training course page (PUBLIC)
    '/home-preview', // Consumer homepage preview (PUBLIC)
    '/preparer', // Tax preparer pages (application, info)
    '/referral', // Referral pages (signup, info)
    '/affiliate', // Affiliate pages (application, info)
    '/refer', // Refer page
    '/upload-documents', // Document upload page

    // ===== Legal & Compliance =====
    '/terms', // Terms of service
    '/privacy', // Privacy policy
    '/security', // Security information
    '/accessibility', // Accessibility statement

    // ===== Dynamic Routes =====
    '/locations', // Location pages
    '/wordpress-landing', // WordPress landing page

    // ===== Short Links (Epic 6) =====
    '/lead', // Short link for lead generation
    '/intake', // Short link for tax intake
    '/go', // Short link redirects

    // ===== PWA & Static Files =====
    '/sw.js', // Service worker (PWA)
    '/manifest.json', // Web app manifest (PWA)

    // ===== SEO & Crawlers =====
    '/robots.txt', // Robots.txt for search engines
    '/sitemap.xml', // XML sitemap for search engines
    '/sitemap', // Sitemap routes

    // ===== Debug/Development =====
    '/debug-role', // Debug page to check user role
  ];

  // Check if pathname starts with any public route
  return publicRoutes.some((route) => {
    if (route.endsWith('(.*)') || route.endsWith('/(.*)')) {
      const baseRoute = route.replace(/\(\.\*\)|\(\*\)/g, '');
      return pathname.startsWith(baseRoute);
    }
    return pathname === route || pathname.startsWith(route + '/');
  });
};

const isPublicApiRoute = (pathname: string): boolean => {
  const publicApiRoutes = [
    '/api/auth', // NextAuth routes
    '/api/applications',
    '/api/tax-intake',
    '/api/contact',
    '/api/appointments',
    '/api/preparers',
    '/api/referrals', // All referral endpoints (signup, resolve, etc.)
    '/api/leads', // All lead submission endpoints (preparer, affiliate, customer)
    '/api/journey',
    '/api/analytics/attribution',
    '/api/webhooks',
    '/api/admin/set-role',
    '/api/preparer/info',
    '/api/uploads/marketing-assets', // Marketing assets (profile photos, logos) - public for use on business cards, flyers
  ];

  return publicApiRoutes.some((route) => pathname.startsWith(route));
};

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // ============================================================================
  // PHASE 1: BYPASS - Skip middleware for routes that don't need i18n or auth
  // ============================================================================

  // Skip middleware entirely for API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/manifest.json') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Skip auth for test endpoints in development
  if (
    process.env.NODE_ENV === 'development' &&
    (pathname.startsWith('/api/auth/test-login') || pathname === '/auth/test-login')
  ) {
    return NextResponse.next();
  }

  // ============================================================================
  // PHASE 2: I18N - Apply next-intl middleware FIRST for locale routing
  // ============================================================================

  // Apply i18n middleware to handle locale routing
  // This ensures /en and /es routes are properly recognized
  const intlResponse = intlMiddleware(req);

  // If intl middleware returns a redirect (e.g., / -> /en), return it immediately
  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse;
  }

  // ============================================================================
  // PHASE 3: PATH NORMALIZATION - Extract locale for custom middleware logic
  // ============================================================================

  // Check if path includes locale prefix
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Extract pathname without locale for route matching
  let pathnameWithoutLocale = pathname;
  if (pathnameHasLocale) {
    // Remove locale prefix (e.g., /en/dashboard -> /dashboard)
    const segments = pathname.split('/');
    pathnameWithoutLocale = '/' + segments.slice(2).join('/');
    if (!pathnameWithoutLocale || pathnameWithoutLocale === '/') {
      pathnameWithoutLocale = '/';
    }
  }

  // ============================================================================
  // PHASE 4: TRACKING & ATTRIBUTION - Handle analytics and referral tracking
  // ============================================================================

  // EPIC 6: Check for attribution short links FIRST (before auth)
  // This must run before any auth checks so public links work
  if (isShortLinkRequest(pathnameWithoutLocale)) {
    const attributionResponse = await attributionTrackingMiddleware(req);
    if (attributionResponse) {
      return attributionResponse; // Returns redirect with attribution cookie
    }
  }

  // BOOKING REDIRECT: Handle ?book=true parameter on referral links
  // Example: taxgeniuspro.tax/username?book=true → /book?ref=username
  if (req.nextUrl.searchParams.get('book') === 'true') {
    // Extract username from path (e.g., /irawatkins → irawatkins)
    const username = pathnameWithoutLocale.slice(1); // Remove leading slash

    // Only redirect if it looks like a username (single path segment, no slashes)
    if (username && !username.includes('/') && username !== '') {
      const bookingUrl = req.nextUrl.clone();
      bookingUrl.pathname = '/book';
      bookingUrl.searchParams.set('ref', username);

      logger.info('[Booking Redirect] Redirecting to booking page', {
        username,
        from: pathname,
        to: bookingUrl.pathname,
      });

      return NextResponse.redirect(bookingUrl);
    }
  }

  // Run UTM tracking middleware (Epic 6) - captures UTM parameters to cookies
  let trackingResponse = utmTrackingMiddleware(req);

  // Run ref parameter tracking middleware (capture ?ref=code)
  trackingResponse = await refTrackingMiddleware(req, trackingResponse);

  // ============================================================================
  // PHASE 5: AUTHENTICATION & AUTHORIZATION - Check user access and permissions
  // ============================================================================

  // Get session using NextAuth v5
  const session = await auth();
  const userId = session?.user?.id;

  // If user is not signed in and trying to access protected route, redirect to signin
  if (!userId && !isPublicRoute(pathnameWithoutLocale) && !isPublicApiRoute(pathnameWithoutLocale)) {
    const signInUrl = req.nextUrl.clone();
    signInUrl.pathname = '/auth/signin';
    // Use pathname + search instead of full URL to avoid capturing 0.0.0.0 or localhost
    const callbackUrl = pathname + req.nextUrl.search;
    signInUrl.searchParams.set('callbackUrl', callbackUrl);
    return NextResponse.redirect(signInUrl);
  }

  // If user is signed in
  if (userId && session?.user) {
    const validRoles: string[] = [
      'super_admin',
      'admin',
      'lead',
      'client',
      'tax_preparer',
      'affiliate',
    ];

    // Get role from session
    let role = session.user.role as string;

    const isValidRole = role && validRoles.includes(role);

    // Get effective role (checks if admin is viewing as another role)
    let effectiveRole = role;
    let isViewingAsOtherRole = false;
    let viewingRoleName: string | undefined;

    if (isValidRole && (role === 'super_admin' || role === 'admin')) {
      try {
        const roleInfo = await getEffectiveRole(role as UserRole, userId);
        effectiveRole = roleInfo.effectiveRole;
        isViewingAsOtherRole = roleInfo.isViewingAsOtherRole;
        viewingRoleName = roleInfo.viewingRoleName;

        if (isViewingAsOtherRole) {
          logger.info(`👁️  Admin ${userId} viewing as ${viewingRoleName} (${effectiveRole})`);
        }
      } catch (error) {
        logger.error('Error getting effective role:', error);
        // Fall back to actual role if there's an error
        effectiveRole = role;
      }
    }

    // Special bypass for /setup-admin - only accessible by support@taxgeniuspro.tax
    if (pathnameWithoutLocale === '/setup-admin') {
      const userEmail = session.user.email;

      if (userEmail === 'support@taxgeniuspro.tax') {
        // Merge tracking cookies and return i18n response
        trackingResponse.cookies.getAll().forEach((cookie) => {
          intlResponse.cookies.set(cookie.name, cookie.value, cookie);
        });
        return intlResponse;
      }

      const forbiddenUrl = req.nextUrl.clone();
      forbiddenUrl.pathname = '/forbidden';
      return NextResponse.redirect(forbiddenUrl);
    }

    // Restrict /admin routes with granular permission checks
    if (pathnameWithoutLocale.startsWith('/admin') || pathnameWithoutLocale.startsWith('/dashboard/admin')) {
      // Define which /admin routes tax_preparers can access (still requires permissions)
      const taxPreparerAllowedAdminRoutes = [
        '/admin/calendar',
        '/admin/file-center',
        '/admin/tax-forms',
      ];

      // Check role-based access
      if (role === 'tax_preparer') {
        // Tax preparers can only access specific admin routes
        const isAllowedRoute = taxPreparerAllowedAdminRoutes.some((route) =>
          pathnameWithoutLocale.startsWith(route)
        );
        if (!isAllowedRoute) {
          const forbiddenUrl = req.nextUrl.clone();
          forbiddenUrl.pathname = '/forbidden';
          return NextResponse.redirect(forbiddenUrl);
        }
        // Continue to permission checks below for allowed routes
      } else if (role !== 'admin' && role !== 'super_admin') {
        // Block all other non-admin roles from /admin routes
        const forbiddenUrl = req.nextUrl.clone();
        forbiddenUrl.pathname = '/forbidden';
        return NextResponse.redirect(forbiddenUrl);
      }

      // SUPER ADMIN ONLY routes - extra protection for sensitive pages
      const superAdminOnlyRoutes = ['/admin/permissions', '/admin/database'];
      if (superAdminOnlyRoutes.some((route) => pathnameWithoutLocale.startsWith(route))) {
        if (role !== 'super_admin') {
          const forbiddenUrl = req.nextUrl.clone();
          forbiddenUrl.pathname = '/forbidden';
          return NextResponse.redirect(forbiddenUrl);
        }
      }

      // Get user permissions for granular checks using EFFECTIVE role
      // Note: We use role-based permissions here (no DB query) since middleware runs on Edge Runtime
      // Custom permissions from database are checked at the page/API route level
      try {
        // Use effectiveRole for permission checks (what user sees)
        // Pass undefined for customPermissions since we can't query DB in Edge Runtime
        const permissions = getUserPermissions(effectiveRole as UserRole, undefined);

        // Define route to permission mappings
        const routePermissions: Record<string, Permission> = {
          '/admin/users': 'users',
          '/admin/payouts': 'payouts',
          '/admin/earnings': 'earnings',
          '/admin/content-generator': 'contentGenerator',
          '/admin/database': 'database',
          '/admin/analytics': 'analytics',
        };

        // Check if current path requires a specific permission
        for (const [route, permission] of Object.entries(routePermissions)) {
          if (pathnameWithoutLocale.startsWith(route)) {
            if (!permissions[permission]) {
              const forbiddenUrl = req.nextUrl.clone();
              forbiddenUrl.pathname = '/forbidden';
              return NextResponse.redirect(forbiddenUrl);
            }
            break;
          }
        }
      } catch (error) {
        logger.error('Error checking permissions in middleware:', error);
      }
    }

    // Restrict /store access to tax_preparer, affiliate, admin, and super_admin only
    // Use effectiveRole so admins can preview store as other roles
    if (pathnameWithoutLocale.startsWith('/store')) {
      if (
        !effectiveRole ||
        (effectiveRole !== 'tax_preparer' &&
          effectiveRole !== 'affiliate' &&
          effectiveRole !== 'admin' &&
          effectiveRole !== 'super_admin')
      ) {
        const forbiddenUrl = req.nextUrl.clone();
        forbiddenUrl.pathname = '/forbidden';
        return NextResponse.redirect(forbiddenUrl);
      }
    }

    // Restrict /app/academy access to tax_preparer, admin, and super_admin only
    // Use effectiveRole so admins can preview academy as other roles
    if (pathnameWithoutLocale.startsWith('/app/academy')) {
      if (
        !effectiveRole ||
        (effectiveRole !== 'tax_preparer' &&
          effectiveRole !== 'admin' &&
          effectiveRole !== 'super_admin')
      ) {
        const forbiddenUrl = req.nextUrl.clone();
        forbiddenUrl.pathname = '/forbidden';
        return NextResponse.redirect(forbiddenUrl);
      }
    }

    if (!isValidRole) {
      // If trying to access admin routes without admin role, block immediately
      if (pathnameWithoutLocale.startsWith('/admin') || pathnameWithoutLocale.startsWith('/dashboard/admin')) {
        const forbiddenUrl = req.nextUrl.clone();
        forbiddenUrl.pathname = '/forbidden';
        return NextResponse.redirect(forbiddenUrl);
      }

      // If trying to access debug page, allow it without auto-assignment
      if (pathnameWithoutLocale === '/debug-role') {
        trackingResponse.cookies.getAll().forEach((cookie) => {
          intlResponse.cookies.set(cookie.name, cookie.value, cookie);
        });
        return intlResponse;
      }

      // Allow users without roles to access setup-admin page
      if (pathnameWithoutLocale === '/setup-admin') {
        trackingResponse.cookies.getAll().forEach((cookie) => {
          intlResponse.cookies.set(cookie.name, cookie.value, cookie);
        });
        return intlResponse;
      }

      // For users without a valid role, redirect to dashboard
      // Dashboard page will handle role-based redirect
      logger.info(`⚠️  User ${userId} has no valid role, redirecting to dashboard`);

      // If they're on a public route, let them through
      if (isPublicRoute(pathnameWithoutLocale)) {
        trackingResponse.cookies.getAll().forEach((cookie) => {
          intlResponse.cookies.set(cookie.name, cookie.value, cookie);
        });
        return intlResponse;
      }

      // If already on dashboard or select-role page, let them through to avoid loops
      if (pathnameWithoutLocale === '/dashboard' || pathnameWithoutLocale === '/auth/select-role') {
        trackingResponse.cookies.getAll().forEach((cookie) => {
          intlResponse.cookies.set(cookie.name, cookie.value, cookie);
        });
        return intlResponse;
      }

      // Otherwise redirect to dashboard - it will handle role setup
      const dashboardUrl = req.nextUrl.clone();
      dashboardUrl.pathname = '/dashboard';
      return NextResponse.redirect(dashboardUrl);
    }

    // If user has a role and tries to access /dashboard, redirect to role-specific dashboard
    // Use effectiveRole so admins viewing as another role get redirected to that role's dashboard
    if (isValidRole && pathnameWithoutLocale === '/dashboard') {
      const dashboardUrls: Record<string, string> = {
        super_admin: '/dashboard/admin',
        admin: '/dashboard/admin',
        lead: '/dashboard/lead',
        client: '/dashboard/client',
        tax_preparer: '/dashboard/tax-preparer',
        affiliate: '/dashboard/affiliate',
      };
      const targetPath = dashboardUrls[effectiveRole || role || 'lead'] || '/dashboard/lead';

      // Clone the URL and change pathname to avoid host capture
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = targetPath;
      const redirect = NextResponse.redirect(redirectUrl);

      // Copy tracking cookies to redirect response
      trackingResponse.cookies.getAll().forEach((cookie) => {
        redirect.cookies.set(cookie.name, cookie.value, cookie);
      });
      return redirect;
    }
  }

  // ============================================================================
  // PHASE 6: RESPONSE - Merge tracking cookies into i18n response
  // ============================================================================

  // Merge tracking cookies from previous middlewares into the i18n response
  // This preserves both i18n locale handling AND tracking cookies
  trackingResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie);
  });

  // Return response with all tracking cookies and i18n handling
  return intlResponse;
}

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and PWA files
    '/((?!_next|sw\\.js|manifest\\.json|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
