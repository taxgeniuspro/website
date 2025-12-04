import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createId } from '@paralleldrive/cuid2'

// POST /api/paper-stocks/[id]/duplicate
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Fetch the original paper stock with relationships
    const original = await prisma.paperStock.findUnique({
      where: { id },
      include: {
        paperStockCoatings: {
          include: {
            CoatingOption: true,
          },
        },
        paperStockSides: {
          include: {
            SidesOption: true,
          },
        },
      },
    })

    if (!original) {
      return NextResponse.json({ error: 'Paper stock not found' }, { status: 404 })
    }

    // Get count of existing copies to generate a unique name
    const existingCopies = await prisma.paperStock.count({
      where: {
        name: {
          startsWith: `${original.name} (Copy`,
        },
      },
    })

    const copyNumber = existingCopies + 1
    const newName = `${original.name} (Copy ${copyNumber})`

    // Create the duplicated paper stock with relationships using transaction
    const duplicate = await prisma.$transaction(async (tx) => {
      // Create the new paper stock
      const newPaperStock = await tx.paperStock.create({
        data: {
          id: createId(),
          name: newName,
          pricePerSqInch: original.pricePerSqInch,
          tooltipText: original.tooltipText,
          weight: original.weight,
          isActive: false, // Start as inactive to prevent conflicts
          updatedAt: new Date(),
        },
      })

      // Copy paper stock coatings
      if (original.paperStockCoatings.length > 0) {
        await tx.paperStockCoating.createMany({
          data: original.paperStockCoatings.map((coating) => ({
            paperStockId: newPaperStock.id,
            coatingId: coating.coatingId,
            isDefault: coating.isDefault,
          })),
        })
      }

      // Copy paper stock sides
      if (original.paperStockSides.length > 0) {
        await tx.paperStockSides.createMany({
          data: original.paperStockSides.map((side) => ({
            paperStockId: newPaperStock.id,
            sidesOptionId: side.sidesOptionId,
            priceMultiplier: side.priceMultiplier,
            isEnabled: side.isEnabled,
          })),
        })
      }

      // Return the complete duplicated paper stock
      return await tx.paperStock.findUnique({
        where: { id: newPaperStock.id },
        include: {
          paperStockCoatings: {
            include: {
              CoatingOption: true,
            },
          },
          paperStockSides: {
            include: {
              SidesOption: true,
            },
          },
        },
      })
    })

    return NextResponse.json({
      message: 'Paper stock duplicated successfully',
      PaperStock: duplicate,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to duplicate paper stock' }, { status: 500 })
  }
}
