import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

// GET /api/turnaround-time-sets/[id] - Get a single turnaround time set
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const set = await prisma.turnaroundTimeSet.findUnique({
      where: { id },
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
    })

    if (!set) {
      return NextResponse.json({ error: 'Turnaround time set not found' }, { status: 404 })
    }

    return NextResponse.json(set)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch turnaround time set' }, { status: 500 })
  }
}

// PUT /api/turnaround-time-sets/[id] - Update a turnaround time set
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { user, session } = await validateRequest()
    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { name, description, isActive, turnaroundTimeIds } = body

    // Start a transaction to update the set and its items
    const set = await prisma.$transaction(async (tx) => {
      // Update the set itself
      const updatedSet = await tx.turnaroundTimeSet.update({
        where: { id },
        data: {
          name,
          description,
          isActive,
        },
      })

      // If turnaroundTimeIds provided, update the items
      if (turnaroundTimeIds) {
        // Delete existing items
        await tx.turnaroundTimeSetItem.deleteMany({
          where: { turnaroundTimeSetId: id },
        })

        // Create new items
        await tx.turnaroundTimeSetItem.createMany({
          data: turnaroundTimeIds.map((turnaroundTimeId: string, index: number) => ({
            turnaroundTimeSetId: id,
            turnaroundTimeId,
            sortOrder: index,
            isDefault: index === 0,
          })),
        })
      }

      // Return the updated set with items
      return await tx.turnaroundTimeSet.findUnique({
        where: { id },
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
      })
    })

    return NextResponse.json(set)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update turnaround time set' }, { status: 500 })
  }
}

// DELETE /api/turnaround-time-sets/[id] - Delete a turnaround time set
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

    // Check if set is in use by any products
    const productsUsingSet = await prisma.productTurnaroundTimeSet.count({
      where: { turnaroundTimeSetId: id },
    })

    if (productsUsingSet > 0) {
      return NextResponse.json(
        {
          error: `This set is used by ${productsUsingSet} product(s). Remove from products before deleting.`,
        },
        { status: 400 }
      )
    }

    // Delete the set (items will cascade)
    await prisma.turnaroundTimeSet.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete turnaround time set' }, { status: 500 })
  }
}
