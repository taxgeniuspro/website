'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Mail,
  Users,
  MousePointer,
  DollarSign,
  Calendar,
  Target,
  Zap,
  MessageSquare,
} from 'lucide-react'

interface AnalyticsData {
  campaigns: {
    total: number
    sent: number
    active: number
    deliveryRate: number
    openRate: number
    clickRate: number
  }
  workflows: {
    total: number
    active: number
    executions: number
    completionRate: number
  }
  segments: {
    total: number
    customers: number
  }
  performance: {
    revenue: number
    orders: number
    avgOrderValue: number
    conversionRate: number
  }
  trends: {
    period: string
    campaigns: number[]
    opens: number[]
    clicks: number[]
    revenue: number[]
  }
}

export default function MarketingAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/marketing/analytics?dateRange=${dateRange}`)
      if (response.ok) {
        const data = await response.json()
        // Set real data from API
        setAnalytics({
          campaigns: data.campaigns,
          workflows: data.workflows,
          segments: data.segments,
          performance: data.performance,
          trends: {
            period: dateRange,
            campaigns: [], // Would need time-series data
            opens: [],
            clicks: [],
            revenue: [],
          },
        })
      }
    } catch (error) {
      console.error('Failed to fetch marketing analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (loading) {
    return <div className="p-6">Loading analytics...</div>
  }

  if (!analytics) {
    return <div className="p-6">Error loading analytics data</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Analytics</h1>
          <p className="text-gray-600 mt-2">Track performance and measure success</p>
        </div>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(analytics.performance.revenue)}
                </p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+12.5%</span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Email Open Rate</p>
                <p className="text-3xl font-bold">{formatPercent(analytics.campaigns.openRate)}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+2.1%</span>
                </div>
              </div>
              <Mail className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Click Rate</p>
                <p className="text-3xl font-bold">{formatPercent(analytics.campaigns.clickRate)}</p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600">-0.3%</span>
                </div>
              </div>
              <MousePointer className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-3xl font-bold">
                  {formatPercent(analytics.performance.conversionRate)}
                </p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+0.5%</span>
                </div>
              </div>
              <Target className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs className="space-y-6" defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Campaigns Analytics */}
        <TabsContent className="space-y-6" value="campaigns">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Campaigns</span>
                    <span className="font-semibold">{analytics.campaigns.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Campaigns Sent</span>
                    <span className="font-semibold">{analytics.campaigns.sent}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Campaigns</span>
                    <span className="font-semibold">{analytics.campaigns.active}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Delivery Rate</span>
                    <span className="font-semibold">
                      {formatPercent(analytics.campaigns.deliveryRate)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Open Rate</span>
                      <span className="font-semibold">
                        {formatPercent(analytics.campaigns.openRate)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${analytics.campaigns.openRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Click Rate</span>
                      <span className="font-semibold">
                        {formatPercent(analytics.campaigns.clickRate)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${analytics.campaigns.clickRate * 5}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Unsubscribe Rate</span>
                      <span className="font-semibold">0.2%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: '1%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">Welcome Series</p>
                      <p className="text-xs text-gray-500">45.2% open rate</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Top</Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">Holiday Sale</p>
                      <p className="text-xs text-gray-500">38.7% open rate</p>
                    </div>
                    <Badge variant="outline">Good</Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">Product Updates</p>
                      <p className="text-xs text-gray-500">28.1% open rate</p>
                    </div>
                    <Badge variant="outline">Average</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Automation Analytics */}
        <TabsContent className="space-y-6" value="automation">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Workflows</span>
                    <span className="font-semibold">{analytics.workflows.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Workflows</span>
                    <span className="font-semibold">{analytics.workflows.active}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Executions</span>
                    <span className="font-semibold">
                      {analytics.workflows.executions.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completion Rate</span>
                    <span className="font-semibold">
                      {formatPercent(analytics.workflows.completionRate)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">Welcome Series</p>
                      <p className="text-xs text-gray-500">456 executions</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      <Zap className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">Cart Abandonment</p>
                      <p className="text-xs text-gray-500">324 executions</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      <Zap className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">Win-back Campaign</p>
                      <p className="text-xs text-gray-500">89 executions</p>
                    </div>
                    <Badge variant="outline">Paused</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Segments Analytics */}
        <TabsContent className="space-y-6" value="segments">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Segment Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Segments</span>
                    <span className="font-semibold">{analytics.segments.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Customers</span>
                    <span className="font-semibold">
                      {analytics.segments.customers.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Segment Size</span>
                    <span className="font-semibold">
                      {Math.round(
                        analytics.segments.customers / analytics.segments.total
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Largest Segments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">All Customers</p>
                      <p className="text-xs text-gray-500">1,247 customers</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">38%</Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">VIP Customers</p>
                      <p className="text-xs text-gray-500">892 customers</p>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">27%</Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">New Customers</p>
                      <p className="text-xs text-gray-500">456 customers</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">14%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Analytics */}
        <TabsContent className="space-y-6" value="performance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Marketing Revenue</span>
                    <span className="font-semibold">
                      {formatCurrency(analytics.performance.revenue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Orders Generated</span>
                    <span className="font-semibold">{analytics.performance.orders}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Order Value</span>
                    <span className="font-semibold">
                      {formatCurrency(analytics.performance.avgOrderValue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Conversion Rate</span>
                    <span className="font-semibold">
                      {formatPercent(analytics.performance.conversionRate)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">Email</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(32100)}</p>
                      <p className="text-xs text-gray-500">71% of revenue</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-green-500" />
                      <span className="text-sm">SMS</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(8900)}</p>
                      <p className="text-xs text-gray-500">20% of revenue</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-500" />
                      <span className="text-sm">Automation</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(4230)}</p>
                      <p className="text-xs text-gray-500">9% of revenue</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
