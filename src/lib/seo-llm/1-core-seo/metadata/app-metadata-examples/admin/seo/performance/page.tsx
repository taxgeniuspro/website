'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Activity,
} from 'lucide-react'
import { subDays } from 'date-fns'

// Import new SEO dashboard components
import {
  SEOMetricsChart,
  type SEOMetricsDataPoint,
} from '@/components/seo/dashboard/SEOMetricsChart'
import { TrafficChart, type TrafficDataPoint } from '@/components/seo/dashboard/TrafficChart'
import {
  CoreWebVitalsCard,
  type CoreWebVitalsData,
} from '@/components/seo/dashboard/CoreWebVitalsCard'
import { DateRangePicker, type DateRange } from '@/components/seo/dashboard/DateRangePicker'
import { ExportButton } from '@/components/seo/dashboard/ExportButton'
import { DataRefreshIndicator } from '@/components/seo/dashboard/DataRefreshIndicator'
import { ComparisonModeToggle } from '@/components/seo/dashboard/ComparisonModeToggle'
import { CrawlerActivityDashboard } from '@/components/admin/seo/CrawlerActivityDashboard'

interface SEOAlert {
  type: string
  severity: string
  keyword: string
  oldValue: number
  newValue: number
  change: number
  suggestion: string
}

interface ProductReport {
  productName: string
  slug: string
  alerts: SEOAlert[]
  summary: {
    totalClicks: number
    totalImpressions: number
    avgPosition: number
    totalKeywords: number
  }
  rankings?: Array<{
    keyword: string
    position: number
    clicks: number
    impressions: number
    ctr: number
    positionChange?: number
  }>
}

interface AnalyticsData {
  sessions: number
  users: number
  pageviews: number
  bounceRate: number
}

interface PageSpeedData {
  scores: {
    performance: number
    accessibility: number
    bestPractices: number
    seo: number
  }
  vitals: CoreWebVitalsData
}

export default function SEOPerformancePage() {
  const [products, setProducts] = useState<ProductReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // New state for enhanced features
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(new Date(), 30),
    end: new Date(),
  })
  const [comparisonMode, setComparisonMode] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [pageSpeedData, setPageSpeedData] = useState<PageSpeedData | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)

  // Mock chart data (replace with real API calls)
  const [metricsChartData, setMetricsChartData] = useState<SEOMetricsDataPoint[]>([])
  const [trafficChartData, setTrafficChartData] = useState<TrafficDataPoint[]>([])

  const loadSEOData = async () => {
    setIsLoading(true)
    try {
      // Fetch all products with SEO metrics
      const response = await fetch('/api/products?includeSEOMetrics=true')
      const result = await response.json()

      // API returns { data: [...products] }
      const products = result.data || []

      const productsWithMetrics = products
        .filter((p: any) => p.seoMetrics)
        .map((p: any) => ({
          productName: p.Name || p.name,
          slug: p.Slug || p.slug,
          alerts: p.seoMetrics.alerts || [],
          summary: p.seoMetrics.summary || {
            totalClicks: 0,
            totalImpressions: 0,
            avgPosition: 0,
            totalKeywords: 0,
          },
          rankings: p.seoMetrics.rankings || [],
        }))

      setProducts(productsWithMetrics)
      setLastUpdated(new Date())

      // Generate chart data from products
      generateChartData(productsWithMetrics)
    } catch (error) {
      console.error('Failed to load SEO data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateChartData = (products: ProductReport[]) => {
    // Generate mock time series data (replace with real historical data)
    const days = 30
    const metricsData: SEOMetricsDataPoint[] = []
    const trafficData: TrafficDataPoint[] = []

    for (let i = days; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dateStr = date.toISOString().split('T')[0]

      // Aggregate data from all products
      const totalClicks = products.reduce((sum, p) => sum + p.summary.totalClicks, 0)
      const totalImpressions = products.reduce((sum, p) => sum + p.summary.totalImpressions, 0)
      const avgPosition =
        products.reduce((sum, p) => sum + p.summary.avgPosition, 0) / (products.length || 1)

      metricsData.push({
        date: dateStr,
        position: avgPosition + (Math.random() - 0.5) * 5, // Add some variation
        clicks: totalClicks / days + (Math.random() - 0.5) * 10,
        impressions: totalImpressions / days + (Math.random() - 0.5) * 100,
      })

      trafficData.push({
        date: dateStr,
        clicks: Math.floor(totalClicks / days + (Math.random() - 0.5) * 10),
        impressions: Math.floor(totalImpressions / days + (Math.random() - 0.5) * 100),
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      })
    }

    setMetricsChartData(metricsData)
    setTrafficChartData(trafficData)
  }

  const loadAnalyticsData = async () => {
    try {
      const startDate = dateRange.start.toISOString().split('T')[0]
      const endDate = dateRange.end.toISOString().split('T')[0]

      const response = await fetch(
        `/api/seo/analytics?type=traffic&startDate=${startDate}&endDate=${endDate}`
      )

      if (response.ok) {
        const result = await response.json()
        setAnalyticsData(result.data)
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error)
    }
  }

  const loadPageSpeedData = async () => {
    try {
      // Get first product URL for PageSpeed analysis
      const firstProduct = products[0]
      if (!firstProduct) return

      const url = `https://gangrunprinting.com/products/${firstProduct.slug}`
      const response = await fetch(`/api/seo/pagespeed?url=${encodeURIComponent(url)}&type=full`)

      if (response.ok) {
        const result = await response.json()
        setPageSpeedData(result.data)
      }
    } catch (error) {
      console.error('Failed to load PageSpeed data:', error)
    }
  }

  useEffect(() => {
    loadSEOData()
  }, [])

  useEffect(() => {
    if (products.length > 0) {
      loadAnalyticsData()
      loadPageSpeedData()
    }
  }, [dateRange, products])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'destructive'
      case 'HIGH':
        return 'warning'
      case 'MEDIUM':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'HIGH':
        return <TrendingDown className="h-4 w-4 text-orange-500" />
      default:
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />
    }
  }

  const criticalIssues = products.reduce(
    (sum, p) => sum + p.alerts.filter((a) => a.severity === 'CRITICAL').length,
    0
  )
  const highIssues = products.reduce(
    (sum, p) => sum + p.alerts.filter((a) => a.severity === 'HIGH').length,
    0
  )
  const improvements = products.reduce(
    (sum, p) => sum + p.alerts.filter((a) => a.type === 'RANKING_IMPROVE').length,
    0
  )

  // Prepare export data
  const exportData = {
    productName: selectedProduct || 'All Products',
    dateRange: {
      start: dateRange.start.toISOString().split('T')[0],
      end: dateRange.end.toISOString().split('T')[0],
    },
    rankings: products.flatMap((p) => p.rankings || []),
    summary: {
      totalClicks: products.reduce((sum, p) => sum + p.summary.totalClicks, 0),
      totalImpressions: products.reduce((sum, p) => sum + p.summary.totalImpressions, 0),
      avgPosition:
        products.reduce((sum, p) => sum + p.summary.avgPosition, 0) / (products.length || 1),
      totalKeywords: products.reduce((sum, p) => sum + p.summary.totalKeywords, 0),
    },
    alerts: products.flatMap((p) => p.alerts),
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">SEO Performance Dashboard</h1>
          <p className="text-muted-foreground">Monitor Google rankings, traffic, and performance</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <ComparisonModeToggle enabled={comparisonMode} onChange={setComparisonMode} />
          <ExportButton data={exportData} disabled={products.length === 0} />
        </div>
      </div>

      {/* Data Refresh Indicator */}
      <DataRefreshIndicator
        isLoading={isLoading}
        lastUpdate={lastUpdated}
        onRefresh={loadSEOData}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalIssues}</div>
            <p className="text-xs text-muted-foreground">Require immediate action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{highIssues}</div>
            <p className="text-xs text-muted-foreground">Action needed this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Improvements</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{improvements}</div>
            <p className="text-xs text-muted-foreground">Rankings improved</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Summary (if available) */}
      {analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.sessions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.users.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pageviews</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.pageviews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total pageviews</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.bounceRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Average bounce rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <Tabs className="space-y-4" defaultValue="metrics">
        <TabsList>
          <TabsTrigger value="metrics">SEO Metrics</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          {pageSpeedData && <TabsTrigger value="performance">Performance</TabsTrigger>}
          <TabsTrigger value="crawlers">🤖 Crawler Activity</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="metrics">
          <SEOMetricsChart
            data={metricsChartData}
            description="30-day trend of position, clicks, and impressions"
            title="Ranking & Traffic Trends"
          />
        </TabsContent>

        <TabsContent className="space-y-4" value="traffic">
          <TrafficChart
            data={trafficChartData}
            description="30-day traffic performance"
            title="Click & Impression Trends"
          />
        </TabsContent>

        {pageSpeedData && (
          <TabsContent className="space-y-4" value="performance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CoreWebVitalsCard
                data={pageSpeedData.vitals}
                description="Page performance metrics"
                title="Core Web Vitals"
              />
              <Card>
                <CardHeader>
                  <CardTitle>Lighthouse Scores</CardTitle>
                  <CardDescription>Performance audit results</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Performance</span>
                      <span className="text-sm font-bold">{pageSpeedData.scores.performance}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${pageSpeedData.scores.performance}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Accessibility</span>
                      <span className="text-sm font-bold">
                        {pageSpeedData.scores.accessibility}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600"
                        style={{ width: `${pageSpeedData.scores.accessibility}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Best Practices</span>
                      <span className="text-sm font-bold">
                        {pageSpeedData.scores.bestPractices}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600"
                        style={{ width: `${pageSpeedData.scores.bestPractices}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">SEO</span>
                      <span className="text-sm font-bold">{pageSpeedData.scores.seo}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-600"
                        style={{ width: `${pageSpeedData.scores.seo}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        <TabsContent className="space-y-4" value="crawlers">
          <CrawlerActivityDashboard />
        </TabsContent>
      </Tabs>

      {/* Product Reports */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Product SEO Reports</h2>
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Loading SEO data...</p>
            </CardContent>
          </Card>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                No SEO data available. Run daily SEO check to populate metrics.
              </p>
            </CardContent>
          </Card>
        ) : (
          products.map((product) => (
            <Card key={product.slug}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{product.productName}</CardTitle>
                    <CardDescription>/products/{product.slug}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{product.summary.totalKeywords} keywords</Badge>
                    <Badge variant="outline">
                      Avg pos: #{product.summary.avgPosition.toFixed(1)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {product.alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No issues detected for this product
                  </p>
                ) : (
                  product.alerts.map((alert, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getSeverityColor(alert.severity) as any}>
                            {alert.severity}
                          </Badge>
                          <span className="text-sm font-medium">{alert.keyword}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.suggestion}</p>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Was: #{alert.oldValue}</span>
                          <span>→</span>
                          <span>Now: #{alert.newValue}</span>
                          <span className="text-red-600">
                            ({alert.change >= 0 ? '+' : ''}
                            {alert.change} positions)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
