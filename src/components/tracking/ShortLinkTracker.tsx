/**
 * Short Link Tracker Component
 *
 * Automatically fires Google Analytics events when a user lands
 * on a page from a short link.
 *
 * This component should be added to destination pages:
 * - /start-filing/form
 * - /contact
 *
 * It detects the tracking parameters and fires the appropriate GA events.
 */

'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { logger } from '@/lib/logger';

export function ShortLinkTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get tracking parameters from URL
    const trackingCode = searchParams.get('ref');
    const linkCode = searchParams.get('link');
    const utmSource = searchParams.get('utm_source');
    const utmMedium = searchParams.get('utm_medium');

    // Only fire if we have both tracking code and link code
    // This indicates the user came from a short link
    if (trackingCode && linkCode) {
      // Fire Google Analytics click event
      if (typeof window !== 'undefined' && window.trackReferralClick) {
        window.trackReferralClick(trackingCode, 'SHORT_LINK');

        logger.info('[ShortLinkTracker] GA Event: trackReferralClick', {
          trackingCode,
          materialType: 'SHORT_LINK',
          linkCode,
          utmSource,
          utmMedium,
        });
      }

      // Store tracking data in sessionStorage for later use
      // (when lead form is submitted)
      try {
        sessionStorage.setItem('trackingCode', trackingCode);
        sessionStorage.setItem('linkCode', linkCode);
        sessionStorage.setItem('utmSource', utmSource || '');
        sessionStorage.setItem('utmMedium', utmMedium || '');
      } catch (error) {
        logger.error('[ShortLinkTracker] Error storing tracking data:', error);
      }
    }
  }, [searchParams]);

  // This component doesn't render anything
  return null;
}

/**
 * Hook to get tracking data when submitting forms
 *
 * Use this in form submission handlers to get the tracking
 * attribution data and fire lead generation events.
 */
export function useTrackingData() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return {
      trackingCode: sessionStorage.getItem('trackingCode'),
      linkCode: sessionStorage.getItem('linkCode'),
      utmSource: sessionStorage.getItem('utmSource'),
      utmMedium: sessionStorage.getItem('utmMedium'),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Track lead generation event
 *
 * Call this when a user submits a lead form (intake or contact)
 */
export function trackLeadSubmission(leadType: 'CUSTOMER' | 'INQUIRY') {
  const trackingData = useTrackingData();

  if (trackingData?.trackingCode) {
    // Fire Google Analytics lead generation event
    if (typeof window !== 'undefined' && window.trackLeadGeneration) {
      window.trackLeadGeneration(trackingData.trackingCode, leadType);

      logger.info('[ShortLinkTracker] GA Event: trackLeadGeneration', {
        trackingCode: trackingData.trackingCode,
        leadType,
        linkCode: trackingData.linkCode,
      });
    }
  }
}

/**
 * Track conversion event
 *
 * Call this when a user completes a conversion (e.g., submits tax return)
 */
export function trackConversionSubmission(conversionType: string, value?: number) {
  const trackingData = useTrackingData();

  if (trackingData?.trackingCode) {
    // Fire Google Analytics conversion event
    if (typeof window !== 'undefined' && window.trackConversion) {
      window.trackConversion(trackingData.trackingCode, conversionType, value);

      logger.info('[ShortLinkTracker] GA Event: trackConversion', {
        trackingCode: trackingData.trackingCode,
        conversionType,
        value,
        linkCode: trackingData.linkCode,
      });
    }
  }
}
