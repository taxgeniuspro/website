import { type NextRequest, NextResponse } from 'next/server'
import {
  getMetrics,
  getMetricsContentType,
  updateActiveMetrics,
  startMetricsCollection,
} from '@/lib/metrics'
import { logger } from '@/lib/logger-safe'
import { getCorrelationContext } from '@/lib/correlation'

// Start metrics collection on module load
startMetricsCollection()

/**
 * GET /api/metrics
 * Prometheus metrics endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()

    // Check authorization (optional - for production security)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.METRICS_AUTH_TOKEN

    // If token is set, require authentication
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      logger.warn('Unauthorized metrics access attempt', {
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        correlationId: getCorrelationContext()?.correlationId,
      })

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update active metrics before returning
    await updateActiveMetrics()

    // Get metrics
    const metrics = await getMetrics()
    const duration = Date.now() - startTime

    logger.debug('Metrics scraped', {
      duration,
      size: metrics.length,
      correlationId: getCorrelationContext()?.correlationId,
    })

    // Return metrics in Prometheus format
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': getMetricsContentType(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${duration}ms`,
      },
    })
  } catch (error) {
    logger.error('Failed to generate metrics:', error)

    // Return empty metrics on error (better than failing the scrape)
    return new NextResponse('# Error generating metrics\n', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }
}
