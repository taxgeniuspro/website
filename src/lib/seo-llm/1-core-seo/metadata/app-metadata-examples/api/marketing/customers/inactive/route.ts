import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/marketing/customers/inactive
 *
 * Fetch inactive customers for win-back campaigns
 * Called by N8N daily cron workflow
 *
 * Query params:
 * - minDays: Minimum days since last order (default: 60)
 * - maxDays: Maximum days since last order (default: 365)
 * - limit: Max results (default: 50)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const minDays = parseInt(searchParams.get('minDays') || '60', 10)
    const maxDays = parseInt(searchParams.get('maxDays') || '365', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const now = new Date()
    const minDate = new Date(now.getTime() - maxDays * 24 * 60 * 60 * 1000)
    const maxDate = new Date(now.getTime() - minDays * 24 * 60 * 60 * 1000)

    // Find users with at least one order, but last order was between minDays and maxDays ago
    const inactiveCustomers = await prisma.user.findMany({
      where: {
        Order: {
          some: {
            status: {
              in: ['COMPLETED', 'DELIVERED'],
            },
          },
        },
      },
      include: {
        Order: {
          where: {
            status: {
              in: ['COMPLETED', 'DELIVERED'],
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // Get most recent order only
        },
      },
      take: limit * 2, // Fetch more to filter
    })

    // Filter to only users whose last order is within date range
    const filteredCustomers = inactiveCustomers
      .filter((user) => {
        if (user.Order.length === 0) return false
        const lastOrderDate = new Date(user.Order[0].createdAt)
        return lastOrderDate >= minDate && lastOrderDate <= maxDate
      })
      .slice(0, limit) // Limit results
      .map((user) => {
        const lastOrder = user.Order[0]
        const daysSinceLastOrder = Math.floor(
          (now.getTime() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        )

        return {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          lastOrderDate: lastOrder.createdAt,
          lastOrderNumber: lastOrder.orderNumber,
          lastOrderTotal: lastOrder.total,
          daysSinceLastOrder,
        }
      })

    return NextResponse.json({
      success: true,
      count: filteredCustomers.length,
      filters: {
        minDays,
        maxDays,
        minDate: minDate.toISOString(),
        maxDate: maxDate.toISOString(),
      },
      customers: filteredCustomers,
    })
  } catch (error) {
    console.error('[API] Fetch inactive customers error:', error)
    return NextResponse.json({ error: 'Failed to fetch inactive customers' }, { status: 500 })
  }
}
