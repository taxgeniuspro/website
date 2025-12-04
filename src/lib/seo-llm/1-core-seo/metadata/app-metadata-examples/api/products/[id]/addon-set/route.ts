import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema
const assignAddOnSetSchema = z.object({
  addOnSetId: z.string().min(1, 'AddOn set ID is required'),
  isDefault: z.boolean().optional().default(false),
})

// POST /api/products/[id]/addon-set - Assign an addon set to a product
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await params

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validated = assignAddOnSetSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.issues },
        { status: 400 }
      )
    }

    const { addOnSetId, isDefault } = validated.data

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Verify addon set exists
    const addOnSet = await prisma.addOnSet.findUnique({
      where: { id: addOnSetId },
    })

    if (!addOnSet) {
      return NextResponse.json({ error: 'AddOn set not found' }, { status: 404 })
    }

    // Create or update the assignment
    const productAddOnSet = await prisma.productAddOnSet.upsert({
      where: {
        productId_addOnSetId: {
          productId,
          addOnSetId,
        },
      },
      create: {
        productId,
        addOnSetId,
        isDefault,
      },
      update: {
        isDefault,
      },
      include: {
        AddOnSet: {
          include: {
            AddOnSetItem: {
              include: {
                AddOn: true,
              },
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
        },
      },
    })

    // If this is set as default, update other assignments for this product
    if (isDefault) {
      await prisma.productAddOnSet.updateMany({
        where: {
          productId,
          id: { not: productAddOnSet.id },
        },
        data: {
          isDefault: false,
        },
      })
    }

    return NextResponse.json(
      {
        success: true,
        data: productAddOnSet,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to assign addon set', details: error },
      { status: 500 }
    )
  }
}

// GET /api/products/[id]/addon-set - Get assigned addon sets for a product
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await params

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const productAddOnSets = await prisma.productAddOnSet.findMany({
      where: { productId },
      include: {
        AddOnSet: {
          include: {
            AddOnSetItem: {
              include: {
                AddOn: {
                  include: {
                    addOnSubOptions: true,
                  },
                },
              },
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json(
      {
        success: true,
        data: productAddOnSets,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch addon sets', details: error },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id]/addon-set - Remove an addon set from a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const { searchParams } = new URL(request.url)
    const addOnSetId = searchParams.get('addOnSetId')

    if (!productId || !addOnSetId) {
      return NextResponse.json(
        { error: 'Product ID and AddOn Set ID are required' },
        { status: 400 }
      )
    }

    const deleted = await prisma.productAddOnSet.delete({
      where: {
        productId_addOnSetId: {
          productId,
          addOnSetId,
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: deleted,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to remove addon set', details: error },
      { status: 500 }
    )
  }
}
