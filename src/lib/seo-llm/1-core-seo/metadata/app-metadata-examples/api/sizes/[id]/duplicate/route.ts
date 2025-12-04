import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createId } from '@paralleldrive/cuid2'

// POST /api/sizes/[id]/duplicate
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Fetch the original size
    const original = await prisma.standardSize.findUnique({
      where: { id },
    })

    if (!original) {
      return NextResponse.json({ error: 'Standard size not found' }, { status: 404 })
    }

    // Get count of existing copies to generate a unique name
    const existingCopies = await prisma.standardSize.count({
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
    const duplicate = await prisma.standardSize.create({
      data: {
        id: createId(),
        name: newName,
        displayName: newDisplayName,
        width: original.width,
        height: original.height,
        preCalculatedValue: original.preCalculatedValue,
        sortOrder: original.sortOrder + 1, // Place after original
        isActive: false, // Start as inactive to prevent conflicts
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(duplicate)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to duplicate standard size' }, { status: 500 })
  }
}
