import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cache } from 'ioredis'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/metrics/production-by-hour
 * Returns today's production metrics grouped by hour
 */
export async function GET() {
  try {
    // Cache key includes today's date for daily cache
    const todayStr = new Date().toISOString().split('T')[0]
    const cacheKey = `metrics:production:hourly:${todayStr}`
    const cached = await cache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get all orders from today
    const todayOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    // Group by hour (business hours 9 AM - 5 PM)
    const hourlyData = []
    for (let hour = 9; hour <= 17; hour++) {
      const hourStart = new Date(today)
      hourStart.setHours(hour, 0, 0, 0)

      const hourEnd = new Date(today)
      hourEnd.setHours(hour + 1, 0, 0, 0)

      const hourOrders = todayOrders.filter(
        (order) => order.createdAt >= hourStart && order.createdAt < hourEnd
      )

      const completedOrders = hourOrders.filter((order) =>
        ['DELIVERED', 'SHIPPED', 'PICKED_UP'].includes(order.status)
      )

      const timeLabel = hour === 12 ? '12PM' : hour > 12 ? `${hour - 12}PM` : `${hour}AM`

      hourlyData.push({
        time: timeLabel,
        jobs: hourOrders.length,
        completed: completedOrders.length,
      })
    }

    // Calculate overall metrics
    const totalJobs = todayOrders.length
    const completed = todayOrders.filter((order) =>
      ['DELIVERED', 'SHIPPED', 'PICKED_UP'].includes(order.status)
    ).length
    const completionRate = totalJobs > 0 ? (completed / totalJobs) * 100 : 0

    const responseData = {
      hourlyData,
      metrics: {
        totalJobs,
        completed,
        completionRate,
      },
    }

    // Cache for 15 minutes (900 seconds) - metrics update throughout day
    await cache.set(cacheKey, responseData, 900)

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('[GET /api/metrics/production-by-hour] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch production metrics' }, { status: 500 })
  }
}
