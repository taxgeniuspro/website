import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, ShoppingCart, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import AccountWrapper from '@/components/account/account-wrapper'

async function getUserDashboardData(userId: string) {
  // Get user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      createdAt: true,
      role: true,
    },
  })

  // Get order statistics
  const [totalOrders, inProgressOrders, completedOrders, recentOrders] = await Promise.all([
    // Total orders count
    prisma.order.count({
      where: { userId },
    }),
    // In progress orders count
    prisma.order.count({
      where: {
        userId,
        status: {
          in: ['PENDING_PAYMENT', 'CONFIRMATION', 'PRODUCTION', 'ON_HOLD', 'SHIPPED', 'ON_THE_WAY'],
        },
      },
    }),
    // Completed orders count
    prisma.order.count({
      where: {
        userId,
        status: {
          in: ['DELIVERED', 'PICKED_UP', 'READY_FOR_PICKUP'],
        },
      },
    }),
    // Recent orders
    prisma.order.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        OrderItem: true,
      },
    }),
  ])

  return {
    user,
    totalOrders,
    inProgressOrders,
    completedOrders,
    recentOrders,
  }
}

export default async function DashboardPage() {
  const { user, session } = await validateRequest()

  if (!user?.id) {
    redirect('/sign-in')
  }

  const dashboardData = await getUserDashboardData(user.id)

  return (
    <AccountWrapper>
      <div className="max-w-6xl">
        <h1 className="text-3xl font-bold mb-2">My Account</h1>
        <p className="text-muted-foreground mb-8">
          Welcome back, {dashboardData.user?.name || dashboardData.user?.email}
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Your latest print orders</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData.recentOrders.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        Order #{order.referenceNumber || order.orderNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.OrderItem.length} item(s) • ${(order.total / 100).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${
                          order.status === 'DELIVERED' || order.status === 'PICKED_UP'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'CONFIRMATION' || order.status === 'PRODUCTION'
                              ? 'bg-blue-100 text-blue-800'
                              : order.status === 'SHIPPED' || order.status === 'ON_THE_WAY'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {order.status.replace(/_/g, ' ')}
                      </span>
                      <Link href={`/account/orders/${order.id}`}>
                        <Button className="mt-1" size="sm" variant="link">
                          View Details →
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p>No recent orders</p>
                <Link href="/products">
                  <Button className="mt-4">Start Shopping</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Orders</span>
                  <span className="font-medium">{dashboardData.totalOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">In Progress</span>
                  <span className="font-medium">{dashboardData.inProgressOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="font-medium">{dashboardData.completedOrders}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="sm:col-span-1 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Account Active</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Member since{' '}
                  {new Date(dashboardData.user?.createdAt || new Date()).toLocaleDateString()}
                </p>
                {dashboardData.user?.role === 'ADMIN' && (
                  <div className="mt-3 pt-3 border-t">
                    <Link href="/admin/dashboard">
                      <Button className="w-full" size="sm" variant="outline">
                        Go to Admin Dashboard
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Get assistance with your orders or account
              </p>
              <Link href="/contact">
                <Button className="w-full" size="sm" variant="outline">
                  Contact Support
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-8">
          <Link href="/account/orders">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-5 w-5 sm:h-4 sm:w-4" />
                  All Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">View order history</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/account/details">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Account Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Manage your profile</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/account/addresses">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Addresses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Manage shipping addresses</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/products">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">New Order</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Start a new print order</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </AccountWrapper>
  )
}
