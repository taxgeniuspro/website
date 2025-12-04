import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema
const assignTurnaroundTimeSetSchema = z.object({
  turnaroundTimeSetId: z.string().min(1, 'Turnaround time set ID is required'),
  isDefault: z.boolean().optional().default(false),
})

// POST /api/products/[id]/turnaround-time-set - Assign a turnaround time set to a product
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await params

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validated = assignTurnaroundTimeSetSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.issues },
        { status: 400 }
      )
    }

    const { turnaroundTimeSetId, isDefault } = validated.data

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Verify turnaround time set exists
    const turnaroundTimeSet = await prisma.turnaroundTimeSet.findUnique({
      where: { id: turnaroundTimeSetId },
    })

    if (!turnaroundTimeSet) {
      return NextResponse.json({ error: 'Turnaround time set not found' }, { status: 404 })
    }

    // Create or update the assignment
    const productTurnaroundTimeSet = await prisma.productTurnaroundTimeSet.upsert({
      where: {
        productId_turnaroundTimeSetId: {
          productId,
          turnaroundTimeSetId,
        },
      },
      create: {
        productId,
        turnaroundTimeSetId,
        isDefault,
      },
      update: {
        isDefault,
      },
      include: {
        TurnaroundTimeSet: {
          include: {
            TurnaroundTimeSetItem: {
              include: {
                TurnaroundTime: true,
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
      await prisma.productTurnaroundTimeSet.updateMany({
        where: {
          productId,
          id: { not: productTurnaroundTimeSet.id },
        },
        data: {
          isDefault: false,
        },
      })
    }

    return NextResponse.json(
      {
        success: true,
        data: productTurnaroundTimeSet,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to assign turnaround time set', details: error },
      { status: 500 }
    )
  }
}

// GET /api/products/[id]/turnaround-time-set - Get assigned turnaround time sets for a product
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await params

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const productTurnaroundTimeSets = await prisma.productTurnaroundTimeSet.findMany({
      where: { productId },
      include: {
        TurnaroundTimeSet: {
          include: {
            TurnaroundTimeSetItem: {
              include: {
                TurnaroundTime: true,
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
        data: productTurnaroundTimeSets,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch turnaround time sets', details: error },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id]/turnaround-time-set - Remove a turnaround time set from a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const { searchParams } = new URL(request.url)
    const turnaroundTimeSetId = searchParams.get('turnaroundTimeSetId')

    if (!productId || !turnaroundTimeSetId) {
      return NextResponse.json(
        { error: 'Product ID and Turnaround Time Set ID are required' },
        { status: 400 }
      )
    }

    const deleted = await prisma.productTurnaroundTimeSet.delete({
      where: {
        productId_turnaroundTimeSetId: {
          productId,
          turnaroundTimeSetId,
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
      { error: 'Failed to remove turnaround time set', details: error },
      { status: 500 }
    )
  }
}
