/**
 * Analytics Aggregation API
 *
 * Triggers analytics aggregation on-demand.
 * Useful for testing or manual triggers.
 *
 * POST /api/analytics/aggregate
 * Body: { date?: string, job?: 'campaigns' | 'funnels' | 'all' }
 */

import { NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import {
  runDailyAggregations,
  aggregateCampaignMetrics,
  aggregateFunnelMetrics,
  calculateOrderMetrics,
  calculateProductMetrics,
  calculateCustomerMetrics,
} from '@/lib/analytics/aggregation-service'

export async function POST(request: Request) {
  try {
    // Only allow admin users
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { date, job = 'all' } = body

    const targetDate = date ? new Date(date) : new Date()

    let result

    switch (job) {
      case 'campaigns':
        result = await aggregateCampaignMetrics(targetDate)
        break

      case 'funnels':
        result = await aggregateFunnelMetrics(targetDate)
        break

      case 'all':
      default:
        result = await runDailyAggregations(targetDate)
        break
    }

    return NextResponse.json({
      success: result.success,
      job,
      date: targetDate.toISOString().split('T')[0],
      result,
    })
  } catch (error) {
    console.error('Error triggering aggregation:', error)
    return NextResponse.json({ error: 'Failed to trigger aggregation' }, { status: 500 })
  }
}

/**
 * GET /api/analytics/aggregate?type=orders&startDate=2025-10-01&endDate=2025-10-22
 * Get calculated metrics without storing
 */
export async function GET(request: Request) {
  try {
    // Only allow admin users
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'orders'
    const startDate = new Date(
      searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    )
    const endDate = new Date(searchParams.get('endDate') || new Date())

    let result

    switch (type) {
      case 'orders':
        result = await calculateOrderMetrics(startDate, endDate)
        break

      case 'products':
        result = await calculateProductMetrics(startDate, endDate)
        break

      case 'customers':
        result = await calculateCustomerMetrics(startDate, endDate)
        break

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({
      success: result.success,
      type,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      ...result,
    })
  } catch (error) {
    console.error('Error calculating metrics:', error)
    return NextResponse.json({ error: 'Failed to calculate metrics' }, { status: 500 })
  }
}
