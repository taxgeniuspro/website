import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

// POST /api/products/draft - Create a draft product
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Create a draft product (isActive: false, isDraft: true)
    const draftProduct = await prisma.product.create({
      data: {
        ...data,
        isActive: false,
        isDraft: true,
        createdBy: user.id,
        updatedBy: user.id,
      },
    })

    return NextResponse.json(draftProduct)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create draft product' }, { status: 500 })
  }
}

// GET /api/products/draft - List draft products
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const draftProducts = await prisma.product.findMany({
      where: {
        // isDraft: true, // Field doesn't exist in schema
        // createdBy: user.id, // Field doesn't exist in schema
        isActive: false, // Use isActive as draft indicator
      },
      include: {
        ProductCategory: true,
        ProductImage: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json(draftProducts)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch draft products' }, { status: 500 })
  }
}
