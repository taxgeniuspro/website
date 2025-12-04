import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createId } from '@paralleldrive/cuid2'

// POST /api/paper-stock-sets/[id]/duplicate
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Fetch the original paper stock set with items
    const original = await prisma.paperStockSet.findUnique({
      where: { id },
      include: {
        PaperStockSetItem: {
          include: {
            PaperStock: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    })

    if (!original) {
      return NextResponse.json({ error: 'Paper stock set not found' }, { status: 404 })
    }

    // Get count of existing copies to generate a unique name
    const existingCopies = await prisma.paperStockSet.count({
      where: {
        name: {
          startsWith: `${original.name} (Copy`,
        },
      },
    })

    const copyNumber = existingCopies + 1
    const newName = `${original.name} (Copy ${copyNumber})`

    // Create the duplicated paper stock set with items using transaction
    const duplicate = await prisma.$transaction(async (tx) => {
      // Create the new paper stock set
      const newPaperStockSet = await tx.paperStockSet.create({
        data: {
          id: createId(),
          name: newName,
          description: original.description ? `${original.description} (Copy)` : null,
          sortOrder: original.sortOrder + 1, // Place after original
          isActive: false, // Start as inactive to prevent conflicts
          updatedAt: new Date(),
        },
      })

      // Copy all paper stock set items
      if (original.PaperStockSetItem.length > 0) {
        await tx.paperStockSetItem.createMany({
          data: original.PaperStockSetItem.map((item) => ({
            id: createId(),
            paperStockSetId: newPaperStockSet.id,
            paperStockId: item.paperStockId,
            isDefault: item.isDefault,
            sortOrder: item.sortOrder,
            updatedAt: new Date(),
          })),
        })
      }

      // Return the complete duplicated paper stock set
      return await tx.paperStockSet.findUnique({
        where: { id: newPaperStockSet.id },
        include: {
          PaperStockSetItem: {
            include: {
              PaperStock: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
      })
    })

    return NextResponse.json({
      message: 'Paper stock set duplicated successfully',
      paperStockSet: duplicate,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to duplicate paper stock set' }, { status: 500 })
  }
}
