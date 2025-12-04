/**
 * SEO Brain - Performance Analyzer
 *
 * Analyzes city page performance and identifies winners/losers
 */

import { prisma } from '@/lib/prisma'

export interface PerformanceMetrics {
  pageId: string
  city: string
  views: number
  conversions: number
  revenue: number
  conversionRate: number
  avgOrderValue: number
  performanceScore: number
}

export interface PerformanceAnalysis {
  campaignId: string
  totalPages: number
  totalViews: number
  totalConversions: number
  totalRevenue: number
  avgConversionRate: number
  winners: PerformanceMetrics[] // Top 20%
  losers: PerformanceMetrics[] // Bottom 20%
  avgScore: number
  timestamp: Date
}

/**
 * Analyze performance for all city pages in a campaign
 */
export async function analyzePerformance(campaignId: string): Promise<PerformanceAnalysis> {
  try {
    // Get all city pages for this campaign
    const cityPages = await prisma.cityLandingPage.findMany({
      where: { landingPageSetId: campaignId },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    })

    if (cityPages.length === 0) {
      throw new Error('No city pages found for campaign')
    }

    // Calculate metrics for each page
    const pageMetrics: PerformanceMetrics[] = cityPages.map((page) => {
      const conversions = page._count.orders
      const views = page.views || 0
      const revenue = page.revenue.toNumber()
      const conversionRate = views > 0 ? conversions / views : 0
      const avgOrderValue = conversions > 0 ? revenue / conversions : 0

      return {
        pageId: page.id,
        city: page.slug,
        views,
        conversions,
        revenue,
        conversionRate,
        avgOrderValue,
        performanceScore: calculatePerformanceScore({
          conversions,
          views,
          revenue,
        }),
      }
    })

    // Sort by performance score
    pageMetrics.sort((a, b) => b.performanceScore - a.performanceScore)

    // Calculate totals
    const totalViews = pageMetrics.reduce((sum, m) => sum + m.views, 0)
    const totalConversions = pageMetrics.reduce((sum, m) => sum + m.conversions, 0)
    const totalRevenue = pageMetrics.reduce((sum, m) => sum + m.revenue, 0)
    const avgConversionRate = totalViews > 0 ? totalConversions / totalViews : 0
    const avgScore =
      pageMetrics.reduce((sum, m) => sum + m.performanceScore, 0) / pageMetrics.length

    // Identify winners (top 20%) and losers (bottom 20%)
    const winnerCount = Math.max(10, Math.ceil(pageMetrics.length * 0.2))
    const loserCount = Math.max(10, Math.ceil(pageMetrics.length * 0.2))

    const winners = pageMetrics.slice(0, winnerCount)
    const losers = pageMetrics.slice(-loserCount).reverse()

    return {
      campaignId,
      totalPages: pageMetrics.length,
      totalViews,
      totalConversions,
      totalRevenue,
      avgConversionRate,
      winners,
      losers,
      avgScore,
      timestamp: new Date(),
    }
  } catch (error) {
    console.error('[Performance Analyzer] Error:', error)
    throw error
  }
}

/**
 * Calculate performance score for a page (0-100)
 *
 * Weighted formula:
 * - Conversions: 50%
 * - Views: 30%
 * - Revenue: 20%
 */
export function calculatePerformanceScore(metrics: {
  conversions: number
  views: number
  revenue: number
}): number {
  const { conversions, views, revenue } = metrics

  // Normalize each metric to 0-100 scale
  const conversionScore = Math.min(100, (conversions / 10) * 100)
  const viewScore = Math.min(100, (views / 500) * 100)
  const revenueScore = Math.min(100, (revenue / 1000) * 100)

  // Apply weights
  const weightedScore = conversionScore * 0.5 + viewScore * 0.3 + revenueScore * 0.2

  return Math.round(weightedScore)
}

/**
 * Create performance snapshot (for tracking over time)
 */
export async function createPerformanceSnapshot(analysis: PerformanceAnalysis): Promise<void> {
  try {
    // Create snapshot records for all pages
    const snapshots = [...analysis.winners, ...analysis.losers].map((metrics) => ({
      id: `snapshot-${metrics.pageId}-${Date.now()}`,
      cityLandingPageId: metrics.pageId,
      timestamp: analysis.timestamp,
      views: metrics.views,
      conversions: metrics.conversions,
      revenue: metrics.revenue,
      conversionRate: metrics.conversionRate,
      avgOrderValue: metrics.avgOrderValue,
      performanceScore: metrics.performanceScore,
    }))

    await prisma.cityPerformanceSnapshot.createMany({
      data: snapshots,
    })
  } catch (error) {
    console.error('[Performance Analyzer] Snapshot error:', error)
    // Don't throw - snapshots are optional
  }
}

/**
 * Get performance trend for a city page (last 30 days)
 */
export async function getPerformanceTrend(cityPageId: string): Promise<PerformanceMetrics[]> {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const snapshots = await prisma.cityPerformanceSnapshot.findMany({
      where: {
        cityLandingPageId: cityPageId,
        timestamp: { gte: thirtyDaysAgo },
      },
      orderBy: { timestamp: 'asc' },
    })

    return snapshots.map((snapshot) => ({
      pageId: snapshot.cityLandingPageId,
      city: '', // Not included in snapshot
      views: snapshot.views,
      conversions: snapshot.conversions,
      revenue: snapshot.revenue.toNumber(),
      conversionRate: snapshot.conversionRate?.toNumber() || 0,
      avgOrderValue: snapshot.avgOrderValue?.toNumber() || 0,
      performanceScore: snapshot.performanceScore || 0,
    }))
  } catch (error) {
    console.error('[Performance Analyzer] Trend error:', error)
    return []
  }
}
