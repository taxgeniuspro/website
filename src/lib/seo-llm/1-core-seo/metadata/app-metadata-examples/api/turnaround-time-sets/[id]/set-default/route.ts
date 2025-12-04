import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

// PUT /api/turnaround-time-sets/[id]/set-default - Set default turnaround time for a set
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Update in a transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      // Verify the item belongs to this set
      const item = await tx.turnaroundTimeSetItem.findFirst({
        where: {
          id: itemId,
          turnaroundTimeSetId: setId,
        },
      })

      if (!item) {
        throw new Error('Item not found in this set')
      }

      // Unset all defaults in this set
      await tx.turnaroundTimeSetItem.updateMany({
        where: { turnaroundTimeSetId: setId },
        data: { isDefault: false },
      })

      // Set the new default
      await tx.turnaroundTimeSetItem.update({
        where: { id: itemId },
        data: { isDefault: true },
      })
    })

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
    console.error('Failed to set default turnaround time:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set default turnaround time' },
      { status: 500 }
    )
  }
}
