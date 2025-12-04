import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createId } from '@paralleldrive/cuid2'

// POST /api/product-categories/[id]/duplicate
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Fetch the original category
    const original = await prisma.productCategory.findUnique({
      where: { id },
    })

    if (!original) {
      return NextResponse.json({ error: 'Product category not found' }, { status: 404 })
    }

    // Get count of existing copies to generate a unique name
    const existingCopies = await prisma.productCategory.count({
      where: {
        name: {
          startsWith: `${original.name} (Copy`,
        },
      },
    })

    const copyNumber = existingCopies + 1
    const newName = `${original.name} (Copy ${copyNumber})`
    const newSlug = `${original.slug}-copy-${copyNumber}`

    // Create a duplicate with modified name and slug
    const duplicate = await prisma.productCategory.create({
      data: {
        id: createId(),
        name: newName,
        slug: newSlug,
        description: original.description,
        sortOrder: original.sortOrder + 1, // Place after original
        isActive: false, // Start as inactive to prevent conflicts
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(duplicate)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to duplicate product category' }, { status: 500 })
  }
}
