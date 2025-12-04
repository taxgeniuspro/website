import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/marketing/customers/anniversaries
 *
 * Fetch customers with order anniversaries for automation
 * Called by N8N daily cron workflow
 *
 * Query params:
 * - type: "first_purchase" | "any_purchase" (default: "any_purchase")
 * - daysAgo: Number of days ago to check (default: 365 = 1 year)
 * - limit: Max results (default: 50)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'any_purchase'
    const daysAgo = parseInt(searchParams.get('daysAgo') || '365', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const now = new Date()
    const targetDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

    // Calculate date range (within 24 hours of target date)
    const startDate = new Date(targetDate)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(targetDate)
    endDate.setHours(23, 59, 59, 999)

    let customers: any[] = []

    if (type === 'first_purchase') {
      // Find customers whose first order was exactly daysAgo days ago
      const usersWithOrders = await prisma.user.findMany({
        where: {
          Order: {
            some: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
              status: {
                in: ['COMPLETED', 'DELIVERED'], // Only successful orders
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
              createdAt: 'asc',
            },
            take: 1, // Get first order only
          },
        },
        take: limit,
      })

      // Filter to only users whose first order matches the target date
      customers = usersWithOrders
        .filter((user) => {
          if (user.Order.length === 0) return false
          const firstOrderDate = new Date(user.Order[0].createdAt)
          return firstOrderDate >= startDate && firstOrderDate <= endDate
        })
        .map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          firstOrderDate: user.Order[0].createdAt,
          firstOrderNumber: user.Order[0].orderNumber,
          firstOrderTotal: user.Order[0].total,
          yearsAgo: Math.floor(daysAgo / 365),
        }))
    } else {
      // Find customers with ANY order exactly daysAgo days ago
      const ordersOnDate = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ['COMPLETED', 'DELIVERED'],
          },
          userId: {
            not: null,
          },
        },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        take: limit,
      })

      customers = ordersOnDate.map((order) => ({
        userId: order.User?.id,
        userName: order.User?.name,
        userEmail: order.User?.email,
        orderDate: order.createdAt,
        orderNumber: order.orderNumber,
        orderTotal: order.total,
        yearsAgo: Math.floor(daysAgo / 365),
      }))
    }

    return NextResponse.json({
      success: true,
      count: customers.length,
      type,
      daysAgo,
      targetDate: targetDate.toISOString(),
      customers,
    })
  } catch (error) {
    console.error('[API] Fetch anniversaries error:', error)
    return NextResponse.json({ error: 'Failed to fetch anniversaries' }, { status: 500 })
  }
}
