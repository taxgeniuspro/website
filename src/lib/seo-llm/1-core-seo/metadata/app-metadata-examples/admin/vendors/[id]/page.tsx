import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Factory,
  Package,
  DollarSign,
  Clock,
  TrendingUp,
  Truck,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Star,
  Activity,
} from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getVendor(id: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      Order: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          User: true,
        },
      },
      VendorProduct: {
        include: {
          Product: true,
        },
      },
      VendorPaperStock: {
        include: {
          PaperStock: true,
        },
      },
    },
  })

  return vendor
}

async function getVendorStats(vendorId: string) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  // Get all orders for this vendor
  const allOrders = await prisma.order.findMany({
    where: { vendorId },
    select: {
      id: true,
      total: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  // Calculate stats
  const totalOrders = allOrders.length
  const completedOrders = allOrders.filter((o) =>
    ['DELIVERED', 'SHIPPED'].includes(o.status)
  ).length
  const activeOrders = allOrders.filter(
    (o) => !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status)
  ).length
  const cancelledOrders = allOrders.filter((o) => o.status === 'CANCELLED').length

  // Revenue calculations
  const totalRevenue = allOrders
    .filter((o) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED')
    .reduce((sum, o) => sum + o.total, 0)

  const recentOrders = allOrders.filter((o) => new Date(o.createdAt) >= thirtyDaysAgo)
  const recentRevenue = recentOrders
    .filter((o) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED')
    .reduce((sum, o) => sum + o.total, 0)

  // Calculate average turnaround time (simplified - in production would track actual fulfillment times)
  const deliveredOrders = allOrders.filter((o) => o.status === 'DELIVERED')
  const avgTurnaround =
    deliveredOrders.length > 0
      ? deliveredOrders.reduce((sum, o) => {
          const days = Math.floor(
            (new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
          return sum + days
        }, 0) / deliveredOrders.length
      : 0

  // Calculate performance metrics
  const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
  const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0

  // Monthly trend data (simplified)
  const monthlyData: any[] = []
  for (let i = 5; i >= 0; i--) {
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - i)
    startDate.setDate(1)

    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)

    const monthOrders = allOrders.filter((o) => {
      const orderDate = new Date(o.createdAt)
      return orderDate >= startDate && orderDate < endDate
    })

    monthlyData.push({
      month: startDate.toLocaleDateString('en-US', { month: 'short' }),
      orders: monthOrders.length,
      revenue:
        monthOrders
          .filter((o) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED')
          .reduce((sum, o) => sum + o.total, 0) / 100,
    })
  }

  return {
    totalOrders,
    completedOrders,
    activeOrders,
    cancelledOrders,
    totalRevenue: totalRevenue / 100,
    recentRevenue: recentRevenue / 100,
    avgTurnaround: avgTurnaround.toFixed(1),
    completionRate: completionRate.toFixed(1),
    cancellationRate: cancellationRate.toFixed(1),
    monthlyData,
    recentOrdersCount: recentOrders.length,
  }
}

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: 'Pending Payment', color: 'bg-yellow-100 text-yellow-800' },
  PAID: { label: 'Paid', color: 'bg-green-100 text-green-800' },
  PROCESSING: { label: 'Processing', color: 'bg-blue-100 text-blue-800' },
  PRINTING: { label: 'Printing', color: 'bg-purple-100 text-purple-800' },
  QUALITY_CHECK: { label: 'Quality Check', color: 'bg-indigo-100 text-indigo-800' },
  PACKAGING: { label: 'Packaging', color: 'bg-cyan-100 text-cyan-800' },
  SHIPPED: { label: 'Shipped', color: 'bg-teal-100 text-teal-800' },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
  REFUNDED: { label: 'Refunded', color: 'bg-red-100 text-red-800' },
}

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [vendor, stats] = await Promise.all([getVendor(id), getVendorStats(id)])

  if (!vendor) {
    notFound()
  }

  const address = vendor.address as any

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/vendors">
            <Button size="icon" variant="ghost">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Factory className="h-8 w-8" />
              {vendor.name}
            </h1>
            <p className="text-muted-foreground">Vendor Performance & Management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="gap-1" variant={vendor.isActive ? 'default' : 'secondary'}>
            {vendor.isActive ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Active
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" />
                Inactive
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeOrders} active, {stats.completedOrders} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${stats.recentRevenue.toFixed(2)} last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Turnaround</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgTurnaround} days</div>
            <p className="text-xs text-muted-foreground">Target: {vendor.turnaroundDays} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.cancellationRate}% cancellation rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Trends
          </CardTitle>
          <CardDescription>Monthly order volume and revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.monthlyData.map((month, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-16 text-sm font-medium">{month.month}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 bg-primary rounded"
                      style={{
                        width: `${(month.orders / Math.max(...stats.monthlyData.map((m) => m.orders))) * 100}%`,
                        minWidth: '2px',
                      }}
                    />
                    <span className="text-sm text-muted-foreground">{month.orders} orders</span>
                  </div>
                </div>
                <div className="text-sm font-medium">${month.revenue.toFixed(0)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs className="space-y-4" defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Recent Orders</TabsTrigger>
          <TabsTrigger value="details">Vendor Details</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
        </TabsList>

        {/* Recent Orders Tab */}
        <TabsContent className="space-y-4" value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Last 50 orders assigned to this vendor</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendor.Order.length === 0 ? (
                    <TableRow>
                      <TableCell className="text-center py-8 text-muted-foreground" colSpan={6}>
                        No orders assigned yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    vendor.Order.map((order) => {
                      const status = statusConfig[order.status] || statusConfig.PENDING_PAYMENT
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.referenceNumber || order.orderNumber}
                          </TableCell>
                          <TableCell>{order.User?.name || 'Guest'}</TableCell>
                          <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge className={status.color}>{status.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            ${(order.total / 100).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Link href={`/admin/orders/${order.id}`}>
                              <Button size="sm" variant="ghost">
                                View
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendor Details Tab */}
        <TabsContent className="space-y-4" value="details">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Contact Email</p>
                    <p className="text-sm text-muted-foreground">{vendor.contactEmail}</p>
                  </div>
                </div>
                {vendor.orderEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Order Email</p>
                      <p className="text-sm text-muted-foreground">{vendor.orderEmail}</p>
                    </div>
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{vendor.phone}</p>
                    </div>
                  </div>
                )}
                {vendor.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Website</p>
                      <a
                        className="text-sm text-blue-600 hover:underline"
                        href={vendor.website}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {vendor.website}
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Location & Shipping</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Address</p>
                      <p className="text-sm text-muted-foreground">
                        {address.street}
                        <br />
                        {address.city}, {address.state} {address.zip}
                        <br />
                        {address.country}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Supported Carriers</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {vendor.supportedCarriers.map((carrier) => (
                        <Badge key={carrier} className="text-xs" variant="secondary">
                          {carrier}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Turnaround Time</p>
                    <p className="text-sm text-muted-foreground">{vendor.turnaroundDays} days</p>
                  </div>
                </div>
                {vendor.minimumOrderAmount && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Minimum Order</p>
                      <p className="text-sm text-muted-foreground">
                        ${vendor.minimumOrderAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {vendor.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{vendor.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Products Tab */}
        <TabsContent className="space-y-4" value="products">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Products</CardTitle>
              <CardDescription>
                Products this vendor can fulfill ({vendor.VendorProduct.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vendor.VendorProduct.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No products assigned to this vendor yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Vendor SKU</TableHead>
                      <TableHead>Vendor Price</TableHead>
                      <TableHead>Preferred</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendor.VendorProduct.map((vp) => (
                      <TableRow key={vp.id}>
                        <TableCell className="font-medium">{vp.Product.name}</TableCell>
                        <TableCell>{vp.Product.sku}</TableCell>
                        <TableCell>{vp.vendorSku || '-'}</TableCell>
                        <TableCell>
                          {vp.vendorPrice ? `$${vp.vendorPrice.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          {vp.isPreferred && (
                            <Badge className="gap-1" variant="default">
                              <Star className="h-3 w-3" />
                              Preferred
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Tab */}
        <TabsContent className="space-y-4" value="integration">
          <Card>
            <CardHeader>
              <CardTitle>Integration Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">n8n Webhook URL</p>
                {vendor.n8nWebhookUrl ? (
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                      {vendor.n8nWebhookUrl}
                    </code>
                    <Badge className="gap-1" variant="default">
                      <Activity className="h-3 w-3" />
                      Connected
                    </Badge>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not configured</p>
                )}
              </div>

              {vendor.shippingCostFormula && (
                <div>
                  <p className="text-sm font-medium mb-1">Shipping Cost Formula</p>
                  <p className="text-sm text-muted-foreground">{vendor.shippingCostFormula}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-1">Integration Status</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {vendor.n8nWebhookUrl ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                    <span className="text-sm">
                      Webhook notifications {vendor.n8nWebhookUrl ? 'enabled' : 'not configured'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {vendor.orderEmail ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                    <span className="text-sm">
                      Email notifications {vendor.orderEmail ? 'enabled' : 'not configured'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
