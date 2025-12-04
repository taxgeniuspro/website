'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  BarChart3,
  TrendingUp,
  Clock,
  AlertTriangle,
  Calendar as CalendarIcon,
  ArrowLeft,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts'
import { format } from 'date-fns'
import { toast } from 'sonner'
import * as Icons from 'lucide-react'

interface StatusAnalytics {
  slug: string
  name: string
  icon: string
  badgeColor: string
  orderCount: number
  avgTimeMs: number
  avgTimeHours: number
  avgTimeDays: number
  avgTimeFormatted: string
}

interface AnalyticsData {
  success: boolean
  dateRange: {
    start: string
    end: string
  }
  summary: {
    totalOrders: number
    activeStatuses: number
    totalStatuses: number
    avgProcessingTimeMs: number
    avgProcessingTimeDays: number
  }
  statusAnalytics: StatusAnalytics[]
  bottlenecks: StatusAnalytics[]
  transitionMatrix: Array<{
    from: string
    to: string
    count: number
  }>
  timeSeriesData: Array<{
    date: string
    count: number
  }>
}

export default function OrderStatusAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ) // 30 days ago
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchAnalytics = async () => {
    try {
      setIsRefreshing(true)
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate.toISOString())
      if (endDate) params.append('endDate', endDate.toISOString())

      const response = await fetch(`/api/admin/order-statuses/analytics?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const analyticsData: AnalyticsData = await response.json()
      setData(analyticsData)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [startDate, endDate])

  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName]
    return IconComponent || Icons.Circle
  }

  // Define a color palette for charts
  const CHART_COLORS = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order Status Analytics</h1>
            <p className="text-muted-foreground mt-2">Loading analytics data...</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order Status Analytics</h1>
            <p className="text-muted-foreground mt-2">Failed to load analytics</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <p className="text-muted-foreground">Unable to load analytics data</p>
              <Button onClick={fetchAnalytics}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/settings/order-statuses">
            <Button size="sm" variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Statuses
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order Status Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Performance insights and bottleneck detection
            </p>
          </div>
        </div>
        <Button disabled={isRefreshing} size="sm" variant="outline" onClick={fetchAnalytics}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
          <CardDescription>Select the period for analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground" htmlFor="startDate">
                From:
              </Label>
              <Input
                className="w-[180px]"
                id="startDate"
                type="date"
                value={startDate ? startDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setStartDate(new Date(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground" htmlFor="endDate">
                To:
              </Label>
              <Input
                className="w-[180px]"
                id="endDate"
                type="date"
                value={endDate ? endDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setEndDate(new Date(e.target.value))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setStartDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
                  setEndDate(new Date())
                }}
              >
                Last 7 Days
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setStartDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
                  setEndDate(new Date())
                }}
              >
                Last 30 Days
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setStartDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
                  setEndDate(new Date())
                }}
              >
                Last 90 Days
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalOrders}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Statuses</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.activeStatuses} / {data.summary.totalStatuses}
            </div>
            <p className="text-xs text-muted-foreground">Statuses with orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.avgProcessingTimeDays.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">Days per order</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bottlenecks Detected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.bottlenecks.length}</div>
            <p className="text-xs text-muted-foreground">Slow statuses</p>
          </CardContent>
        </Card>
      </div>

      {/* Bottlenecks Alert */}
      {data.bottlenecks.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
              <AlertTriangle className="h-5 w-5" />
              Detected Bottlenecks
            </CardTitle>
            <CardDescription className="text-orange-800 dark:text-orange-200">
              These statuses have the longest average processing times
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.bottlenecks.map((bottleneck, index) => {
                const StatusIcon = getIconComponent(bottleneck.icon)
                return (
                  <div
                    key={bottleneck.slug}
                    className="flex items-center justify-between rounded-lg bg-white dark:bg-orange-900 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className="bg-orange-200 text-orange-900" variant="secondary">
                        #{index + 1}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <StatusIcon className="h-5 w-5" />
                        <span className="font-medium">{bottleneck.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{bottleneck.avgTimeFormatted}</div>
                        <div className="text-xs text-muted-foreground">
                          {bottleneck.orderCount} orders
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Average Time in Each Status - Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Average Time in Each Status</CardTitle>
          <CardDescription>How long orders spend in each status on average</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer height={400} width="100%">
            <BarChart
              data={data.statusAnalytics.filter((s) => s.orderCount > 0)}
              margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                angle={-45}
                dataKey="name"
                height={100}
                textAnchor="end"
                tick={{ fontSize: 12 }}
              />
              <YAxis label={{ angle: -90, position: 'insideLeft', value: 'Days' }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as StatusAnalytics
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid gap-2">
                          <div className="font-medium">{data.name}</div>
                          <div className="text-sm">
                            <span className="font-medium">{data.avgTimeFormatted}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {data.orderCount} orders
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="avgTimeDays" radius={[8, 8, 0, 0]}>
                {data.statusAnalytics
                  .filter((s) => s.orderCount > 0)
                  .map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Order Volume Over Time - Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Order Volume Trend</CardTitle>
          <CardDescription>Daily order count over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer height={300} width="100%">
            <LineChart
              data={data.timeSeriesData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              />
              <YAxis label={{ angle: -90, position: 'insideLeft', value: 'Orders' }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid gap-2">
                          <div className="text-sm font-medium">
                            {format(new Date(data.date), 'PPP')}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">{data.count} orders</span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Line
                activeDot={{ r: 8 }}
                dataKey="count"
                dot={{ r: 4 }}
                stroke="#3b82f6"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Order Distribution by Status</CardTitle>
          <CardDescription>Number of orders in each status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.statusAnalytics
              .filter((s) => s.orderCount > 0)
              .sort((a, b) => b.orderCount - a.orderCount)
              .map((status) => {
                const StatusIcon = getIconComponent(status.icon)
                const percentage = (status.orderCount / data.summary.totalOrders) * 100
                return (
                  <div key={status.slug} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">{status.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {status.orderCount} orders
                        </span>
                        <Badge variant="secondary">{percentage.toFixed(1)}%</Badge>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>

      {/* Status Transition Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Status Transition Frequency</CardTitle>
          <CardDescription>Most common status changes in your workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.transitionMatrix
              .sort((a, b) => b.count - a.count)
              .slice(0, 10)
              .map((transition, index) => (
                <div
                  key={`${transition.from}-${transition.to}`}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge className="bg-muted text-muted-foreground" variant="secondary">
                      #{index + 1}
                    </Badge>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{transition.from}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium">{transition.to}</span>
                    </div>
                  </div>
                  <Badge>{transition.count} times</Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
