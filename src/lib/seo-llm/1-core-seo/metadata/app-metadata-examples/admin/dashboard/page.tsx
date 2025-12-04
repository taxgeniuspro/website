import { prisma } from '@/lib/prisma'
import { StatsCard } from '@/components/admin/stats-cards'
import { RecentOrdersTable } from '@/components/admin/recent-orders-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import { DollarSign, Package, CheckCircle, AlertCircle, ShoppingCart, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getDashboardData() {
  // Get total orders (all time)
  const totalOrders = await prisma.order.count()

  // Get in progress orders (active orders)
  const inProgressOrders = await prisma.order.count({
    where: {
      status: {
        in: ['PAID', 'PROCESSING', 'PRINTING', 'QUALITY_CHECK', 'PACKAGING', 'SHIPPED'],
      },
    },
  })

  // Get completed orders (successfully fulfilled)
  const completedOrders = await prisma.order.count({
    where: {
      status: 'DELIVERED',
    },
  })

  // Get total revenue (all time)
  const totalRevenue = await prisma.order.aggregate({
    _sum: {
      total: true,
    },
    where: {
      status: {
        notIn: ['CANCELLED', 'REFUNDED'],
      },
    },
  })

  // Get recent orders
  const recentOrders = await prisma.order.findMany({
    take: 10,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      OrderItem: true,
    },
  })

  // Get urgent orders for alerts
  const urgentOrders = await prisma.order.count({
    where: {
      status: {
        in: ['PAID', 'PROCESSING', 'PRINTING'],
      },
    },
  })

  return {
    totalOrders,
    inProgressOrders,
    completedOrders,
    totalRevenue: totalRevenue._sum.total || 0,
    urgentOrders,
    recentOrders,
  }
}

export default async function AdminDashboard() {
  const data = await getDashboardData()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={<ShoppingCart className="h-4 w-4" />}
          iconBg="bg-blue-100 dark:bg-blue-900/20"
          subtitle="All time orders"
          title="Total Orders"
          value={data.totalOrders.toString()}
        />

        <StatsCard
          icon={<Clock className="h-4 w-4" />}
          iconBg="bg-amber-100 dark:bg-amber-900/20"
          subtitle="Active orders"
          title="In Progress"
          value={data.inProgressOrders.toString()}
        />

        <StatsCard
          icon={<CheckCircle className="h-4 w-4" />}
          iconBg="bg-green-100 dark:bg-green-900/20"
          subtitle="Successfully fulfilled"
          title="Completed"
          value={data.completedOrders.toString()}
        />

        <StatsCard
          icon={<DollarSign className="h-4 w-4" />}
          iconBg="bg-purple-100 dark:bg-purple-900/20"
          subtitle="Total revenue"
          title="Revenue"
          value={`$${(data.totalRevenue / 100).toFixed(2)}`}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow h-full block"
          href="/admin/orders"
        >
          <div className="flex flex-col space-y-1.5 p-6 pb-3">
            <div className="text-base font-semibold leading-none tracking-tight flex items-center gap-2">
              <Package className="h-5 w-5 sm:h-4 sm:w-4" />
              Orders
            </div>
          </div>
          <div className="p-6 pt-0">
            <p className="text-2xl font-bold">{data.inProgressOrders}</p>
            <p className="text-sm text-muted-foreground">Active orders</p>
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentOrdersTable orders={data.recentOrders} />
        </CardContent>
      </Card>

      {/* Alerts Section */}
      {data.urgentOrders > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Alert>
                <AlertDescription>
                  {data.urgentOrders} urgent orders need attention
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
