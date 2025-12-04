/**
 * Google Search Console Data Fetching Service
 *
 * Fetches organic search performance data from Google Search Console API
 * Shows search queries, impressions, clicks, CTR, and position data
 */

import { google } from 'googleapis';
import { logger } from '@/lib/logger';

// Initialize Search Console client
let searchConsole: any = null;

function getSearchConsoleClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    logger.warn('Google Search Console credentials not configured - Search Console data will not be available');
    return null;
  }

  if (!searchConsole) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'https://developers.google.com/oauthplayground' // Redirect URI for OAuth playground
      );

      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      searchConsole = google.searchconsole({
        version: 'v1',
        auth: oauth2Client,
      });

      logger.info('Google Search Console client initialized');
    } catch (error) {
      logger.error('Failed to initialize Search Console client:', error);
      return null;
    }
  }

  return searchConsole;
}

export interface SearchConsoleMetrics {
  totalClicks: number;
  totalImpressions: number;
  averageCTR: number;
  averagePosition: number;
  clicksGrowth: number;
  impressionsGrowth: number;
}

export interface SearchQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchCountry {
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
}

export interface SearchDevice {
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
}

/**
 * Get overall Search Console metrics for a date range
 */
export async function getSearchMetrics(
  startDate: string = '2025-09-27', // 30 days ago
  endDate: string = '2025-10-26', // today
  siteUrl: string = 'https://taxgeniuspro.tax'
): Promise<SearchConsoleMetrics | null> {
  const client = getSearchConsoleClient();
  if (!client) return null;

  try {
    // Current period
    const currentResponse = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: [],
        aggregationType: 'auto',
      },
    });

    // Previous period for growth calculation
    const previousStartDate = '2025-08-28'; // 60 days ago
    const previousEndDate = '2025-09-26'; // 31 days ago

    const previousResponse = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: previousStartDate,
        endDate: previousEndDate,
        dimensions: [],
        aggregationType: 'auto',
      },
    });

    const current = currentResponse.data.rows?.[0] || {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    };

    const previous = previousResponse.data.rows?.[0] || {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    };

    const clicksGrowth = previous.clicks > 0
      ? ((current.clicks - previous.clicks) / previous.clicks) * 100
      : 0;

    const impressionsGrowth = previous.impressions > 0
      ? ((current.impressions - previous.impressions) / previous.impressions) * 100
      : 0;

    return {
      totalClicks: current.clicks,
      totalImpressions: current.impressions,
      averageCTR: current.ctr,
      averagePosition: current.position,
      clicksGrowth,
      impressionsGrowth,
    };
  } catch (error) {
    logger.error('Error fetching Search Console metrics:', error);
    return null;
  }
}

/**
 * Get top search queries
 */
export async function getTopQueries(
  startDate: string = '2025-09-27',
  endDate: string = '2025-10-26',
  siteUrl: string = 'https://taxgeniuspro.tax',
  limit: number = 20
): Promise<SearchQuery[]> {
  const client = getSearchConsoleClient();
  if (!client) return [];

  try {
    const response = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: limit,
        dimensionFilterGroups: [],
      },
    });

    if (!response.data.rows || response.data.rows.length === 0) return [];

    return response.data.rows.map((row: any) => ({
      query: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));
  } catch (error) {
    logger.error('Error fetching top search queries:', error);
    return [];
  }
}

/**
 * Get top performing pages
 */
export async function getTopPages(
  startDate: string = '2025-09-27',
  endDate: string = '2025-10-26',
  siteUrl: string = 'https://taxgeniuspro.tax',
  limit: number = 20
): Promise<SearchPage[]> {
  const client = getSearchConsoleClient();
  if (!client) return [];

  try {
    const response = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: limit,
      },
    });

    if (!response.data.rows || response.data.rows.length === 0) return [];

    return response.data.rows.map((row: any) => ({
      page: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));
  } catch (error) {
    logger.error('Error fetching top pages:', error);
    return [];
  }
}

/**
 * Get search performance by country
 */
export async function getSearchByCountry(
  startDate: string = '2025-09-27',
  endDate: string = '2025-10-26',
  siteUrl: string = 'https://taxgeniuspro.tax',
  limit: number = 10
): Promise<SearchCountry[]> {
  const client = getSearchConsoleClient();
  if (!client) return [];

  try {
    const response = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['country'],
        rowLimit: limit,
      },
    });

    if (!response.data.rows || response.data.rows.length === 0) return [];

    return response.data.rows.map((row: any) => ({
      country: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
    }));
  } catch (error) {
    logger.error('Error fetching search by country:', error);
    return [];
  }
}

/**
 * Get search performance by device type
 */
export async function getSearchByDevice(
  startDate: string = '2025-09-27',
  endDate: string = '2025-10-26',
  siteUrl: string = 'https://taxgeniuspro.tax'
): Promise<SearchDevice[]> {
  const client = getSearchConsoleClient();
  if (!client) return [];

  try {
    const response = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['device'],
      },
    });

    if (!response.data.rows || response.data.rows.length === 0) return [];

    return response.data.rows.map((row: any) => ({
      device: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
    }));
  } catch (error) {
    logger.error('Error fetching search by device:', error);
    return [];
  }
}

/**
 * Get search appearance features (rich results, AMP, etc.)
 */
export async function getSearchAppearance(
  startDate: string = '2025-09-27',
  endDate: string = '2025-10-26',
  siteUrl: string = 'https://taxgeniuspro.tax'
): Promise<Array<{ feature: string; clicks: number; impressions: number }>> {
  const client = getSearchConsoleClient();
  if (!client) return [];

  try {
    const response = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['searchAppearance'],
      },
    });

    if (!response.data.rows || response.data.rows.length === 0) return [];

    return response.data.rows.map((row: any) => ({
      feature: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
    }));
  } catch (error) {
    logger.error('Error fetching search appearance:', error);
    return [];
  }
}

/**
 * Get indexed pages count and status
 */
export async function getIndexedPagesStatus(
  siteUrl: string = 'https://taxgeniuspro.tax'
): Promise<{
  indexed: number;
  excluded: number;
  errors: number;
} | null> {
  const client = getSearchConsoleClient();
  if (!client) return null;

  try {
    const response = await client.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl: siteUrl,
        siteUrl,
      },
    });

    // Note: This is a simplified version. The actual URL Inspection API
    // requires checking individual URLs. For bulk status, use sitemaps endpoint.
    logger.info('URL Inspection response:', response.data);

    return {
      indexed: 0, // Will be populated when we integrate sitemaps endpoint
      excluded: 0,
      errors: 0,
    };
  } catch (error) {
    logger.error('Error fetching indexed pages status:', error);
    return null;
  }
}
