/**
 * Google Analytics 4 Data Fetching Service
 *
 * Fetches website traffic and behavior data from GA4 using the Google Analytics Data API
 * Used in admin analytics dashboards to show website performance metrics
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { logger } from '@/lib/logger';

// GA4 Property ID from environment
const GA4_PROPERTY_ID = process.env.GOOGLE_ANALYTICS_PROPERTY_ID || '';

// Initialize the GA4 client (uses Application Default Credentials or service account)
let analyticsDataClient: BetaAnalyticsDataClient | null = null;

function getAnalyticsClient(): BetaAnalyticsDataClient | null {
  if (!GA4_PROPERTY_ID) {
    logger.warn('GA4 Property ID not configured - GA4 data will not be available');
    return null;
  }

  if (!analyticsDataClient) {
    try {
      // This will use GOOGLE_APPLICATION_CREDENTIALS environment variable
      // or default service account credentials in production
      analyticsDataClient = new BetaAnalyticsDataClient();
      logger.info('GA4 Analytics Data Client initialized');
    } catch (error) {
      logger.error('Failed to initialize GA4 client:', error);
      return null;
    }
  }

  return analyticsDataClient;
}

export interface GA4TrafficMetrics {
  sessions: number;
  users: number;
  newUsers: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
  sessionsGrowth: number;
  usersGrowth: number;
}

export interface GA4TrafficSource {
  source: string;
  sessions: number;
  users: number;
  percentage: number;
}

export interface GA4DeviceCategory {
  deviceCategory: string;
  sessions: number;
  percentage: number;
}

export interface GA4TopPage {
  pagePath: string;
  pageTitle: string;
  pageviews: number;
  uniquePageviews: number;
  avgTimeOnPage: number;
}

export interface GA4GeographicData {
  country: string;
  city: string;
  sessions: number;
  users: number;
}

/**
 * Get website traffic metrics for a date range
 */
export async function getTrafficMetrics(
  startDate: string = '30daysAgo',
  endDate: string = 'today'
): Promise<GA4TrafficMetrics | null> {
  const client = getAnalyticsClient();
  if (!client) return null;

  try {
    const [response] = await client.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [
        { startDate, endDate },
        // Previous period for growth calculation
        { startDate: '60daysAgo', endDate: '31daysAgo' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
    });

    if (!response.rows || response.rows.length === 0) {
      return {
        sessions: 0,
        users: 0,
        newUsers: 0,
        pageviews: 0,
        bounceRate: 0,
        avgSessionDuration: 0,
        sessionsGrowth: 0,
        usersGrowth: 0,
      };
    }

    // Current period (first row)
    const currentMetrics = response.rows[0]?.metricValues || [];
    const sessions = Number(currentMetrics[0]?.value || 0);
    const users = Number(currentMetrics[1]?.value || 0);
    const newUsers = Number(currentMetrics[2]?.value || 0);
    const pageviews = Number(currentMetrics[3]?.value || 0);
    const bounceRate = Number(currentMetrics[4]?.value || 0);
    const avgSessionDuration = Number(currentMetrics[5]?.value || 0);

    // Previous period (second row if exists)
    const previousMetrics = response.rows[1]?.metricValues || [];
    const previousSessions = Number(previousMetrics[0]?.value || 0);
    const previousUsers = Number(previousMetrics[1]?.value || 0);

    // Calculate growth rates
    const sessionsGrowth = previousSessions > 0
      ? ((sessions - previousSessions) / previousSessions) * 100
      : 0;
    const usersGrowth = previousUsers > 0
      ? ((users - previousUsers) / previousUsers) * 100
      : 0;

    return {
      sessions,
      users,
      newUsers,
      pageviews,
      bounceRate,
      avgSessionDuration,
      sessionsGrowth,
      usersGrowth,
    };
  } catch (error) {
    logger.error('Error fetching GA4 traffic metrics:', error);
    return null;
  }
}

/**
 * Get traffic sources breakdown
 */
export async function getTrafficSources(
  startDate: string = '30daysAgo',
  endDate: string = 'today'
): Promise<GA4TrafficSource[]> {
  const client = getAnalyticsClient();
  if (!client) return [];

  try {
    const [response] = await client.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionSource' }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    });

    if (!response.rows || response.rows.length === 0) return [];

    const totalSessions = response.rows.reduce(
      (sum, row) => sum + Number(row.metricValues?.[0]?.value || 0),
      0
    );

    return response.rows.map(row => ({
      source: row.dimensionValues?.[0]?.value || 'Unknown',
      sessions: Number(row.metricValues?.[0]?.value || 0),
      users: Number(row.metricValues?.[1]?.value || 0),
      percentage: totalSessions > 0
        ? (Number(row.metricValues?.[0]?.value || 0) / totalSessions) * 100
        : 0,
    }));
  } catch (error) {
    logger.error('Error fetching GA4 traffic sources:', error);
    return [];
  }
}

/**
 * Get device category breakdown
 */
export async function getDeviceCategories(
  startDate: string = '30daysAgo',
  endDate: string = 'today'
): Promise<GA4DeviceCategory[]> {
  const client = getAnalyticsClient();
  if (!client) return [];

  try {
    const [response] = await client.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'sessions' }],
    });

    if (!response.rows || response.rows.length === 0) return [];

    const totalSessions = response.rows.reduce(
      (sum, row) => sum + Number(row.metricValues?.[0]?.value || 0),
      0
    );

    return response.rows.map(row => ({
      deviceCategory: row.dimensionValues?.[0]?.value || 'Unknown',
      sessions: Number(row.metricValues?.[0]?.value || 0),
      percentage: totalSessions > 0
        ? (Number(row.metricValues?.[0]?.value || 0) / totalSessions) * 100
        : 0,
    }));
  } catch (error) {
    logger.error('Error fetching GA4 device categories:', error);
    return [];
  }
}

/**
 * Get top pages by pageviews
 */
export async function getTopPages(
  startDate: string = '30daysAgo',
  endDate: string = 'today',
  limit: number = 10
): Promise<GA4TopPage[]> {
  const client = getAnalyticsClient();
  if (!client) return [];

  try {
    const [response] = await client.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'pagePath' },
        { name: 'pageTitle' },
      ],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'userEngagementDuration' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit,
    });

    if (!response.rows || response.rows.length === 0) return [];

    return response.rows.map(row => {
      const pageviews = Number(row.metricValues?.[0]?.value || 0);
      const totalDuration = Number(row.metricValues?.[1]?.value || 0);

      return {
        pagePath: row.dimensionValues?.[0]?.value || '',
        pageTitle: row.dimensionValues?.[1]?.value || 'Unknown',
        pageviews,
        uniquePageviews: pageviews, // GA4 doesn't separate unique pageviews
        avgTimeOnPage: pageviews > 0 ? totalDuration / pageviews : 0,
      };
    });
  } catch (error) {
    logger.error('Error fetching GA4 top pages:', error);
    return [];
  }
}

/**
 * Get geographic data (countries and cities)
 */
export async function getGeographicData(
  startDate: string = '30daysAgo',
  endDate: string = 'today',
  limit: number = 10
): Promise<GA4GeographicData[]> {
  const client = getAnalyticsClient();
  if (!client) return [];

  try {
    const [response] = await client.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'country' },
        { name: 'city' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit,
    });

    if (!response.rows || response.rows.length === 0) return [];

    return response.rows.map(row => ({
      country: row.dimensionValues?.[0]?.value || 'Unknown',
      city: row.dimensionValues?.[1]?.value || 'Unknown',
      sessions: Number(row.metricValues?.[0]?.value || 0),
      users: Number(row.metricValues?.[1]?.value || 0),
    }));
  } catch (error) {
    logger.error('Error fetching GA4 geographic data:', error);
    return [];
  }
}

/**
 * Get realtime active users (last 30 minutes)
 */
export async function getRealtimeUsers(): Promise<number> {
  const client = getAnalyticsClient();
  if (!client) return 0;

  try {
    const [response] = await client.runRealtimeReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      metrics: [{ name: 'activeUsers' }],
    });

    return Number(response.rows?.[0]?.metricValues?.[0]?.value || 0);
  } catch (error) {
    logger.error('Error fetching GA4 realtime users:', error);
    return 0;
  }
}

/**
 * Get conversion events data
 */
export async function getConversionEvents(
  startDate: string = '30daysAgo',
  endDate: string = 'today'
): Promise<Array<{ eventName: string; count: number; value: number }>> {
  const client = getAnalyticsClient();
  if (!client) return [];

  try {
    const [response] = await client.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'eventName' }],
      metrics: [
        { name: 'eventCount' },
        { name: 'eventValue' },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          inListFilter: {
            values: ['generate_lead', 'conversion', 'purchase', 'form_submit'],
          },
        },
      },
    });

    if (!response.rows || response.rows.length === 0) return [];

    return response.rows.map(row => ({
      eventName: row.dimensionValues?.[0]?.value || '',
      count: Number(row.metricValues?.[0]?.value || 0),
      value: Number(row.metricValues?.[1]?.value || 0),
    }));
  } catch (error) {
    logger.error('Error fetching GA4 conversion events:', error);
    return [];
  }
}
