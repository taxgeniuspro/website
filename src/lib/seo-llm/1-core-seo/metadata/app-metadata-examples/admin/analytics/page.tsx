import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CalendarDays,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  BarChart3,
  Download,
  Filter,
} from 'lucide-react'
import { AnalyticsService, type DateRange } from '@/lib/admin/analytics'
import { RevenueChart } from '@/components/admin/analytics/revenue-chart'
import { OrderStatusChart } from '@/components/admin/analytics/order-status-chart'
import { CustomerInsightsChart } from '@/components/admin/analytics/customer-insights-chart'
import { ProductPerformanceChart } from '@/components/admin/analytics/product-performance-chart'
import { TopCustomersTable } from '@/components/admin/analytics/top-customers-table'
import { TopProductsTable } from '@/components/admin/analytics/top-products-table'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface AnalyticsPageProps {
  searchParams: {
    period?: string
  }
}

async function getAnalyticsData(period: string = '30d') {
  const now = new Date()
  let dateRange: DateRange

  switch (period) {
    case '7d':
      dateRange = {
        from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        to: now,
      }
      break
    case '90d':
      dateRange = {
        from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        to: now,
      }
      break
    case '1y':
      dateRange = {
        from: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        to: now,
      }
      break
    default: // 30d
      dateRange = {
        from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        to: now,
      }
  }

  try {
    const [metrics, chartData, topCustomers, orderStatus] = await Promise.all([
      AnalyticsService.getMetrics(dateRange),
      AnalyticsService.getChartData(dateRange),
      AnalyticsService.getTopCustomers(dateRange),
      AnalyticsService.getOrderStatusBreakdown(dateRange),
    ])

    return {
      metrics,
      chartData,
      topCustomers,
      orderStatus,
      period,
    }
  } catch (error) {
    return {
      metrics: null,
      chartData: [],
      topCustomers: [],
      orderStatus: [],
      period,
      error: 'Failed to load analytics data',
    }
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function formatPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

function MetricCard({
  title,
  value,
  change,
  icon,
  subtitle,
}: {
  title: string
  value: string
  change?: number
  icon: React.ReactNode
  subtitle?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div
            className={`text-xs flex items-center ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            <TrendingUp className={`h-3 w-3 mr-1 ${change < 0 ? 'rotate-180' : ''}`} />
            {formatPercent(change)} from last period
          </div>
        )}
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const period = searchParams.period || '30d'
  const data = await getAnalyticsData(period)

  if (data.error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">
              Comprehensive business insights and performance metrics
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Unable to Load Analytics</h3>
              <p className="text-muted-foreground">{data.error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { metrics, chartData, topCustomers, orderStatus } = data

  if (!metrics) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
          <p className="text-muted-foreground">No data available for the selected period</p>
        </div>
      </div>
    )
  }

  const periodLabels = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    '1y': 'Last year',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive business insights and performance metrics for{' '}
            {periodLabels[period as keyof typeof periodLabels]}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Period Selection */}
      <div className="flex gap-2">
        {Object.entries(periodLabels).map(([key, label]) => (
          <Button key={key} asChild size="sm" variant={period === key ? 'default' : 'outline'}>
            <a href={`/admin/analytics?period=${key}`}>{label}</a>
          </Button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          change={metrics.revenue.growth}
          icon={<DollarSign className="h-4 w-4 text-green-600" />}
          subtitle={`${formatCurrency(metrics.revenue.previousPeriod)} previous period`}
          title="Total Revenue"
          value={formatCurrency(metrics.revenue.total)}
        />

        <MetricCard
          change={metrics.orders.growth}
          icon={<ShoppingCart className="h-4 w-4 text-blue-600" />}
          subtitle={`${metrics.orders.previousPeriod} previous period`}
          title="Total Orders"
          value={metrics.orders.total.toString()}
        />

        <MetricCard
          change={metrics.customers.growth}
          icon={<Users className="h-4 w-4 text-purple-600" />}
          subtitle={`${metrics.customers.new} new, ${metrics.customers.returning} returning`}
          title="Active Customers"
          value={metrics.customers.total.toString()}
        />

        <MetricCard
          icon={<TrendingUp className="h-4 w-4 text-orange-600" />}
          subtitle={`${metrics.conversion.repeatCustomerRate.toFixed(1)}% repeat customers`}
          title="Avg Order Value"
          value={formatCurrency(metrics.conversion.averageOrderValue)}
        />
      </div>

      {/* Analytics Tabs */}
      <Tabs className="space-y-6" defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent className="space-y-6" value="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Daily revenue over the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-[300px] animate-pulse bg-muted rounded" />}>
                  <RevenueChart data={chartData} showDetailedTooltip={true} />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Status Distribution</CardTitle>
                <CardDescription>Current status of all orders</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-[300px] animate-pulse bg-muted rounded" />}>
                  <OrderStatusChart data={orderStatus} />
                </Suspense>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Best performing products by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-[300px] animate-pulse bg-muted rounded" />}>
                  <TopProductsTable
                    products={metrics.products.topSelling.map((product) => ({
                      id: product.id,
                      name: product.name,
                      orderCount: product.quantity,
                      revenue: product.revenue,
                      category: 'General', // Default category as we don't have it in the current data
                    }))}
                  />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>Highest value customers this period</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-[300px] animate-pulse bg-muted rounded" />}>
                  <TopCustomersTable customers={topCustomers} />
                </Suspense>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent className="space-y-6" value="products">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Product Performance</CardTitle>
                <CardDescription>Revenue by product category</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-[300px] animate-pulse bg-muted rounded" />}>
                  <ProductPerformanceChart
                    data={metrics.products.categories.map((cat) => ({
                      category: cat.name,
                      revenue: cat.revenue,
                      orders: cat.orders,
                    }))}
                  />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>Orders and revenue by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.products.categories.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-sm text-muted-foreground">{category.orders} orders</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(category.revenue)}</p>
                        <Badge className="text-xs" variant="outline">
                          {((category.revenue / metrics.revenue.total) * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Products Performance</CardTitle>
              <CardDescription>Detailed breakdown of all products</CardDescription>
            </CardHeader>
            <CardContent>
              <TopProductsTable
                products={metrics.products.topSelling.map((product) => ({
                  id: product.id,
                  name: product.name,
                  orderCount: product.quantity,
                  revenue: product.revenue,
                  category: 'General',
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent className="space-y-6" value="customers">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Customer Insights</CardTitle>
                <CardDescription>Customer behavior and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-[300px] animate-pulse bg-muted rounded" />}>
                  <CustomerInsightsChart
                    newCustomers={metrics.customers.new}
                    returningCustomers={metrics.customers.returning}
                    totalCustomers={metrics.customers.total}
                  />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Metrics</CardTitle>
                <CardDescription>Key customer performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Active Customers</span>
                    <span className="font-semibold">{metrics.customers.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">New Customers</span>
                    <span className="font-semibold">{metrics.customers.new}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Returning Customers</span>
                    <span className="font-semibold">{metrics.customers.returning}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Repeat Customer Rate</span>
                    <span className="font-semibold">
                      {metrics.conversion.repeatCustomerRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Average Order Value</span>
                    <span className="font-semibold">
                      {formatCurrency(metrics.conversion.averageOrderValue)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
              <CardDescription>Highest value customers this period</CardDescription>
            </CardHeader>
            <CardContent>
              <TopCustomersTable customers={topCustomers} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent className="space-y-6" value="orders">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Order Status Breakdown</CardTitle>
                <CardDescription>Distribution of order statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <OrderStatusChart data={orderStatus} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Metrics</CardTitle>
                <CardDescription>Key order performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Orders</span>
                    <span className="font-semibold">{metrics.orders.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Order Growth</span>
                    <span
                      className={`font-semibold ${metrics.orders.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatPercent(metrics.orders.growth)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Average Order Value</span>
                    <span className="font-semibold">
                      {formatCurrency(metrics.conversion.averageOrderValue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Conversion Rate</span>
                    <span className="font-semibold">{metrics.conversion.rate}%</span>
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
