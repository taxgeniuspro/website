import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

// GET /api/product-categories - List all categories
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const withProducts = searchParams.get('withProducts') === 'true'
    const activeOnly = searchParams.get('active') === 'true'
    const topLevelOnly = searchParams.get('topLevel') === 'true'

    // Build where clause
    const where: Record<string, unknown> = {}
    if (activeOnly) {
      where.isActive = true
    }
    if (topLevelOnly) {
      where.parentCategoryId = null
    }
    if (withProducts) {
      where.Product = {
        some: {
          isActive: true,
        },
      }
    }

    const categories = await prisma.productCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            Product: true,
            Subcategories: true,
          },
        },
        ParentCategory: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        Vendor: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            phone: true,
          },
        },
      },
    })

    return NextResponse.json(categories)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

// POST /api/product-categories - Create new category
export async function POST(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()
    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    const slug =
      data.slug ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    const categoryId = data.id || `cat_${slug.replace(/-/g, '_')}`

    const category = await prisma.productCategory.create({
      data: {
        id: categoryId,
        name: data.name,
        slug,
        description: data.description,
        sortOrder: data.sortOrder || 0,
        isActive: data.isActive ?? true,
        isHidden: data.isHidden ?? false,
        parentCategoryId: data.parentCategoryId || null,
        vendorId: data.vendorId || null,
        brokerDiscount: Math.min(100, Math.max(0, data.brokerDiscount || 0)),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const field =
        error &&
        typeof error === 'object' &&
        'meta' in error &&
        error.meta &&
        typeof error.meta === 'object' &&
        'target' in error.meta
          ? (error.meta.target as string[])?.[0]
          : 'field'
      return NextResponse.json(
        { error: `A category with this ${field} already exists` },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
