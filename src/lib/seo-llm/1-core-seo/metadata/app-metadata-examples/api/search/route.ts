import { type NextRequest, NextResponse } from 'next/server'
import { type Prisma } from '@prisma/client'

import { logSearch } from '@/components/GoogleAnalytics'
import { prisma } from '@/lib/prisma'
import { cache } from 'ioredis'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const category = searchParams.get('category')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const sortBy = searchParams.get('sortBy') || 'relevance'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Generate cache key
    const cacheKey = `search:${JSON.stringify({
      query,
      category,
      minPrice,
      maxPrice,
      sortBy,
      page,
      limit,
    })}`

    // Try to get from cache
    const cached = await cache.get(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Build search conditions properly typed
    const whereConditions: Prisma.ProductWhereInput[] = []

    // Only show active products
    whereConditions.push({ isActive: true })

    // Text search
    if (query) {
      whereConditions.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { shortDescription: { contains: query, mode: 'insensitive' } },
        ],
      })
    }

    // Category filter
    if (category) {
      whereConditions.push({
        ProductCategory: {
          name: { equals: category, mode: 'insensitive' },
        },
      })
    }

    // Price range filter
    if (minPrice || maxPrice) {
      const priceFilter: Prisma.FloatFilter = {}
      if (minPrice) priceFilter.gte = parseFloat(minPrice)
      if (maxPrice) priceFilter.lte = parseFloat(maxPrice)
      whereConditions.push({ basePrice: priceFilter })
    }

    const where: Prisma.ProductWhereInput = {
      AND: whereConditions,
    }

    // Determine order by - properly typed
    let orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] =
      {}

    switch (sortBy) {
      case 'price_asc':
        orderBy = { basePrice: 'asc' }
        break
      case 'price_desc':
        orderBy = { basePrice: 'desc' }
        break
      case 'name':
        orderBy = { name: 'asc' }
        break
      case 'newest':
        orderBy = { createdAt: 'desc' }
        break
      case 'popular':
        // Sort by featured first, then by creation date
        orderBy = [{ isFeatured: 'desc' }, { createdAt: 'desc' }]
        break
      default:
        // Relevance: featured first, then newest
        orderBy = [{ isFeatured: 'desc' }, { createdAt: 'desc' }]
    }

    // Execute search with pagination
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          ProductCategory: true,
          ProductImage: {
            where: { isPrimary: true },
            take: 1,
            include: {
              Image: true,
            },
          },
          productSizes: {
            where: { isActive: true },
          },
          productPaperStocks: {
            include: {
              PaperStock: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ])

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    // Format response
    const response = {
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        shortDescription: product.shortDescription,
        basePrice: product.basePrice,
        category: product.productCategory?.name,
        categorySlug: product.productCategory?.slug,
        image: product.productImages[0]?.Image?.url || null,
        thumbnailUrl: product.productImages[0]?.Image?.thumbnailUrl || null,
        isFeatured: product.isFeatured,
        isActive: product.isActive,
        productionTime: product.productionTime,
        sizesCount: product.productSizes.length,
        paperStocksCount: product.productPaperStocks.length,
        setupFee: product.setupFee,
        rushAvailable: product.rushAvailable,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      query,
      filters: {
        category,
        minPrice: minPrice ? parseFloat(minPrice) : null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        sortBy,
      },
    }

    // Cache the results for 5 minutes
    await cache.set(cacheKey, response, 300)

    // Log the search
    if (query) {
      logSearch(query, totalCount)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Failed to perform search' }, { status: 500 })
  }
}
