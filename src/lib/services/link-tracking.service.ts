/**
 * Link Tracking Service
 *
 * Tracks marketing link performance, clicks, and conversions
 * Used by tax preparers, referrers, and admin dashboards
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';

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
    const link = await prisma.marketingLink.findUnique({
      where: { code: params.linkCode },
    });

    if (!link) {
      logger.error(`Link not found: ${params.linkCode}`);
      return null;
    }

    // Create click record
    const click = await prisma.linkClick.create({
      data: {
        linkId: link.id,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        referrer: params.referrer,
        city: params.city,
        state: params.state,
        country: params.country,
      },
    });

    // Update link click counts
    const isUniqueVisitor = await isUniqueClick(link.id, params.ipAddress);
    await prisma.marketingLink.update({
      where: { id: link.id },
      data: {
        clicks: { increment: 1 },
        uniqueClicks: isUniqueVisitor ? { increment: 1 } : undefined,
      },
    });

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
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existingClick = await prisma.linkClick.findFirst({
    where: {
      linkId,
      ipAddress,
      clickedAt: { gte: yesterday },
    },
  });

  return !existingClick;
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
    const link = await prisma.marketingLink.findUnique({
      where: { code: params.linkCode },
    });

    if (!link) return;

    // Update the most recent click from this user if clientId provided
    if (params.clientId) {
      await prisma.linkClick.updateMany({
        where: {
          linkId: link.id,
          clientId: null, // Not yet attributed
        },
        data: {
          converted: params.converted || false,
          signedUp: params.signedUp || false,
          clientId: params.clientId,
        },
      });
    }

    // Update link aggregate stats
    const updates: Prisma.MarketingLinkUpdateInput = {};
    if (params.converted) updates.conversions = { increment: 1 };
    if (params.signedUp) updates.signups = { increment: 1 };

    if (Object.keys(updates).length > 0) {
      await prisma.marketingLink.update({
        where: { id: link.id },
        data: updates,
      });
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
  const link = await prisma.marketingLink.findUnique({
    where: { id: linkId },
  });

  if (!link || link.clicks === 0) return;

  const conversionRate = (link.conversions / link.clicks) * 100;
  const signupRate = (link.signups / link.clicks) * 100;

  await prisma.marketingLink.update({
    where: { id: linkId },
    data: {
      conversionRate: Math.round(conversionRate * 10) / 10,
      signupRate: Math.round(signupRate * 10) / 10,
    },
  });
}

/**
 * Get link performance data for a specific creator
 */
export async function getCreatorLinkPerformance(
  creatorId: string,
  limit: number = 10
): Promise<LinkPerformance[]> {
  try {
    const links = await prisma.marketingLink.findMany({
      where: {
        creatorId,
        isActive: true,
      },
      orderBy: [{ clicks: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    return links.map((link) => ({
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
      createdAt: link.createdAt,
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
    const links = await prisma.marketingLink.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { linkClicks: true },
        },
      },
      orderBy: [{ conversions: 'desc' }, { clicks: 'desc' }],
      take: limit,
    });

    // Get creator names
    const creatorIds = links.map((l) => l.creatorId);
    const creators = await prisma.profile.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const creatorMap = new Map(
      creators.map((c) => [c.id, `${c.firstName || ''} ${c.lastName || ''}`.trim()])
    );

    return links.map((link) => ({
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
      createdAt: link.createdAt,
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
    const link = await prisma.marketingLink.findUnique({
      where: { id: linkId },
      include: {
        linkClicks: {
          select: {
            converted: true,
            signedUp: true,
          },
        },
      },
    });

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
    const results = await prisma.marketingLink.groupBy({
      by: ['linkType'],
      where: { isActive: true },
      _sum: {
        clicks: true,
        conversions: true,
        signups: true,
      },
      _avg: {
        conversionRate: true,
      },
      _count: true,
    });

    return results.map((result) => ({
      linkType: result.linkType,
      totalLinks: result._count,
      totalClicks: result._sum.clicks || 0,
      totalConversions: result._sum.conversions || 0,
      totalSignups: result._sum.signups || 0,
      avgConversionRate: result._avg.conversionRate
        ? Math.round(result._avg.conversionRate * 10) / 10
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
    const stats = await prisma.marketingLink.aggregate({
      where: { isActive: true },
      _sum: {
        clicks: true,
        uniqueClicks: true,
        conversions: true,
        signups: true,
        returns: true,
      },
      _count: true,
    });

    const totalClicks = stats._sum.clicks || 0;
    const totalConversions = stats._sum.conversions || 0;
    const totalSignups = stats._sum.signups || 0;

    return {
      totalLinks: stats._count,
      totalClicks,
      totalUniqueClicks: stats._sum.uniqueClicks || 0,
      totalConversions,
      totalSignups,
      totalReturns: stats._sum.returns || 0,
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
