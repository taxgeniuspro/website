'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Google Analytics 4 Integration Component
 *
 * Enhanced with Universal Tracking Code support:
 * - Custom dimensions for tracking codes
 * - Event tracking for referrals and conversions
 * - User-level tracking attribution
 * - Conditional loading (skips dashboard pages for performance)
 */

export interface GoogleAnalyticsProps {
  userId?: string;
  trackingCode?: string;
}

export function GoogleAnalytics({ userId, trackingCode }: GoogleAnalyticsProps = {}) {
  const pathname = usePathname();
  const [shouldLoad, setShouldLoad] = useState(false);
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    // Don't load GA on dashboard pages for better performance
    const isDashboard = pathname?.startsWith('/dashboard') ||
                        pathname?.includes('/dashboard') ||
                        pathname?.startsWith('/en/dashboard') ||
                        pathname?.startsWith('/es/dashboard');
    setShouldLoad(!isDashboard);
  }, [pathname]);

  // Only load GA if measurement ID is configured and not on dashboard
  if (!measurementId || !shouldLoad) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            page_path: window.location.pathname,
            send_page_view: true,
            ${userId ? `user_id: '${userId}',` : ''}
            ${trackingCode ? `tracking_code: '${trackingCode}',` : ''}
            ${trackingCode ? `custom_map: { 'dimension1': 'tracking_code' }` : ''}
          });

          // === Custom Event Tracking Functions ===

          // Track when someone clicks a referral/tracking link
          window.trackReferralClick = function(trackingCode, materialType) {
            gtag('event', 'referral_click', {
              event_category: 'engagement',
              event_label: trackingCode,
              tracking_code: trackingCode,
              material_type: materialType || 'unknown',
              timestamp: new Date().toISOString()
            });
          };

          // Track when someone scans a QR code
          window.trackQRScan = function(trackingCode, location) {
            gtag('event', 'qr_code_scan', {
              event_category: 'engagement',
              event_label: trackingCode,
              tracking_code: trackingCode,
              location: location || 'unknown',
              timestamp: new Date().toISOString()
            });
          };

          // Track lead generation
          window.trackLeadGeneration = function(trackingCode, leadType) {
            gtag('event', 'lead_generated', {
              event_category: 'conversion',
              event_label: trackingCode,
              tracking_code: trackingCode,
              lead_type: leadType || 'customer',
              timestamp: new Date().toISOString()
            });
          };

          // Track conversions (signup, intake form, tax return filed)
          window.trackConversion = function(trackingCode, conversionType, value) {
            gtag('event', 'conversion', {
              event_category: 'conversion',
              event_label: trackingCode,
              tracking_code: trackingCode,
              conversion_type: conversionType,
              value: value || 0,
              currency: 'USD',
              timestamp: new Date().toISOString()
            });
          };

          // Track revenue attribution
          window.trackRevenue = function(trackingCode, amount, source) {
            gtag('event', 'revenue', {
              event_category: 'revenue',
              event_label: trackingCode,
              tracking_code: trackingCode,
              value: amount,
              currency: 'USD',
              source: source || 'tax_prep_fee',
              timestamp: new Date().toISOString()
            });
          };

          // Track tracking code customization
          window.trackCodeCustomization = function(oldCode, newCode) {
            gtag('event', 'tracking_code_customized', {
              event_category: 'account',
              event_label: newCode,
              old_code: oldCode,
              new_code: newCode,
              timestamp: new Date().toISOString()
            });
          };
        `}
      </Script>
    </>
  );
}
