import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CustomersTable } from '@/components/admin/customers-table'
import { Users, UserPlus, ShoppingCart, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddCustomerButton } from '@/components/admin/customers-page-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getCustomersData() {
  // Get all customers with their order stats
  const customers = await prisma.user.findMany({
    where: {
      role: 'CUSTOMER',
    },
    include: {
      Order: {
        select: {
          id: true,
          total: true,
          status: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Calculate customer stats
  const customersWithStats = customers.map((customer) => {
    const orders = customer.Order || []
    const totalSpent = orders
      .filter((o) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED')
      .reduce((sum, order) => sum + (order.total || 0), 0)

    const lastOrderDate =
      orders.length > 0 ? Math.max(...orders.map((o) => new Date(o.createdAt).getTime())) : null

    return {
      id: customer.id,
      name: customer.name || 'N/A',
      email: customer.email || 'N/A',
      phoneNumber: customer.phoneNumber || null,
      createdAt: customer.createdAt,
      totalOrders: orders.length,
      totalSpent,
      lastOrderDate: lastOrderDate ? new Date(lastOrderDate) : null,
      isBroker: customer.isBroker || false,
      brokerDiscounts: customer.brokerDiscounts as Record<string, number> | null,
    }
  })

  // Get summary stats
  const totalCustomers = customers.length
  const totalRevenue = customersWithStats.reduce((sum, c) => sum + c.totalSpent, 0)
  const avgOrderValue =
    totalRevenue /
    Math.max(
      customersWithStats.reduce((sum, c) => sum + c.totalOrders, 0),
      1
    )

  // Get new customers this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const newCustomersThisMonth = customers.filter(
    (c) => new Date(c.createdAt) >= startOfMonth
  ).length

  return {
    customers: customersWithStats,
    stats: {
      totalCustomers,
      newCustomersThisMonth,
      totalRevenue,
      avgOrderValue,
    },
  }
}

export default async function CustomersPage() {
  const { customers, stats } = await getCustomersData()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer relationships and view order history
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Export CSV</Button>
          <AddCustomerButton />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newCustomersThisMonth} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newCustomersThisMonth}</div>
            <p className="text-xs text-muted-foreground">Customer acquisition</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.totalRevenue / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Lifetime value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.avgOrderValue / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per order average</p>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomersTable customers={customers} />
        </CardContent>
      </Card>
    </div>
  )
}
