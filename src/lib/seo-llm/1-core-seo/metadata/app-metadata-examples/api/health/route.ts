import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger-safe'

export async function GET(): Promise<unknown> {
  try {
    // Check database connection
    const startTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbLatency = Date.now() - startTime

    // Get critical data counts for monitoring
    const [userCount, productCount, orderCount, vendorCount, categoryCount] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.vendor.count(),
      prisma.productCategory.count(),
    ])

    // Get recent activity metrics
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const [recentOrders, activeSessions, revenueToday] = await Promise.all([
      prisma.order.count({
        where: {
          createdAt: {
            gte: oneDayAgo,
          },
        },
      }),
      prisma.session.count({
        where: {
          expiresAt: {
            gte: now,
          },
        },
      }),
      // Business metric: Revenue in last 24 hours
      prisma.order.aggregate({
        where: {
          createdAt: { gte: oneDayAgo },
          status: { in: ['CONFIRMATION', 'PRODUCTION', 'SHIPPED', 'DELIVERED'] },
        },
        _sum: { total: true },
      }),
    ])

    // Check system resources (memory usage)
    const memUsage = process.memoryUsage()
    const memoryMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    }

    // Calculate health score (0-100)
    let healthScore = 100
    if (dbLatency > 100) healthScore -= 20
    if (dbLatency > 500) healthScore -= 30
    if (memoryMB.heapUsed > 500) healthScore -= 15
    if (memoryMB.heapUsed > 1000) healthScore -= 25
    if (productCount === 0) healthScore -= 10
    if (vendorCount === 0) healthScore -= 10

    // Application metrics
    const appMetrics = {
      pid: process.pid,
      platform: process.platform,
      arch: process.arch,
      cpuUsage: process.cpuUsage(),
      loadAverage: process.platform === 'linux' ? require('os').loadavg() : null,
    }

    return NextResponse.json({
      status: healthScore >= 90 ? 'healthy' : healthScore >= 70 ? 'degraded' : 'critical',
      healthScore,
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      version: '3.0.0-enterprise',
      services: {
        database: {
          status: 'connected',
          latencyMs: dbLatency,
          health: dbLatency < 100 ? 'good' : dbLatency < 500 ? 'degraded' : 'critical',
        },
        app: {
          status: 'running',
          version: process.env.npm_package_version || 'unknown',
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development',
        },
        system: appMetrics,
      },
      metrics: {
        database: {
          users: userCount,
          products: productCount,
          categories: categoryCount,
          vendors: vendorCount,
          orders: orderCount,
          recentOrders24h: recentOrders,
          activeSessions: activeSessions,
        },
        business: {
          revenue24h: revenueToday._sum.total || 0,
          avgOrderValue24h:
            recentOrders > 0
              ? Math.round(((revenueToday._sum.total || 0) / recentOrders) * 100) / 100
              : 0,
          activeUsers: activeSessions,
        },
        memory: memoryMB,
        performance: {
          dbLatencyMs: dbLatency,
          memoryUsagePercent: Math.round((memoryMB.heapUsed / memoryMB.heapTotal) * 100),
          uptimeHours: Math.round((process.uptime() / 3600) * 100) / 100,
        },
      },
      alerts: [
        ...(productCount === 0 ? ['WARNING: No products in database'] : []),
        ...(vendorCount === 0 ? ['WARNING: No vendors configured'] : []),
        ...(dbLatency > 500 ? ['CRITICAL: Database latency high'] : []),
        ...(memoryMB.heapUsed > 500 ? ['WARNING: High memory usage'] : []),
        ...(healthScore < 90 ? [`INFO: System health score: ${healthScore}/100`] : []),
      ],
    })
  } catch (error) {
    logger.error('Health check failed:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
