import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/orders/delivered
 *
 * Fetch orders that were delivered N days ago for review collection
 *
 * Query Params:
 * - daysAgo: Number of days since delivery (default: 3)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const daysAgo = parseInt(searchParams.get('daysAgo') || '3')

    // Calculate date range for exact day match
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() - daysAgo)
    targetDate.setHours(0, 0, 0, 0)

    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    // Fetch orders delivered exactly N days ago
    const orders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        deliveredAt: {
          gte: targetDate,
          lt: nextDay,
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
        OrderItem: {
          include: {
            Product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        deliveredAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      count: orders.length,
      daysAgo,
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        userEmail: order.User?.email,
        userName: order.User?.name,
        total: order.total,
        deliveredAt: order.deliveredAt,
        createdAt: order.createdAt,
        items: order.OrderItem.map((item) => ({
          productName: item.Product?.name || item.productName,
          quantity: item.quantity,
          total: item.total,
        })),
      })),
    })
  } catch (error) {
    console.error('[API] Fetch delivered orders error:', error)
    return NextResponse.json({ error: 'Failed to fetch delivered orders' }, { status: 500 })
  }
}
