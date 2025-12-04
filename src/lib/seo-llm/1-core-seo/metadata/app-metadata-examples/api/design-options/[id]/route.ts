import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const designOptionSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  code: z.string().min(1, 'Code is required').optional(),
  description: z.string().nullable().optional(),
  tooltipText: z.string().nullable().optional(),
  pricingType: z.enum(['FREE', 'FLAT', 'SIDE_BASED']).optional(),
  requiresSideSelection: z.boolean().optional(),
  sideOnePrice: z.number().nullable().optional(),
  sideTwoPrice: z.number().nullable().optional(),
  basePrice: z.number().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET - Fetch a single design option
export async function GET(_request: NextRequest, context: RouteContext): Promise<unknown> {
  try {
    const { id } = await context.params

    const option = await prisma.designOption.findUnique({
      where: { id },
    })

    if (!option) {
      return NextResponse.json({ error: 'Design option not found' }, { status: 404 })
    }

    return NextResponse.json(option)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch design option' }, { status: 500 })
  }
}

// PUT/PATCH - Update a design option
export async function PUT(request: NextRequest, context: RouteContext): Promise<unknown> {
  try {
    const { id } = await context.params
    const body = await request.json()
    const validatedData = designOptionSchema.parse(body)

    // Check if option exists
    const existingOption = await prisma.designOption.findUnique({
      where: { id },
    })

    if (!existingOption) {
      return NextResponse.json({ error: 'Design option not found' }, { status: 404 })
    }

    // If updating name, check for duplicates
    if (validatedData.name && validatedData.name !== existingOption.name) {
      const duplicate = await prisma.designOption.findUnique({
        where: { name: validatedData.name },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'A design option with this name already exists' },
          { status: 400 }
        )
      }
    }

    // If updating code, check for duplicates
    if (validatedData.code && validatedData.code !== existingOption.code) {
      const duplicate = await prisma.designOption.findUnique({
        where: { code: validatedData.code },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'A design option with this code already exists' },
          { status: 400 }
        )
      }
    }

    // Update the design option
    const updated = await prisma.designOption.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to update design option' }, { status: 500 })
  }
}

export const PATCH = PUT

// DELETE - Delete a design option
export async function DELETE(_request: NextRequest, context: RouteContext): Promise<unknown> {
  try {
    const { id } = await context.params

    // Check if option exists
    const existingOption = await prisma.designOption.findUnique({
      where: { id },
      include: {
        DesignSetItem: true,
      },
    })

    if (!existingOption) {
      return NextResponse.json({ error: 'Design option not found' }, { status: 404 })
    }

    // Check if option is used in any design sets
    if (existingOption.DesignSetItem && existingOption.DesignSetItem.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete design option that is used in design sets',
          details: `This option is used in ${existingOption.DesignSetItem.length} design set(s)`,
        },
        { status: 400 }
      )
    }

    // Delete the option
    await prisma.designOption.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete design option' }, { status: 500 })
  }
}
