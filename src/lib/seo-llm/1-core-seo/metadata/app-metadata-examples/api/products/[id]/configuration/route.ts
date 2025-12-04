/**
 * Product Configuration API Route
 * GET /api/products/[id]/configuration
 * Refactored: 2025-10-18 (Task 1.2)
 */

import { type NextRequest, NextResponse } from 'next/server'
import { ProductConfigurationService } from '@/services/ProductConfigurationService'
import type { ServiceContext } from '@/types/service'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await params
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const context: ServiceContext = {
      requestId: `config_\${Date.now()}`,
      userId: undefined,
      userRole: undefined,
      timestamp: new Date(),
    }

    const configService = new ProductConfigurationService(context)
    const result = await configService.getConfiguration(productId)

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json(result.data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        'X-API-Version': 'v4-service-layer',
        'X-Product-Id': productId,
      },
    })
  } catch (error) {
    console.error('[Config API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Version': 'v4-service-layer',
        },
      }
    )
  }
}
