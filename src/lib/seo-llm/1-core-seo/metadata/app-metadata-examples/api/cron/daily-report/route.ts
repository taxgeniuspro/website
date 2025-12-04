import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { N8NWorkflows } from '@/lib/n8n'

// Daily report cron job - runs at midnight
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Gather daily statistics
    const [
      ordersCreated,
      ordersCompleted,
      ordersPending,
      todaysOrders,
      yesterdaysOrders,
      weeklyOrders,
      monthlyOrders,
      activeCustomers,
      newCustomers,
    ] = await Promise.all([
      // Today's new orders
      prisma.order.count({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      // Today's completed orders
      prisma.order.count({
        where: {
          status: 'DELIVERED',
          updatedAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      // Pending orders
      prisma.order.count({
        where: {
          status: {
            in: ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'PRINTING', 'READY_FOR_PICKUP'],
          },
        },
      }),
      // Today's orders with details
      prisma.order.findMany({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: {
          OrderItem: true,
        },
      }),
      // Yesterday's orders for comparison
      prisma.order.findMany({
        where: {
          createdAt: {
            gte: yesterday,
            lt: today,
          },
        },
      }),
      // This week's orders
      prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      // This month's orders
      prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
          },
        },
      }),
      // Active customers (placed orders in last 30 days)
      prisma.order.groupBy({
        by: ['email'],
        where: {
          createdAt: {
            gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      // New customers today
      prisma.user.count({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
    ])

    // Calculate revenue
    const todaysRevenue = todaysOrders.reduce((sum, order) => sum + order.total, 0) / 100
    const yesterdaysRevenue = yesterdaysOrders.reduce((sum, order) => sum + order.total, 0) / 100
    const revenueChange =
      yesterdaysRevenue > 0 ? ((todaysRevenue - yesterdaysRevenue) / yesterdaysRevenue) * 100 : 0

    // Find orders with issues
    const ordersWithIssues = await prisma.order.findMany({
      where: {
        OR: [
          {
            status: 'PAYMENT_FAILED',
            updatedAt: {
              gte: yesterday,
            },
          },
          {
            adminNotes: {
              contains: 'issue',
            },
            updatedAt: {
              gte: yesterday,
            },
          },
        ],
      },
      select: {
        orderNumber: true,
        status: true,
        adminNotes: true,
      },
    })

    // Top products today
    const productStats = todaysOrders.reduce(
      (acc, order) => {
        order.OrderItem.forEach((item) => {
          if (!acc[item.productName]) {
            acc[item.productName] = {
              name: item.productName,
              quantity: 0,
              revenue: 0,
            }
          }
          acc[item.productName].quantity += item.quantity
          acc[item.productName].revenue += (item.price * item.quantity) / 100
        })
        return acc
      },
      {} as Record<string, any>
    )

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Prepare report data
    const reportData = {
      date: today.toISOString().split('T')[0],
      ordersCreated,
      ordersCompleted,
      ordersPending,
      totalRevenue: todaysRevenue,
      yesterdaysRevenue,
      revenueChange: revenueChange.toFixed(2),
      weeklyOrders,
      monthlyOrders,
      activeCustomers: activeCustomers.length,
      newCustomers,
      topProducts,
      issues: ordersWithIssues.map((order) => ({
        orderNumber: order.orderNumber,
        status: order.status,
        notes: order.adminNotes,
      })),
    }

    // Trigger N8N daily report workflow
    try {
      await N8NWorkflows.generateDailyReport()
    } catch (n8nError) {}

    // Log report

    return NextResponse.json({
      success: true,
      report: reportData,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate daily report' }, { status: 500 })
  }
}
