import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

// DELETE /api/turnaround-time-sets/[id]/remove-item - Remove a turnaround time from a set
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: setId } = await params
    const { user, session } = await validateRequest()

    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { itemId } = body

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    // Verify the item belongs to this set
    const item = await prisma.turnaroundTimeSetItem.findFirst({
      where: {
        id: itemId,
        turnaroundTimeSetId: setId,
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found in this set' }, { status: 404 })
    }

    // Check if this is the last item in the set
    const itemCount = await prisma.turnaroundTimeSetItem.count({
      where: { turnaroundTimeSetId: setId },
    })

    if (itemCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove the last turnaround time from a set' },
        { status: 400 }
      )
    }

    // If removing the default item, set another item as default
    if (item.isDefault) {
      await prisma.$transaction(async (tx) => {
        // Delete the item
        await tx.turnaroundTimeSetItem.delete({
          where: { id: itemId },
        })

        // Set the first remaining item as default
        const firstItem = await tx.turnaroundTimeSetItem.findFirst({
          where: { turnaroundTimeSetId: setId },
          orderBy: { sortOrder: 'asc' },
        })

        if (firstItem) {
          await tx.turnaroundTimeSetItem.update({
            where: { id: firstItem.id },
            data: { isDefault: true },
          })
        }
      })
    } else {
      // Just delete the item
      await prisma.turnaroundTimeSetItem.delete({
        where: { id: itemId },
      })
    }

    // Return the updated set
    const updatedSet = await prisma.turnaroundTimeSet.findUnique({
      where: { id: setId },
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

    return NextResponse.json(updatedSet)
  } catch (error) {
    console.error('Failed to remove turnaround time from set:', error)
    return NextResponse.json(
      { error: 'Failed to remove turnaround time from set' },
      { status: 500 }
    )
  }
}
