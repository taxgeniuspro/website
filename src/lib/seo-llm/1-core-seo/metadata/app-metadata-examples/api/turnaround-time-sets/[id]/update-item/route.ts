import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

// PUT /api/turnaround-time-sets/[id]/update-item - Update a turnaround time set item
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: setId } = await params
    const { user, session } = await validateRequest()

    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { itemId, priceOverride } = body

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    // Verify the item belongs to this set and update it
    const item = await prisma.turnaroundTimeSetItem.findFirst({
      where: {
        id: itemId,
        turnaroundTimeSetId: setId,
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found in this set' }, { status: 404 })
    }

    // Update the item
    await prisma.turnaroundTimeSetItem.update({
      where: { id: itemId },
      data: {
        priceOverride: priceOverride ?? null,
      },
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
    console.error('Failed to update turnaround time set item:', error)
    return NextResponse.json(
      { error: 'Failed to update turnaround time set item' },
      { status: 500 }
    )
  }
}
