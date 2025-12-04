import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

// GET /api/product-categories/[id] - Get single category
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const category = await prisma.productCategory.findUnique({
      where: { id },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 })
  }
}

// PUT /api/product-categories/[id] - Update category
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { user, session } = await validateRequest()
    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    const category = await prisma.productCategory.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        isHidden: data.isHidden ?? false,
        parentCategoryId: data.parentCategoryId || null,
        vendorId: data.vendorId || null,
        brokerDiscount: Math.min(100, Math.max(0, data.brokerDiscount || 0)),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(category)
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const field = error?.meta?.target?.[0]
      return NextResponse.json(
        { error: `A category with this ${field} already exists` },
        { status: 400 }
      )
    }

    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

// DELETE /api/product-categories/[id] - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate authentication
    let user, session
    try {
      const authResult = await validateRequest()
      user = authResult.user
      session = authResult.session
    } catch (authError) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          details: process.env.NODE_ENV === 'development' ? String(authError) : undefined,
        },
        { status: 401 }
      )
    }

    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          error: 'Unauthorized - Admin access required',
          details: { hasSession: !!session, hasUser: !!user, userRole: user?.role },
        },
        { status: 401 }
      )
    }

    // Check if category has products
    const category = await prisma.productCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (category._count.products > 0) {
      // Soft delete - just deactivate
      const updatedCategory = await prisma.productCategory.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({
        message: 'Category deactivated (has products)',
        category: updatedCategory,
      })
    }

    // Hard delete if no products
    await prisma.productCategory.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error: any) {
    // Handle Prisma-specific errors
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (error?.code === 'P2003') {
      return NextResponse.json(
        {
          error: 'Cannot delete category: It has related records that depend on it',
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: `Delete failed: ${error.message}`,
          details: process.env.NODE_ENV === 'development' ? error : undefined,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
