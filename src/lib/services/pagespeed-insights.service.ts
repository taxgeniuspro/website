/**
 * Google PageSpeed Insights Service
 *
 * Fetches Core Web Vitals and performance metrics using PageSpeed Insights API
 * Provides both mobile and desktop performance scores
 */

import { logger } from '@/lib/logger';

const PAGESPEED_API_KEY = process.env.GOOGLE_PAGESPEED_API_KEY || '';
const PAGESPEED_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

export interface CoreWebVitals {
  // Core Web Vitals
  LCP: number; // Largest Contentful Paint (ms)
  FID: number; // First Input Delay (ms) - or INP in newer metrics
  CLS: number; // Cumulative Layout Shift (score)

  // Additional Performance Metrics
  FCP: number; // First Contentful Paint (ms)
  TTI: number; // Time to Interactive (ms)
  TBT: number; // Total Blocking Time (ms)
  SI: number; // Speed Index (ms)

  // Scores (0-100)
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;

  // Overall assessment
  lcpStatus: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
  fidStatus: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
  clsStatus: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
}

export interface PageSpeedResult {
  mobile: CoreWebVitals | null;
  desktop: CoreWebVitals | null;
  url: string;
  fetchedAt: Date;
}

/**
 * Determine status based on Google's Core Web Vitals thresholds
 */
function getMetricStatus(
  metric: 'LCP' | 'FID' | 'CLS',
  value: number
): 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR' {
  const thresholds = {
    LCP: { good: 2500, poor: 4000 }, // milliseconds
    FID: { good: 100, poor: 300 }, // milliseconds
    CLS: { good: 0.1, poor: 0.25 }, // score
  };

  const threshold = thresholds[metric];
  if (value <= threshold.good) return 'GOOD';
  if (value <= threshold.poor) return 'NEEDS_IMPROVEMENT';
  return 'POOR';
}

/**
 * Fetch PageSpeed Insights data for a URL
 */
async function fetchPageSpeedData(
  url: string,
  strategy: 'mobile' | 'desktop'
): Promise<CoreWebVitals | null> {
  if (!PAGESPEED_API_KEY) {
    logger.warn('PageSpeed Insights API key not configured - Core Web Vitals will not be available');
    return null;
  }

  try {
    const apiUrl = new URL(PAGESPEED_API_URL);
    apiUrl.searchParams.set('url', url);
    apiUrl.searchParams.set('key', PAGESPEED_API_KEY);
    apiUrl.searchParams.set('strategy', strategy);
    apiUrl.searchParams.set('category', 'PERFORMANCE');
    apiUrl.searchParams.set('category', 'ACCESSIBILITY');
    apiUrl.searchParams.set('category', 'BEST_PRACTICES');
    apiUrl.searchParams.set('category', 'SEO');

    const response = await fetch(apiUrl.toString(), {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`PageSpeed API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract metrics from the response
    const lighthouseMetrics = data.lighthouseResult?.audits || {};
    const loadingExperience = data.loadingExperience?.metrics || {};

    // Core Web Vitals (from field data if available, otherwise lab data)
    const LCP =
      loadingExperience['LARGEST_CONTENTFUL_PAINT_MS']?.percentile ||
      lighthouseMetrics['largest-contentful-paint']?.numericValue ||
      0;

    const FID =
      loadingExperience['FIRST_INPUT_DELAY_MS']?.percentile ||
      loadingExperience['INTERACTION_TO_NEXT_PAINT']?.percentile ||
      lighthouseMetrics['max-potential-fid']?.numericValue ||
      0;

    const CLS =
      loadingExperience['CUMULATIVE_LAYOUT_SHIFT_SCORE']?.percentile / 100 ||
      lighthouseMetrics['cumulative-layout-shift']?.numericValue ||
      0;

    // Additional metrics
    const FCP = lighthouseMetrics['first-contentful-paint']?.numericValue || 0;
    const TTI = lighthouseMetrics['interactive']?.numericValue || 0;
    const TBT = lighthouseMetrics['total-blocking-time']?.numericValue || 0;
    const SI = lighthouseMetrics['speed-index']?.numericValue || 0;

    // Scores
    const categories = data.lighthouseResult?.categories || {};
    const performanceScore = Math.round((categories.performance?.score || 0) * 100);
    const accessibilityScore = Math.round((categories.accessibility?.score || 0) * 100);
    const bestPracticesScore = Math.round((categories['best-practices']?.score || 0) * 100);
    const seoScore = Math.round((categories.seo?.score || 0) * 100);

    return {
      LCP,
      FID,
      CLS,
      FCP,
      TTI,
      TBT,
      SI,
      performanceScore,
      accessibilityScore,
      bestPracticesScore,
      seoScore,
      lcpStatus: getMetricStatus('LCP', LCP),
      fidStatus: getMetricStatus('FID', FID),
      clsStatus: getMetricStatus('CLS', CLS),
    };
  } catch (error) {
    logger.error(`Error fetching PageSpeed data for ${strategy}:`, error);
    return null;
  }
}

/**
 * Get Core Web Vitals for both mobile and desktop
 */
export async function getCoreWebVitals(
  url: string = 'https://taxgeniuspro.tax'
): Promise<PageSpeedResult> {
  logger.info(`Fetching Core Web Vitals for ${url}`);

  // Fetch mobile and desktop data in parallel
  const [mobile, desktop] = await Promise.all([
    fetchPageSpeedData(url, 'mobile'),
    fetchPageSpeedData(url, 'desktop'),
  ]);

  return {
    mobile,
    desktop,
    url,
    fetchedAt: new Date(),
  };
}

/**
 * Get a simplified summary of Core Web Vitals
 */
export async function getCoreWebVitalsSummary(
  url: string = 'https://taxgeniuspro.tax'
): Promise<{
  mobile: { score: number; status: string };
  desktop: { score: number; status: string };
} | null> {
  const vitals = await getCoreWebVitals(url);

  if (!vitals.mobile && !vitals.desktop) {
    return null;
  }

  const getMobileStatus = () => {
    if (!vitals.mobile) return 'N/A';
    const goodCount = [
      vitals.mobile.lcpStatus,
      vitals.mobile.fidStatus,
      vitals.mobile.clsStatus,
    ].filter(s => s === 'GOOD').length;

    if (goodCount === 3) return 'GOOD';
    if (goodCount >= 2) return 'NEEDS_IMPROVEMENT';
    return 'POOR';
  };

  const getDesktopStatus = () => {
    if (!vitals.desktop) return 'N/A';
    const goodCount = [
      vitals.desktop.lcpStatus,
      vitals.desktop.fidStatus,
      vitals.desktop.clsStatus,
    ].filter(s => s === 'GOOD').length;

    if (goodCount === 3) return 'GOOD';
    if (goodCount >= 2) return 'NEEDS_IMPROVEMENT';
    return 'POOR';
  };

  return {
    mobile: {
      score: vitals.mobile?.performanceScore || 0,
      status: getMobileStatus(),
    },
    desktop: {
      score: vitals.desktop?.performanceScore || 0,
      status: getDesktopStatus(),
    },
  };
}
