import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { randomUUID } from 'crypto'
import { cache } from 'ioredis'

// GET /api/addon-sets/[id] - Get a specific addon set
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Addon set ID is required' }, { status: 400 })
    }

    // Cache key includes the addon set ID
    const cacheKey = `addon:set:${id}`
    const cached = await cache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const addOnSet = await prisma.addOnSet.findUnique({
      where: { id },
      include: {
        AddOnSetItem: {
          include: {
            AddOn: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        ProductAddOnSet: {
          include: {
            Product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        _count: {
          select: {
            AddOnSetItem: true,
            ProductAddOnSet: true,
          },
        },
      },
    })

    if (!addOnSet) {
      return NextResponse.json({ error: 'Addon set not found' }, { status: 404 })
    }

    // Transform PascalCase to camelCase
    const transformed = {
      ...addOnSet,
      addOnSetItems: addOnSet.AddOnSetItem.map((item: any) => ({
        ...item,
        addOn: item.AddOn,
        AddOn: undefined,
      })),
      productAddOnSets: addOnSet.ProductAddOnSet,
      _count: {
        addOnSetItems: addOnSet._count.AddOnSetItem,
        productAddOnSets: addOnSet._count.ProductAddOnSet,
      },
      AddOnSetItem: undefined,
      ProductAddOnSet: undefined,
    }

    // Cache for 1 hour (3600 seconds)
    await cache.set(cacheKey, transformed, 3600)

    return NextResponse.json(transformed)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch addon set' }, { status: 500 })
  }
}

// PUT /api/addon-sets/[id] - Update a specific addon set
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { user, session } = await validateRequest()
    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { name, description, isActive, addOnItems } = body

    if (!id) {
      return NextResponse.json({ error: 'Addon set ID is required' }, { status: 400 })
    }

    // Start a transaction to update addon set and items
    const result = await prisma.$transaction(async (tx) => {
      // Update the addon set
      const updatedAddOnSet = await tx.addOnSet.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(isActive !== undefined && { isActive }),
          updatedAt: new Date(),
        },
      })

      // If addOnItems provided, update the items
      if (addOnItems) {
        // Delete existing items
        await tx.addOnSetItem.deleteMany({
          where: { addOnSetId: id },
        })

        // Create new items
        if (addOnItems.length > 0) {
          await tx.addOnSetItem.createMany({
            data: addOnItems.map((item: any, index: number) => ({
              id: randomUUID(),
              addOnSetId: id,
              addOnId: item.addOnId,
              displayPosition: item.displayPosition || 'IN_DROPDOWN',
              isDefault: item.isDefault || false,
              sortOrder: item.sortOrder ?? index,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          })
        }
      }

      // Return the complete updated addon set
      return await tx.addOnSet.findUnique({
        where: { id },
        include: {
          AddOnSetItem: {
            include: {
              AddOn: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
          _count: {
            select: {
              AddOnSetItem: true,
              ProductAddOnSet: true,
            },
          },
        },
      })
    })

    // Transform PascalCase to camelCase
    const transformed = result
      ? {
          ...result,
          addOnSetItems: result.AddOnSetItem.map((item: any) => ({
            ...item,
            addOn: item.AddOn,
            AddOn: undefined,
          })),
          _count: {
            addOnSetItems: result._count.AddOnSetItem,
            productAddOnSets: result._count.ProductAddOnSet,
          },
          AddOnSetItem: undefined,
        }
      : null

    return NextResponse.json(transformed)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update addon set' }, { status: 500 })
  }
}

// DELETE /api/addon-sets/[id] - Delete a specific addon set
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user, session } = await validateRequest()
    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if request has a body with force flag
    let force = false
    try {
      const body = await request.json()
      force = body.force === true
    } catch {
      // No body or invalid JSON, force remains false
    }

    if (!id) {
      return NextResponse.json({ error: 'Addon set ID is required' }, { status: 400 })
    }

    // Use transaction to ensure all deletions happen together
    await prisma.$transaction(async (tx) => {
      // Check if addon set is in use by products
      const productCount = await tx.productAddOnSet.count({
        where: { addOnSetId: id },
      })

      if (productCount > 0 && !force) {
        throw new Error(
          `Cannot delete addon set. It is currently used by ${productCount} product(s).`
        )
      }

      // If forcing delete or no products are using it, proceed with deletion
      if (productCount > 0 && force) {
        // Remove all product associations first
        await tx.productAddOnSet.deleteMany({
          where: { addOnSetId: id },
        })
      }

      // Delete addon set items
      await tx.addOnSetItem.deleteMany({
        where: { addOnSetId: id },
      })

      // Delete the addon set
      await tx.addOnSet.delete({
        where: { id },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to delete addon set' }, { status: 500 })
  }
}
