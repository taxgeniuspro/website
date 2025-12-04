import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createId } from '@paralleldrive/cuid2'

// POST /api/quantities/[id]/duplicate
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Fetch the original quantity
    const original = await prisma.standardQuantity.findUnique({
      where: { id },
    })

    if (!original) {
      return NextResponse.json({ error: 'Standard quantity not found' }, { status: 404 })
    }

    // Find the next available displayValue
    const maxDisplayValue = await prisma.standardQuantity.findFirst({
      orderBy: { displayValue: 'desc' },
      select: { displayValue: true },
    })

    const newDisplayValue = (maxDisplayValue?.displayValue || 0) + 100 // Increment by 100 to avoid conflicts

    // Create a duplicate with modified displayValue
    const duplicate = await prisma.standardQuantity.create({
      data: {
        id: createId(),
        displayValue: newDisplayValue,
        calculationValue: original.calculationValue,
        adjustmentValue: original.adjustmentValue,
        sortOrder: original.sortOrder + 1, // Place after original
        isActive: false, // Start as inactive to prevent conflicts
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(duplicate)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to duplicate standard quantity' }, { status: 500 })
  }
}
