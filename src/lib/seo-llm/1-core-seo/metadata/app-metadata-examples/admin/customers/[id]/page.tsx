import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building,
  Calendar,
  DollarSign,
  Package,
  FileText,
  Edit,
  MessageSquare,
  TrendingUp,
  Clock,
  MapPin,
  UserCheck,
  UserX,
  Star,
  Tag,
  ShoppingCart,
  CreditCard,
  ChevronRight,
  History,
  AlertCircle,
  CheckCircle,
  XCircle,
  Truck,
  Printer,
} from 'lucide-react'
import { BrokerDiscountButton } from '@/components/admin/broker-discount-button'
import { BrokerDiscountDisplay } from '@/components/admin/broker-discount-display'
import { EditCustomerButton } from '@/components/admin/edit-customer-button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Status configuration (matching orders page)
const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING_PAYMENT: {
    label: 'Pending Payment',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    icon: Clock,
  },
  PAID: {
    label: 'Paid',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    icon: DollarSign,
  },
  PROCESSING: {
    label: 'Processing',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    icon: Package,
  },
  PRINTING: {
    label: 'Printing',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    icon: Printer,
  },
  SHIPPED: {
    label: 'Shipped',
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400',
    icon: Truck,
  },
  DELIVERED: {
    label: 'Delivered',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    icon: CheckCircle,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    icon: XCircle,
  },
  REFUNDED: {
    label: 'Refunded',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    icon: AlertCircle,
  },
}

// Broker tier configuration
const brokerTiers = [
  { value: 'NONE', label: 'Regular Customer', discount: 0 },
  { value: 'BRONZE', label: 'Bronze Broker', discount: 5 },
  { value: 'SILVER', label: 'Silver Broker', discount: 10 },
  { value: 'GOLD', label: 'Gold Broker', discount: 15 },
  { value: 'PLATINUM', label: 'Platinum Broker', discount: 20 },
]

async function getCustomer(id: string) {
  const customer = await prisma.user.findUnique({
    where: { id },
    include: {
      Order: {
        include: {
          OrderItem: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  return customer
}

async function getCustomerStats(customerId: string) {
  const orders = await prisma.order.findMany({
    where: {
      userId: customerId,
      status: {
        notIn: ['CANCELLED', 'REFUNDED'],
      },
    },
  })

  const totalSpent = orders.reduce((sum, order) => sum + order.total, 0)
  const averageOrderValue = orders.length > 0 ? totalSpent / orders.length : 0
  const lastOrderDate = orders.length > 0 ? orders[0].createdAt : null

  // Get monthly order trend (last 6 months)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const recentOrders = await prisma.order.findMany({
    where: {
      userId: customerId,
      createdAt: { gte: sixMonthsAgo },
      status: { notIn: ['CANCELLED', 'REFUNDED'] },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Group by month
  const monthlyOrders = recentOrders.reduce(
    (acc, order) => {
      const month = new Date(order.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
      if (!acc[month]) {
        acc[month] = { count: 0, revenue: 0 }
      }
      acc[month].count++
      acc[month].revenue += order.total
      return acc
    },
    {} as Record<string, { count: number; revenue: number }>
  )

  return {
    totalOrders: orders.length,
    totalSpent: totalSpent / 100,
    averageOrderValue: averageOrderValue / 100,
    lastOrderDate,
    monthlyOrders,
  }
}

// Generate activity timeline
function getActivityTimeline(customer: any) {
  const activities: any[] = []

  // Account created
  activities.push({
    type: 'account',
    icon: User,
    title: 'Account created',
    description: 'Customer joined the platform',
    date: customer.createdAt,
  })

  // Email verified
  if (customer.emailVerified) {
    activities.push({
      type: 'verification',
      icon: UserCheck,
      title: 'Email verified',
      description: 'Customer verified their email address',
      date: customer.emailVerified,
    })
  }

  // Orders
  customer.Order.forEach((order: any) => {
    activities.push({
      type: 'order',
      icon: ShoppingCart,
      title: `Order #${order.orderNumber}`,
      description: `${order.OrderItem.length} items - $${(order.total / 100).toFixed(2)}`,
      date: order.createdAt,
      link: `/admin/orders/${order.id}`,
    })
  })

  // Sort by date (newest first)
  return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customer = await getCustomer(id)

  if (!customer || customer.role !== 'CUSTOMER') {
    notFound()
  }

  const stats = await getCustomerStats(customer.id)
  const activities = getActivityTimeline(customer)

  // Determine customer tags based on behavior
  const tags: any[] = []
  if (stats.totalOrders === 0) tags.push({ label: 'New Customer', color: 'outline' })
  if (stats.totalOrders > 10) tags.push({ label: 'Loyal Customer', color: 'default' })
  if (stats.totalSpent > 1000) tags.push({ label: 'High Value', color: 'default' })
  if (stats.totalSpent > 5000) tags.push({ label: 'VIP', color: 'default' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/customers">
            <Button size="icon" variant="ghost">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {customer.name || 'Unknown Customer'}
            </h1>
            <p className="text-muted-foreground">
              Customer since{' '}
              {new Date(customer.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EditCustomerButton
            customer={{
              id: customer.id,
              name: customer.name || '',
              email: customer.email,
              phoneNumber: customer.phoneNumber,
            }}
          />
          <Button disabled>
            <MessageSquare className="mr-2 h-4 w-4" />
            Send Message
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs className="space-y-4" defaultValue="orders">
            <TabsList>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="broker">Broker Settings</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            {/* Orders Tab */}
            <TabsContent className="space-y-4" value="orders">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Order History</CardTitle>
                      <CardDescription>Last 10 orders from this customer</CardDescription>
                    </div>
                    <Link href={`/admin/orders?search=${customer.email}`}>
                      <Button size="sm" variant="outline">
                        View All Orders
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {customer.Order.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">No orders yet</p>
                      <p className="text-xs text-muted-foreground">
                        Orders will appear here when the customer makes a purchase
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order</TableHead>
                            <TableHead>Products</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customer.Order.map((order) => {
                            const status =
                              statusConfig[order.status] || statusConfig.PENDING_PAYMENT
                            const StatusIcon = status.icon

                            return (
                              <TableRow key={order.id}>
                                <TableCell>
                                  <Link
                                    className="font-medium hover:underline"
                                    href={`/admin/orders/${order.id}`}
                                  >
                                    {order.orderNumber}
                                  </Link>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <p>{order.OrderItem.length} items</p>
                                    {order.OrderItem[0] && (
                                      <p className="text-xs text-muted-foreground">
                                        {order.OrderItem[0].productName}
                                        {order.OrderItem.length > 1 &&
                                          ` +${order.OrderItem.length - 1} more`}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`${status.color} gap-1`}>
                                    <StatusIcon className="h-3 w-3" />
                                    {status.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  ${(order.total / 100).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent className="space-y-4" value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                  <CardDescription>Recent customer interactions and events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activities.slice(0, 20).map((activity, index) => {
                      const ActivityIcon = activity.icon
                      return (
                        <div key={index} className="flex gap-3">
                          <div className="relative flex flex-col items-center">
                            <div className="rounded-full p-2 bg-muted">
                              <ActivityIcon className="h-4 w-4" />
                            </div>
                            {index < activities.length - 1 && (
                              <div className="w-0.5 h-16 bg-muted mt-2" />
                            )}
                          </div>
                          <div className="flex-1 pt-1">
                            <div className="flex items-center gap-2">
                              {'link' in activity && activity.link ? (
                                <Link
                                  className="font-medium hover:underline"
                                  href={activity.link as string}
                                >
                                  {activity.title}
                                </Link>
                              ) : (
                                <p className="font-medium">{activity.title}</p>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(activity.date).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Broker Settings Tab */}
            <TabsContent className="space-y-4" value="broker">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Broker Configuration</CardTitle>
                      <CardDescription>
                        Manage category-specific discounts for this customer
                      </CardDescription>
                    </div>
                    <BrokerDiscountButton
                      currentDiscounts={customer.brokerDiscounts as Record<string, number> | null}
                      customerId={customer.id}
                      customerName={customer.name || customer.email}
                      isBroker={customer.isBroker || false}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Broker Status</Label>
                      <div className="flex items-center gap-2">
                        <Badge variant={customer.isBroker ? 'default' : 'outline'}>
                          {customer.isBroker ? 'Broker Account' : 'Regular Customer'}
                        </Badge>
                        {customer.isBroker && customer.brokerDiscounts && (
                          <span className="text-sm text-muted-foreground">
                            {Object.keys(customer.brokerDiscounts as Record<string, number>).length}{' '}
                            categories configured
                          </span>
                        )}
                      </div>
                    </div>

                    {customer.isBroker && (
                      <>
                        <Separator />
                        <BrokerDiscountDisplay
                          discounts={customer.brokerDiscounts as Record<string, number> | null}
                          isBroker={customer.isBroker}
                        />
                      </>
                    )}

                    {!customer.isBroker && (
                      <div className="rounded-lg border bg-muted/50 p-4">
                        <p className="text-sm text-muted-foreground">
                          This customer is not currently set up as a broker. Click "Set Broker
                          Discounts" to configure category-specific discounts and automatically
                          enable broker status.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent className="space-y-4" value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Notes</CardTitle>
                  <CardDescription>Internal notes and communication history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>Internal Notes</Label>
                      <Textarea
                        className="mt-2"
                        placeholder="Add notes about this customer..."
                        rows={6}
                      />
                    </div>

                    <div>
                      <Label>Communication Log</Label>
                      <div className="mt-2 space-y-2 rounded-md border p-4">
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No communication history yet
                        </p>
                      </div>
                    </div>

                    <Button disabled>Save Notes</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {customer.emailVerified ? (
                    <Badge className="gap-1" variant="default">
                      <UserCheck className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge className="gap-1" variant="secondary">
                      <UserX className="h-3 w-3" />
                      Unverified
                    </Badge>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{customer.email}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Customer Account</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Joined {new Date(customer.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Customer Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Lifetime Value</p>
                  <p className="text-2xl font-bold">${stats.totalSpent.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{stats.totalOrders}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Order Value</p>
                  <p className="text-2xl font-bold">${stats.averageOrderValue.toFixed(2)}</p>
                </div>
                {stats.lastOrderDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Last Order</p>
                    <p className="text-sm font-medium">
                      {new Date(stats.lastOrderDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Customer Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant={tag.color as any}>
                    {tag.label}
                  </Badge>
                ))}
                <Button disabled size="sm" variant="outline">
                  + Add Tag
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button disabled className="w-full justify-start" variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              <Button disabled className="w-full justify-start" variant="outline">
                <CreditCard className="h-4 w-4 mr-2" />
                Process Refund
              </Button>
              <Button disabled className="w-full justify-start" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
              <Button disabled className="w-full justify-start" variant="outline">
                <Star className="h-4 w-4 mr-2" />
                Add to VIP List
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
