'use client';

/**
 * Google Analytics 4 Script Component
 *
 * Loads GA4 tracking script and initializes tracking
 * Should be placed in root layout
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 7
 */

import Script from 'next/script';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { GA4_MEASUREMENT_ID, initGA4, trackPageView } from '@/lib/analytics/ga4';

export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA4_MEASUREMENT_ID) return;

    // Initialize GA4 on mount
    const referrerUsername = searchParams?.get('ref') || searchParams?.get('referrer');
    initGA4(referrerUsername || undefined);
  }, [searchParams]);

  useEffect(() => {
    if (!GA4_MEASUREMENT_ID || !pathname) return;

    // Track page views on route changes
    const referrerUsername = searchParams?.get('ref') || searchParams?.get('referrer');
    trackPageView(pathname, referrerUsername || undefined);
  }, [pathname, searchParams]);

  // Don't render scripts if GA4 is not configured
  if (!GA4_MEASUREMENT_ID) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA4_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
              send_page_view: false
            });
          `,
        }}
      />
    </>
  );
}
