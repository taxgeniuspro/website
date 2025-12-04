import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Truck,
  DollarSign,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusFilter } from '@/components/admin/orders/status-filter'
import { OrdersTableWithBulkActions } from '@/components/admin/orders/orders-table-with-bulk-actions'

// Force dynamic rendering for real-time data
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface OrdersPageProps {
  searchParams?: Promise<{
    page?: string
    status?: string
    search?: string
  }>
}

async function OrdersContent({ searchParams }: { searchParams: Record<string, unknown> }) {
  const page = Number(searchParams?.page) || 1
  const pageSize = 20
  const statusFilter = String(searchParams?.status || 'all')
  const searchQuery = String(searchParams?.search || '')

  try {
    // Build where clause for filtering
    const where: Record<string, unknown> = {}

    if (statusFilter !== 'all') {
      where.status = statusFilter
    }

    if (searchQuery) {
      where.OR = [
        { orderNumber: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } },
        { phone: { contains: searchQuery, mode: 'insensitive' } },
      ]
    }

    // Get orders with pagination
    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          email: true,
          phone: true,
          total: true,
          subtotal: true,
          status: true,
          createdAt: true,
          trackingNumber: true,
          carrier: true,
          OrderItem: {
            select: {
              productName: true,
            },
          },
          File: {
            select: {
              fileUrl: true,
              filename: true,
            },
          },
          _count: {
            select: {
              OrderItem: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / pageSize)

    // Get order statistics
    const stats = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
    })

    const statsMap = stats.reduce(
      (acc, stat) => {
        acc[stat.status] = stat._count
        return acc
      },
      {} as Record<string, number>
    )

    // Calculate total revenue from delivered orders
    const revenue = await prisma.order.aggregate({
      where: {
        status: 'DELIVERED',
      },
      _sum: {
        total: true,
      },
    })

    return (
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground mt-2">Manage and track all printing orders</p>
          </div>
          <div className="inline-flex items-center justify-center gap-2 h-10 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground opacity-50 pointer-events-none">
            <Plus className="h-4 w-4" />
            New Order
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
              <p className="text-xs text-muted-foreground">All time orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(statsMap['PENDING_PAYMENT'] || 0) +
                  (statsMap['CONFIRMATION'] || 0) +
                  (statsMap['PRODUCTION'] || 0) +
                  (statsMap['SHIPPED'] || 0) +
                  (statsMap['ON_THE_WAY'] || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Active orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(statsMap['DELIVERED'] || 0) + (statsMap['PICKED_UP'] || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Successfully fulfilled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {(revenue._sum.total || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground">Total revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>All Orders</CardTitle>
            <CardDescription>
              A list of all orders including their status and details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <form>
                  <Input
                    className="pl-10"
                    defaultValue={searchQuery}
                    name="search"
                    placeholder="Search by order number, customer name or email..."
                    type="text"
                  />
                </form>
              </div>
              <StatusFilter />
              <div className="inline-flex items-center justify-center gap-2 h-10 px-4 py-2 rounded-md text-sm font-medium border border-input bg-background opacity-50 pointer-events-none">
                <Filter className="h-4 w-4" />
                More Filters
              </div>
              <div className="inline-flex items-center justify-center gap-2 h-10 px-4 py-2 rounded-md text-sm font-medium border border-input bg-background opacity-50 pointer-events-none">
                <Download className="h-4 w-4" />
                Export
              </div>
            </div>

            {/* Orders Table with Bulk Actions */}
            <OrdersTableWithBulkActions
              orders={orders}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of{' '}
                  {totalCount} orders
                </p>
                <div className="flex gap-2">
                  {page > 1 ? (
                    <Link
                      className="inline-flex items-center justify-center h-9 px-3 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                      href={`/admin/orders?page=${Math.max(1, page - 1)}${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}${searchQuery ? `&search=${searchQuery}` : ''}`}
                    >
                      Previous
                    </Link>
                  ) : (
                    <div className="inline-flex items-center justify-center h-9 px-3 rounded-md text-sm font-medium border border-input bg-background opacity-50 pointer-events-none">
                      Previous
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = page <= 3 ? i + 1 : page + i - 2
                      if (pageNum > totalPages) return null
                      return (
                        <Link
                          key={pageNum}
                          className={`inline-flex items-center justify-center h-9 px-3 rounded-md text-sm font-medium transition-colors ${
                            pageNum === page
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                              : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                          }`}
                          href={`/admin/orders?page=${pageNum}${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}${searchQuery ? `&search=${searchQuery}` : ''}`}
                        >
                          {pageNum}
                        </Link>
                      )
                    })}
                  </div>
                  {page < totalPages ? (
                    <Link
                      className="inline-flex items-center justify-center h-9 px-3 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                      href={`/admin/orders?page=${Math.min(totalPages, page + 1)}${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}${searchQuery ? `&search=${searchQuery}` : ''}`}
                    >
                      Next
                    </Link>
                  ) : (
                    <div className="inline-flex items-center justify-center h-9 px-3 rounded-md text-sm font-medium border border-input bg-background opacity-50 pointer-events-none">
                      Next
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  } catch (error) {
    console.error('[Orders Page] Error loading orders:', error)
    console.error(
      '[Orders Page] Error stack:',
      error instanceof Error ? error.stack : 'No stack trace'
    )
    console.error(
      '[Orders Page] Error message:',
      error instanceof Error ? error.message : String(error)
    )

    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground mt-2">Manage and track all printing orders</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <h2 className="text-xl font-semibold">Failed to Load Orders</h2>
              <p className="text-muted-foreground text-center max-w-md">
                There was an error loading the orders. Please check your database connection and try
                again.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {error instanceof Error ? error.message : String(error)}
              </p>
              <a
                className="inline-flex items-center justify-center h-10 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                href="/admin/orders"
              >
                Try Again
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams

  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
              <p className="text-muted-foreground mt-2">Loading orders...</p>
            </div>
          </div>
          <Card>
            <CardContent className="p-12">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <OrdersContent searchParams={params || {}} />
    </Suspense>
  )
}
