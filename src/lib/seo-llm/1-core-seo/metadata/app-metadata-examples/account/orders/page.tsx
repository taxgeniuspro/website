import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { validateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AccountWrapper from '@/components/account/account-wrapper'
import { OrdersList } from '@/components/account/orders-list'
import { OrdersListSkeleton } from '@/components/account/orders-list-skeleton'

// Force dynamic rendering for real-time data
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  searchParams: Promise<{
    status?: string
    search?: string
    sort?: string
    page?: string
    startDate?: string
    endDate?: string
  }>
}

export default async function OrdersPage({ searchParams }: PageProps) {
  // Authenticate user
  const { user } = await validateRequest()

  if (!user) {
    redirect('/auth/signin?from=/account/orders')
  }

  // Await search params
  const params = await searchParams

  // Parse query parameters
  const statusFilter = params.status || 'all'
  const searchQuery = params.search || ''
  const sortBy = params.sort || 'date_desc'
  const page = parseInt(params.page || '1', 10)
  const startDate = params.startDate
  const endDate = params.endDate

  // Fetch user's orders with related data
  const ordersRaw = await prisma.order.findMany({
    where: {
      userId: user.id,
    },
    include: {
      OrderItem: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Serialize dates for client component
  const orders = ordersRaw.map((order) => ({
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    paidAt: order.paidAt?.toISOString() || null,
    refundedAt: order.refundedAt?.toISOString() || null,
    OrderItem: order.OrderItem.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
  }))

  return (
    <AccountWrapper>
      <div className="max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Orders</h1>
          <p className="text-muted-foreground">View and track all your orders</p>
        </div>

        <Suspense fallback={<OrdersListSkeleton />}>
          <OrdersList
            currentPage={page}
            endDate={endDate}
            isBroker={false}
            orders={orders}
            searchQuery={searchQuery}
            sortBy={sortBy}
            startDate={startDate}
            statusFilter={statusFilter}
          />
        </Suspense>
      </div>
    </AccountWrapper>
  )
}
