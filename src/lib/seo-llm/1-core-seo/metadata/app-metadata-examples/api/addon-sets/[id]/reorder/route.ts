import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/addon-sets/[id]/reorder - Reorder items within an addon set
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { itemIds } = body

    if (!id) {
      return NextResponse.json({ error: 'Addon set ID is required' }, { status: 400 })
    }

    if (!itemIds || !Array.isArray(itemIds)) {
      return NextResponse.json({ error: 'itemIds array is required' }, { status: 400 })
    }

    // Verify all items belong to this addon set
    const items = await prisma.addOnSetItem.findMany({
      where: {
        id: { in: itemIds },
        addOnSetId: id,
      },
    })

    if (items.length !== itemIds.length) {
      return NextResponse.json(
        { error: 'Some items do not belong to this addon set' },
        { status: 400 }
      )
    }

    // Update sort orders
    const updatePromises = itemIds.map((itemId: string, index: number) =>
      prisma.addOnSetItem.update({
        where: { id: itemId },
        data: { sortOrder: index },
      })
    )

    await Promise.all(updatePromises)

    // Return updated addon set
    const updatedAddOnSet = await prisma.addOnSet.findUnique({
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
      },
    })

    return NextResponse.json(updatedAddOnSet)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to reorder addon set items' }, { status: 500 })
  }
}
