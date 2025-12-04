import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/metrics/gang-runs
 * Returns today's production batches (orders grouped by product type/category)
 */
export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get orders that are in production or ready for production
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        status: {
          in: ['CONFIRMATION', 'PRODUCTION', 'SHIPPED'],
        },
      },
      include: {
        OrderItem: {
          include: {
            PaperStock: true,
            OrderItemAddOn: true,
          },
        },
      },
    })

    // Group orders by product category
    const categoryGroups = new Map<
      string,
      { orders: typeof orders; categoryName: string; completed: number }
    >()

    orders.forEach((order) => {
      order.OrderItem.forEach((item) => {
        // Use productName directly from OrderItem (it's a snapshot from order time)
        const categoryName = item.productName || 'General'
        const categoryId = item.productSku || 'general'

        if (!categoryGroups.has(categoryId)) {
          categoryGroups.set(categoryId, {
            orders: [],
            categoryName,
            completed: 0,
          })
        }

        const group = categoryGroups.get(categoryId)!
        if (!group.orders.find((o) => o.id === order.id)) {
          group.orders.push(order)
        }

        // Count completed orders in this batch
        if (['SHIPPED', 'DELIVERED', 'PICKED_UP'].includes(order.status)) {
          group.completed++
        }
      })
    })

    // Convert to gang run format
    const gangRuns = Array.from(categoryGroups.entries()).map(([categoryId, group], index) => {
      const orderCount = group.orders.length
      const batchSize = Math.ceil(orderCount / 10) * 10 // Round up to nearest 10
      const completedCount = group.completed

      // Determine status based on completion
      let status: 'filling' | 'ready' | 'production'
      if (completedCount === orderCount && orderCount > 0) {
        status = 'ready'
      } else if (orderCount > 0 && completedCount > 0) {
        status = 'production'
      } else {
        status = 'filling'
      }

      // Generate a batch ID
      const prefix = group.categoryName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
      const batchId = `${prefix}-${String(index + 1).padStart(3, '0')}`

      // Calculate scheduled time (orders spaced 1.5 hours apart starting at 2 PM)
      const baseHour = 14 // 2 PM
      const hourOffset = Math.floor(index * 1.5)
      const scheduledHour = baseHour + hourOffset
      const scheduledMinutes = (index % 2) * 30 // Alternate between :00 and :30
      const scheduledTime = `${String(scheduledHour).padStart(2, '0')}:${String(scheduledMinutes).padStart(2, '0')}`

      return {
        id: batchId,
        type: group.categoryName,
        slots: {
          used: orderCount,
          total: Math.max(batchSize, 10), // Minimum batch size of 10
        },
        status,
        scheduledTime,
      }
    })

    // Sort by scheduled time
    gangRuns.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))

    return NextResponse.json({
      gangRuns: gangRuns.slice(0, 4), // Show top 4 batches
      totalOrders: orders.length,
    })
  } catch (error) {
    console.error('[GET /api/metrics/gang-runs] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch gang runs' }, { status: 500 })
  }
}
