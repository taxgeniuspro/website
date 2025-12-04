import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { cache } from 'ioredis'
import { z } from 'zod'

// Schema for invalidation request
const InvalidateSchema = z.object({
  patterns: z.array(z.string()).min(1, 'At least one pattern is required'),
})

/**
 * POST /api/cache/invalidate
 * Invalidates cache entries matching the specified patterns
 *
 * Requires ADMIN authentication
 *
 * @example
 * // Invalidate all product caches
 * POST /api/cache/invalidate
 * { "patterns": ["products:*", "categories:*"] }
 *
 * // Invalidate specific design set
 * POST /api/cache/invalidate
 * { "patterns": ["design:set:abc123"] }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate admin access
    const { user, session } = await validateRequest()
    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const body = await request.json()
    const validation = InvalidateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.issues,
        },
        { status: 400 }
      )
    }

    const { patterns } = validation.data

    // Clear cache for each pattern
    const results: Record<string, number> = {}
    let totalCleared = 0

    for (const pattern of patterns) {
      const cleared = await cache.clearPattern(pattern)
      results[pattern] = cleared
      totalCleared += cleared
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ${totalCleared} cache entries`,
      results,
      patterns,
    })
  } catch (error) {
    console.error('[POST /api/cache/invalidate] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to invalidate cache',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cache/invalidate
 * Returns available cache patterns for invalidation
 *
 * Requires ADMIN authentication
 */
export async function GET() {
  try {
    // Validate admin access
    const { user, session } = await validateRequest()
    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    // Return documentation of available cache patterns
    return NextResponse.json({
      patterns: {
        products: {
          description: 'Product catalog data',
          patterns: ['products:*', 'products:simple:list', 'products:category:*'],
        },
        categories: {
          description: 'Product categories',
          patterns: ['categories:*', 'categories:active:list'],
        },
        configuration: {
          description: 'Product configuration options',
          patterns: [
            'coating:options:list',
            'sides:options:list',
            'turnaround:times:list',
            'turnaround:sets:list',
            'sizes:list:*',
            'paper:stocks:list',
          ],
        },
        themes: {
          description: 'Theme settings',
          patterns: ['themes:*', 'themes:list', 'themes:active'],
        },
        designSets: {
          description: 'Design option sets',
          patterns: ['design:set:*'],
        },
        addonSets: {
          description: 'Addon option sets',
          patterns: ['addon:set:*'],
        },
        shipping: {
          description: 'Shipping rate calculations',
          patterns: ['shipping:rates:*'],
        },
        metrics: {
          description: 'Analytics and system metrics',
          patterns: ['metrics:*', 'metrics:production:*', 'metrics:system'],
        },
        all: {
          description: 'Clear all cached data',
          patterns: ['*'],
        },
      },
      examples: [
        {
          description: 'Clear product data when products updated',
          request: { patterns: ['products:*', 'categories:*'] },
        },
        {
          description: 'Clear configuration when options updated',
          request: { patterns: ['coating:*', 'sides:*', 'paper:*'] },
        },
        {
          description: 'Clear specific design set',
          request: { patterns: ['design:set:abc123'] },
        },
        {
          description: 'Clear all shipping rates',
          request: { patterns: ['shipping:rates:*'] },
        },
        {
          description: 'Clear all caches',
          request: { patterns: ['*'] },
        },
      ],
    })
  } catch (error) {
    console.error('[GET /api/cache/invalidate] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch cache patterns' }, { status: 500 })
  }
}
