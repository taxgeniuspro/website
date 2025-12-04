import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createId } from '@paralleldrive/cuid2'

// POST /api/turnaround-times/[id]/duplicate
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Fetch the original turnaround time
    const original = await prisma.turnaroundTime.findUnique({
      where: { id },
    })

    if (!original) {
      return NextResponse.json({ error: 'Turnaround time not found' }, { status: 404 })
    }

    // Get count of existing copies to generate a unique name
    const existingCopies = await prisma.turnaroundTime.count({
      where: {
        name: {
          startsWith: `${original.name} (Copy`,
        },
      },
    })

    const copyNumber = existingCopies + 1
    const newName = `${original.name} (Copy ${copyNumber})`
    const newDisplayName = `${original.displayName} (Copy ${copyNumber})`

    // Create a duplicate with modified name
    const duplicate = await prisma.turnaroundTime.create({
      data: {
        id: createId(),
        name: newName,
        displayName: newDisplayName,
        description: original.description,
        daysMin: original.daysMin,
        daysMax: original.daysMax,
        pricingModel: original.pricingModel,
        basePrice: original.basePrice,
        priceMultiplier: original.priceMultiplier,
        requiresNoCoating: original.requiresNoCoating,
        restrictedCoatings: original.restrictedCoatings,
        restrictedOptions: original.restrictedOptions,
        sortOrder: original.sortOrder + 1, // Place after original
        isActive: false, // Start as inactive to prevent conflicts
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(duplicate)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to duplicate turnaround time' }, { status: 500 })
  }
}
