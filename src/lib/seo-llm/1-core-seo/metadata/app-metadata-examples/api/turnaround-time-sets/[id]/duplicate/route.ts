import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createId } from '@paralleldrive/cuid2'

// POST /api/turnaround-time-sets/[id]/duplicate
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Fetch the original turnaround time set with items
    const original = await prisma.turnaroundTimeSet.findUnique({
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

    if (!original) {
      return NextResponse.json({ error: 'Turnaround time set not found' }, { status: 404 })
    }

    // Get count of existing copies to generate a unique name
    const existingCopies = await prisma.turnaroundTimeSet.count({
      where: {
        name: {
          startsWith: `${original.name} (Copy`,
        },
      },
    })

    const copyNumber = existingCopies + 1
    const newName = `${original.name} (Copy ${copyNumber})`

    // Create the duplicated turnaround time set with items using transaction
    const duplicate = await prisma.$transaction(async (tx) => {
      // Create the new turnaround time set
      const newTurnaroundTimeSet = await tx.turnaroundTimeSet.create({
        data: {
          id: createId(),
          name: newName,
          description: original.description ? `${original.description} (Copy)` : null,
          sortOrder: original.sortOrder + 1, // Place after original
          isActive: false, // Start as inactive to prevent conflicts
          updatedAt: new Date(),
        },
      })

      // Copy all turnaround time set items
      if (original.TurnaroundTimeSetItem.length > 0) {
        await tx.turnaroundTimeSetItem.createMany({
          data: original.TurnaroundTimeSetItem.map((item) => ({
            id: createId(),
            turnaroundTimeSetId: newTurnaroundTimeSet.id,
            turnaroundTimeId: item.turnaroundTimeId,
            isDefault: item.isDefault,
            sortOrder: item.sortOrder,
            priceOverride: item.priceOverride,
            updatedAt: new Date(),
          })),
        })
      }

      // Return the complete duplicated turnaround time set
      return await tx.turnaroundTimeSet.findUnique({
        where: { id: newTurnaroundTimeSet.id },
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

    return NextResponse.json({
      message: 'Turnaround time set duplicated successfully',
      TurnaroundTimeSet: duplicate,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to duplicate turnaround time set' }, { status: 500 })
  }
}
