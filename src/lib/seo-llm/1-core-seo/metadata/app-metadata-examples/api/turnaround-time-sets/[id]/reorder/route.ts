import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT /api/turnaround-time-sets/[id]/reorder - Reorder items within a set
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { itemIds } = body

    if (!itemIds || !Array.isArray(itemIds)) {
      return NextResponse.json({ error: 'Item IDs array is required' }, { status: 400 })
    }

    // Update sort order for each item
    await prisma.$transaction(
      itemIds.map((itemId: string, index: number) =>
        prisma.turnaroundTimeSetItem.update({
          where: { id: itemId },
          data: { sortOrder: index },
        })
      )
    )

    // Fetch and return the updated set
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

    return NextResponse.json(set)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reorder turnaround time set items' },
      { status: 500 }
    )
  }
}
