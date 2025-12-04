import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/admin/stats-cards'
import { prisma } from '@/lib/prisma'
import {
  Users,
  Eye,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Monitor,
  Smartphone,
  Tablet,
  Target,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface FunnelAnalyticsPageProps {
  searchParams: {
    funnelId?: string
    period?: string
  }
}

async function getFunnelAnalyticsData(funnelId?: string, period: string = '30d') {
  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()

  switch (period) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7)
      break
    case '90d':
      startDate.setDate(startDate.getDate() - 90)
      break
    default: // 30d
      startDate.setDate(startDate.getDate() - 30)
  }

  // Get all funnels for selector
  const funnels = await prisma.funnel.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // If no funnelId provided, use first funnel
  const selectedFunnelId = funnelId || funnels[0]?.id

  if (!selectedFunnelId) {
    return {
      funnels: [],
      selectedFunnel: null,
      steps: [],
      analytics: null,
      deviceBreakdown: null,
      sourceBreakdown: null,
      period,
    }
  }

  // Get selected funnel with steps
  const selectedFunnel = await prisma.funnel.findUnique({
    where: { id: selectedFunnelId },
    include: {
      FunnelStep: {
        orderBy: { position: 'asc' },
      },
    },
  })

  // Get funnel-level analytics
  const funnelAnalytics = await prisma.funnelAnalytics.findMany({
    where: {
      funnelId: selectedFunnelId,
      funnelStepId: null, // Funnel-level only
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'desc' },
  })

  // Get step-level analytics
  const stepAnalytics = await prisma.funnelAnalytics.findMany({
    where: {
      funnelId: selectedFunnelId,
      funnelStepId: { not: null }, // Step-level only
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      FunnelStep: {
        select: {
          name: true,
          position: true,
        },
      },
    },
  })

  // Aggregate funnel metrics
  const totalViews = funnelAnalytics.reduce((sum, a) => sum + a.views, 0)
  const totalUniqueVisitors = funnelAnalytics.reduce((sum, a) => sum + a.uniqueVisitors, 0)
  const totalConversions = funnelAnalytics.reduce((sum, a) => sum + a.conversions, 0)
  const totalRevenue = funnelAnalytics.reduce((sum, a) => sum + a.revenue, 0)

  const conversionRate =
    totalUniqueVisitors > 0 ? (totalConversions / totalUniqueVisitors) * 100 : 0

  // Aggregate device data from all funnel analytics
  const deviceTotals = { desktop: 0, mobile: 0, tablet: 0 }
  funnelAnalytics.forEach((analytics) => {
    if (analytics.deviceData && typeof analytics.deviceData === 'object') {
      const data = analytics.deviceData as { desktop?: number; mobile?: number; tablet?: number }
      deviceTotals.desktop += data.desktop || 0
      deviceTotals.mobile += data.mobile || 0
      deviceTotals.tablet += data.tablet || 0
    }
  })

  // Aggregate UTM source data
  const sourceMap = new Map<string, number>()
  funnelAnalytics.forEach((analytics) => {
    if (analytics.sourceData && typeof analytics.sourceData === 'object') {
      const data = analytics.sourceData as {
        utmSources?: string[]
        utmMediums?: string[]
        utmCampaigns?: string[]
      }
      data.utmSources?.forEach((source) => {
        sourceMap.set(source, (sourceMap.get(source) || 0) + 1)
      })
    }
  })

  // Aggregate step-level metrics by step ID
  const stepMetricsMap = new Map<
    string,
    { name: string; position: number; views: number; uniqueVisitors: number }
  >()

  stepAnalytics.forEach((analytics) => {
    const existing = stepMetricsMap.get(analytics.funnelStepId!) || {
      name: analytics.FunnelStep?.name || 'Unknown',
      position: analytics.FunnelStep?.position || 0,
      views: 0,
      uniqueVisitors: 0,
    }
    stepMetricsMap.set(analytics.funnelStepId!, {
      ...existing,
      views: existing.views + analytics.views,
      uniqueVisitors: existing.uniqueVisitors + analytics.uniqueVisitors,
    })
  })

  // Convert to array and sort by position
  const stepMetrics = Array.from(stepMetricsMap.entries())
    .map(([stepId, data]) => ({
      stepId,
      ...data,
    }))
    .sort((a, b) => a.position - b.position)

  // Calculate conversion rates between steps
  const stepsWithConversion = stepMetrics.map((step, index) => {
    const nextStep = stepMetrics[index + 1]
    const conversionToNext = nextStep
      ? step.uniqueVisitors > 0
        ? ((nextStep.uniqueVisitors / step.uniqueVisitors) * 100).toFixed(1)
        : '0.0'
      : null

    const dropOffRate = nextStep
      ? step.uniqueVisitors > 0
        ? (((step.uniqueVisitors - nextStep.uniqueVisitors) / step.uniqueVisitors) * 100).toFixed(1)
        : '0.0'
      : null

    return {
      ...step,
      conversionToNext,
      dropOffRate,
    }
  })

  return {
    funnels,
    selectedFunnel,
    steps: stepsWithConversion,
    analytics: {
      totalViews,
      totalUniqueVisitors,
      totalConversions,
      totalRevenue,
      conversionRate,
    },
    deviceBreakdown: deviceTotals,
    sourceBreakdown: Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
    period,
  }
}

export default async function FunnelAnalyticsPage({ searchParams }: FunnelAnalyticsPageProps) {
  const data = await getFunnelAnalyticsData(searchParams.funnelId, searchParams.period)

  if (!data.selectedFunnel) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Funnel Analytics</h1>
          <p className="text-muted-foreground">No funnels found</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Funnels Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first funnel to start tracking conversions
              </p>
              <Button asChild>
                <Link href="/admin/funnels/new">Create Funnel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const periodLabels = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
  }

  const totalDeviceViews =
    data.deviceBreakdown!.desktop + data.deviceBreakdown!.mobile + data.deviceBreakdown!.tablet

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Funnel Analytics</h1>
          <p className="text-muted-foreground">
            Conversion tracking and performance metrics for{' '}
            {periodLabels[data.period as keyof typeof periodLabels]}
          </p>
        </div>
      </div>

      {/* Funnel Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Funnel</CardTitle>
          <CardDescription>Choose a funnel to analyze</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.funnels.map((funnel) => (
              <Button
                key={funnel.id}
                asChild
                size="sm"
                variant={funnel.id === data.selectedFunnel?.id ? 'default' : 'outline'}
              >
                <Link href={`/admin/funnel-analytics?funnelId=${funnel.id}&period=${data.period}`}>
                  {funnel.name}
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Period Selector */}
      <div className="flex gap-2">
        {Object.entries(periodLabels).map(([key, label]) => (
          <Button key={key} asChild size="sm" variant={data.period === key ? 'default' : 'outline'}>
            <Link href={`/admin/funnel-analytics?funnelId=${data.selectedFunnel.id}&period=${key}`}>
              {label}
            </Link>
          </Button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          icon={<Eye className="h-4 w-4" />}
          iconBg="bg-blue-100 dark:bg-blue-900/20"
          subtitle="Total page views"
          title="Views"
          value={data.analytics!.totalViews.toLocaleString()}
        />

        <StatsCard
          icon={<Users className="h-4 w-4" />}
          iconBg="bg-purple-100 dark:bg-purple-900/20"
          subtitle="Unique visitors"
          title="Visitors"
          value={data.analytics!.totalUniqueVisitors.toLocaleString()}
        />

        <StatsCard
          icon={<ShoppingCart className="h-4 w-4" />}
          iconBg="bg-green-100 dark:bg-green-900/20"
          subtitle="Completed orders"
          title="Conversions"
          value={data.analytics!.totalConversions.toLocaleString()}
        />

        <StatsCard
          icon={<DollarSign className="h-4 w-4" />}
          iconBg="bg-amber-100 dark:bg-amber-900/20"
          subtitle="Total revenue"
          title="Revenue"
          value={`$${(data.analytics!.totalRevenue / 100).toFixed(2)}`}
        />

        <StatsCard
          icon={<Target className="h-4 w-4" />}
          iconBg="bg-pink-100 dark:bg-pink-900/20"
          subtitle="Visitor to customer"
          title="Conversion Rate"
          value={`${data.analytics!.conversionRate.toFixed(1)}%`}
        />
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Funnel Steps & Conversion Flow</CardTitle>
          <CardDescription>
            Step-by-step breakdown showing visitor drop-off and conversion rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.steps.map((step, index) => {
              const conversionWidth =
                index === 0
                  ? 100
                  : data.steps[0].uniqueVisitors > 0
                    ? (step.uniqueVisitors / data.steps[0].uniqueVisitors) * 100
                    : 0

              return (
                <div key={step.stepId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Step {step.position + 1}
                        </span>
                        <span className="font-semibold">{step.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>{step.uniqueVisitors.toLocaleString()} visitors</span>
                        <span>{step.views.toLocaleString()} views</span>
                      </div>
                    </div>

                    <div className="text-right">
                      {step.conversionToNext && (
                        <div className="flex items-center gap-2">
                          {parseFloat(step.conversionToNext) >= 50 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <span
                            className={`text-sm font-medium ${parseFloat(step.conversionToNext) >= 50 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {step.conversionToNext}%  Next Step
                          </span>
                        </div>
                      )}
                      {step.dropOffRate && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {step.dropOffRate}% drop-off
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visual Funnel Bar */}
                  <div className="w-full h-8 bg-muted rounded overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                      style={{ width: `${conversionWidth}%` }}
                    >
                      <div className="flex items-center justify-center h-full text-white text-xs font-medium">
                        {conversionWidth.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {index < data.steps.length - 1 && (
                    <div className="flex justify-center py-2">
                      <TrendingDown className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Device & Source Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
            <CardDescription>Traffic distribution by device type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Desktop</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">{data.deviceBreakdown!.desktop.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {totalDeviceViews > 0
                      ? ((data.deviceBreakdown!.desktop / totalDeviceViews) * 100).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">Mobile</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">{data.deviceBreakdown!.mobile.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {totalDeviceViews > 0
                      ? ((data.deviceBreakdown!.mobile / totalDeviceViews) * 100).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  <Tablet className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Tablet</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">{data.deviceBreakdown!.tablet.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {totalDeviceViews > 0
                      ? ((data.deviceBreakdown!.tablet / totalDeviceViews) * 100).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
            <CardDescription>Top UTM sources for this funnel</CardDescription>
          </CardHeader>
          <CardContent>
            {data.sourceBreakdown && data.sourceBreakdown.length > 0 ? (
              <div className="space-y-3">
                {data.sourceBreakdown.slice(0, 5).map((source) => (
                  <div
                    key={source.source}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted"
                  >
                    <span className="font-medium">{source.source}</span>
                    <span className="font-bold">{source.count} visitors</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No UTM source data available yet</p>
                <p className="text-sm mt-2">
                  Traffic sources will appear here once visitors access your funnel
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
