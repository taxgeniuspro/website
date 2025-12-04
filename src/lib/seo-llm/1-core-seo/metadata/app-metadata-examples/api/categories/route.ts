import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cache } from 'ioredis'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Revalidate every hour

export async function GET() {
  try {
    // Cache key for categories
    const cacheKey = 'categories:active:list'

    // Try to get from cache first
    const cached = await cache.get(cacheKey)
    if (cached) {
      return NextResponse.json({
        success: true,
        categories: cached,
        cached: true,
      })
    }

    // Fetch categories that have at least one active product
    // Exclude hidden categories (used for SEO city products)
    const categories = await prisma.productCategory.findMany({
      where: {
        isHidden: false, // Only show non-hidden categories in navigation
        Product: {
          some: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: {
          select: {
            Product: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Transform to match frontend format
    const formattedCategories = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      productCount: cat._count.Product,
      href: `/products?category=${cat.slug}`,
    }))

    // Cache for 1 hour (3600 seconds)
    await cache.set(cacheKey, formattedCategories, 3600)

    return NextResponse.json({
      success: true,
      categories: formattedCategories,
      cached: false,
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch categories',
      },
      { status: 500 }
    )
  }
}
