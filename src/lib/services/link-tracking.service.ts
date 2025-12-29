/**
 * Link Tracking Service
 *
 * Tracks marketing link performance, clicks, and conversions
 * Used by tax preparers, referrers, and admin dashboards
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
interface MarketingLink {
  id: string;
  code: string;
  url: string;
  title?: string | null;
  linkType: string;
  creatorId: string;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  signups: number;
  returns: number;
  conversionRate?: number | null;
  signupRate?: number | null;
  isActive: boolean;
  createdAt: string;
}

interface LinkClick {
  id: string;
  linkId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  clientId?: string | null;
  converted: boolean;
  signedUp: boolean;
  clickedAt: string;
}

interface Profile {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface LinkPerformance {
  id: string;
  title: string;
  url: string;
  code: string;
  linkType: string;
  creatorId: string;
  creatorName?: string;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  signups: number;
  returns: number;
  conversionRate: number;
  signupRate: number;
  createdAt: Date;
}

export interface LinkConversionFunnel {
  clicks: number;
  uniqueVisitors: number;
  intakeForms: number;
  signups: number;
  returns: number;
  intakeConversionRate: number;
  signupConversionRate: number;
  returnConversionRate: number;
}

/**
 * Record a link click event
 */
export async function trackLinkClick(params: {
  linkCode: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  city?: string;
  state?: string;
  country?: string;
}) {
  try {
    // Find the marketing link
    const { data: links } = await db
      .from('marketing_links')
      .select('*')
      .eq('code', params.linkCode)
      .limit(1);

    const link = firstOrNull(links) as MarketingLink | null;

    if (!link) {
      logger.error(`Link not found: ${params.linkCode}`);
      return null;
    }

    // Create click record
    const { data: click } = await db
      .from('link_clicks')
      .insert({
        linkId: link.id,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        referrer: params.referrer,
        city: params.city,
        state: params.state,
        country: params.country,
      })
      .select()
      .single();

    // Update link click counts
    const isUniqueVisitor = await isUniqueClick(link.id, params.ipAddress);

    // Get current counts and increment
    await db
      .from('marketing_links')
      .update({
        clicks: link.clicks + 1,
        uniqueClicks: isUniqueVisitor ? link.uniqueClicks + 1 : link.uniqueClicks,
      })
      .eq('id', link.id);

    return click;
  } catch (error) {
    logger.error('Error tracking link click:', error);
    return null;
  }
}

/**
 * Check if this is a unique click from this IP
 */
async function isUniqueClick(linkId: string, ipAddress?: string): Promise<boolean> {
  if (!ipAddress) return true;

  // Check if this IP clicked this link in the last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existingClicks } = await db
    .from('link_clicks')
    .select('id')
    .eq('linkId', linkId)
    .eq('ipAddress', ipAddress)
    .gte('clickedAt', yesterday)
    .limit(1);

  return !existingClicks || existingClicks.length === 0;
}

/**
 * Record a conversion from a link click
 */
export async function recordLinkConversion(params: {
  linkCode: string;
  clientId?: string;
  converted?: boolean;
  signedUp?: boolean;
}) {
  try {
    const { data: links } = await db
      .from('marketing_links')
      .select('*')
      .eq('code', params.linkCode)
      .limit(1);

    const link = firstOrNull(links) as MarketingLink | null;

    if (!link) return;

    // Update the most recent click from this user if clientId provided
    if (params.clientId) {
      await db
        .from('link_clicks')
        .update({
          converted: params.converted || false,
          signedUp: params.signedUp || false,
          clientId: params.clientId,
        })
        .eq('linkId', link.id)
        .is('clientId', null);
    }

    // Update link aggregate stats
    const updates: Record<string, number> = {};
    if (params.converted) updates.conversions = link.conversions + 1;
    if (params.signedUp) updates.signups = link.signups + 1;

    if (Object.keys(updates).length > 0) {
      await db
        .from('marketing_links')
        .update(updates)
        .eq('id', link.id);
    }

    // Recalculate conversion rates
    await updateLinkConversionRates(link.id);
  } catch (error) {
    logger.error('Error recording link conversion:', error);
  }
}

/**
 * Update calculated conversion rates for a link
 */
async function updateLinkConversionRates(linkId: string) {
  const { data: links } = await db
    .from('marketing_links')
    .select('*')
    .eq('id', linkId)
    .limit(1);

  const link = firstOrNull(links) as MarketingLink | null;

  if (!link || link.clicks === 0) return;

  const conversionRate = (link.conversions / link.clicks) * 100;
  const signupRate = (link.signups / link.clicks) * 100;

  await db
    .from('marketing_links')
    .update({
      conversionRate: Math.round(conversionRate * 10) / 10,
      signupRate: Math.round(signupRate * 10) / 10,
    })
    .eq('id', linkId);
}

/**
 * Get link performance data for a specific creator
 */
export async function getCreatorLinkPerformance(
  creatorId: string,
  limit: number = 10
): Promise<LinkPerformance[]> {
  try {
    const { data: links } = await db
      .from('marketing_links')
      .select('*')
      .eq('creatorId', creatorId)
      .eq('isActive', true)
      .order('clicks', { ascending: false })
      .limit(limit);

    if (!links) return [];

    return (links as MarketingLink[]).map((link) => ({
      id: link.id,
      title: link.title || link.code,
      url: link.url,
      code: link.code,
      linkType: link.linkType,
      creatorId: link.creatorId,
      clicks: link.clicks,
      uniqueClicks: link.uniqueClicks,
      conversions: link.conversions,
      signups: link.signups,
      returns: link.returns,
      conversionRate: link.conversionRate || 0,
      signupRate: link.signupRate || 0,
      createdAt: new Date(link.createdAt),
    }));
  } catch (error) {
    logger.error('Error fetching creator link performance:', error);
    return [];
  }
}

/**
 * Get top performing links platform-wide
 */
export async function getTopPerformingLinks(limit: number = 10): Promise<LinkPerformance[]> {
  try {
    const { data: links } = await db
      .from('marketing_links')
      .select('*')
      .eq('isActive', true)
      .order('conversions', { ascending: false })
      .limit(limit);

    if (!links) return [];

    // Get creator IDs
    const creatorIds = (links as MarketingLink[]).map((l) => l.creatorId);

    // Get creator names
    const { data: creators } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .in('id', creatorIds);

    const creatorMap = new Map(
      (creators as Profile[] || []).map((c) => [
        c.id,
        `${c.firstName || ''} ${c.lastName || ''}`.trim(),
      ])
    );

    return (links as MarketingLink[]).map((link) => ({
      id: link.id,
      title: link.title || link.code,
      url: link.url,
      code: link.code,
      linkType: link.linkType,
      creatorId: link.creatorId,
      creatorName: creatorMap.get(link.creatorId) || 'Unknown',
      clicks: link.clicks,
      uniqueClicks: link.uniqueClicks,
      conversions: link.conversions,
      signups: link.signups,
      returns: link.returns,
      conversionRate: link.conversionRate || 0,
      signupRate: link.signupRate || 0,
      createdAt: new Date(link.createdAt),
    }));
  } catch (error) {
    logger.error('Error fetching top performing links:', error);
    return [];
  }
}

/**
 * Get conversion funnel for a specific link
 */
export async function getLinkConversionFunnel(linkId: string): Promise<LinkConversionFunnel> {
  try {
    const { data: links } = await db
      .from('marketing_links')
      .select('*')
      .eq('id', linkId)
      .limit(1);

    const link = firstOrNull(links) as MarketingLink | null;

    if (!link) {
      return {
        clicks: 0,
        uniqueVisitors: 0,
        intakeForms: 0,
        signups: 0,
        returns: 0,
        intakeConversionRate: 0,
        signupConversionRate: 0,
        returnConversionRate: 0,
      };
    }

    const clicks = link.clicks;
    const uniqueVisitors = link.uniqueClicks;
    const intakeForms = link.conversions;
    const signups = link.signups;
    const returns = link.returns;

    return {
      clicks,
      uniqueVisitors,
      intakeForms,
      signups,
      returns,
      intakeConversionRate: clicks > 0 ? Math.round((intakeForms / clicks) * 100) : 0,
      signupConversionRate: clicks > 0 ? Math.round((signups / clicks) * 100) : 0,
      returnConversionRate: clicks > 0 ? Math.round((returns / clicks) * 100) : 0,
    };
  } catch (error) {
    logger.error('Error fetching link conversion funnel:', error);
    return {
      clicks: 0,
      uniqueVisitors: 0,
      intakeForms: 0,
      signups: 0,
      returns: 0,
      intakeConversionRate: 0,
      signupConversionRate: 0,
      returnConversionRate: 0,
    };
  }
}

/**
 * Get link performance by type
 */
export async function getLinkPerformanceByType() {
  try {
    // Supabase doesn't support groupBy directly, so we fetch all and aggregate
    const { data: links } = await db
      .from('marketing_links')
      .select('linkType, clicks, conversions, signups, conversionRate')
      .eq('isActive', true);

    if (!links) return [];

    // Group by linkType manually
    const grouped = new Map<
      string,
      {
        count: number;
        totalClicks: number;
        totalConversions: number;
        totalSignups: number;
        conversionRates: number[];
      }
    >();

    for (const link of links as MarketingLink[]) {
      const existing = grouped.get(link.linkType) || {
        count: 0,
        totalClicks: 0,
        totalConversions: 0,
        totalSignups: 0,
        conversionRates: [],
      };

      existing.count++;
      existing.totalClicks += link.clicks || 0;
      existing.totalConversions += link.conversions || 0;
      existing.totalSignups += link.signups || 0;
      if (link.conversionRate) existing.conversionRates.push(link.conversionRate);

      grouped.set(link.linkType, existing);
    }

    return Array.from(grouped.entries()).map(([linkType, data]) => ({
      linkType,
      totalLinks: data.count,
      totalClicks: data.totalClicks,
      totalConversions: data.totalConversions,
      totalSignups: data.totalSignups,
      avgConversionRate:
        data.conversionRates.length > 0
          ? Math.round(
              (data.conversionRates.reduce((a, b) => a + b, 0) / data.conversionRates.length) * 10
            ) / 10
          : 0,
    }));
  } catch (error) {
    logger.error('Error fetching link performance by type:', error);
    return [];
  }
}

/**
 * Get total platform-wide link stats
 */
export async function getPlatformLinkStats() {
  try {
    // Supabase doesn't support aggregate directly, so we fetch and sum manually
    const { data: links } = await db
      .from('marketing_links')
      .select('clicks, uniqueClicks, conversions, signups, returns')
      .eq('isActive', true);

    if (!links || links.length === 0) {
      return {
        totalLinks: 0,
        totalClicks: 0,
        totalUniqueClicks: 0,
        totalConversions: 0,
        totalSignups: 0,
        totalReturns: 0,
        platformConversionRate: 0,
        platformSignupRate: 0,
      };
    }

    const totalLinks = links.length;
    let totalClicks = 0;
    let totalUniqueClicks = 0;
    let totalConversions = 0;
    let totalSignups = 0;
    let totalReturns = 0;

    for (const link of links as MarketingLink[]) {
      totalClicks += link.clicks || 0;
      totalUniqueClicks += link.uniqueClicks || 0;
      totalConversions += link.conversions || 0;
      totalSignups += link.signups || 0;
      totalReturns += link.returns || 0;
    }

    return {
      totalLinks,
      totalClicks,
      totalUniqueClicks,
      totalConversions,
      totalSignups,
      totalReturns,
      platformConversionRate:
        totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 100 * 10) / 10 : 0,
      platformSignupRate:
        totalClicks > 0 ? Math.round((totalSignups / totalClicks) * 100 * 10) / 10 : 0,
    };
  } catch (error) {
    logger.error('Error fetching platform link stats:', error);
    return {
      totalLinks: 0,
      totalClicks: 0,
      totalUniqueClicks: 0,
      totalConversions: 0,
      totalSignups: 0,
      totalReturns: 0,
      platformConversionRate: 0,
      platformSignupRate: 0,
    };
  }
}
