import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cache } from 'ioredis'

// Simple working products endpoint for testing
export async function GET(request: NextRequest) {
  try {
    // Cache key for products list
    const cacheKey = 'products:simple:list'

    // Try to get from cache first
    const cached = await cache.get(cacheKey)
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        count: cached.length,
        message: `Found ${cached.length} products (cached)`,
        cached: true,
      })
    }

    const products = await prisma.product.findMany({
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        description: true,
        shortDescription: true,
        basePrice: true,
        setupFee: true,
        isActive: true,
        isFeatured: true,
        categoryId: true,
        createdAt: true,
        updatedAt: true,
        ProductCategory: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        ProductQuantityGroup: {
          include: {
            QuantityGroup: {
              select: {
                id: true,
                name: true,
                values: true,
                defaultValue: true,
              },
            },
          },
        },
        ProductPaperStockSet: {
          include: {
            PaperStockSet: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        ProductAddOn: {
          include: {
            AddOn: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: {
            ProductImage: true,
            ProductQuantityGroup: true,
            ProductPaperStockSet: true,
            ProductAddOn: true,
          },
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    })

    // Cache for 1 hour (3600 seconds)
    await cache.set(cacheKey, products, 3600)

    return NextResponse.json({
      success: true,
      data: products,
      count: products.length,
      message: `Found ${products.length} products`,
      cached: false,
    })
  } catch (error) {
    console.error('❌ Products API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
