import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema for creating/updating a quantity group
const quantityGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  values: z.string().min(1, 'Values is required'),
  defaultValue: z.string().min(1, 'Default value is required'),
  customMin: z.number().int().nullable().optional(),
  customMax: z.number().int().nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})

// GET - List all quantity groups
export async function GET(): Promise<unknown> {
  try {
    const groups = await prisma.quantityGroup.findMany({
      orderBy: {
        sortOrder: 'asc',
      },
    })

    return NextResponse.json(groups)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch quantity groups' }, { status: 500 })
  }
}

// POST - Create a new quantity group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = quantityGroupSchema.parse(body)

    // Check if name already exists
    const existingGroup = await prisma.quantityGroup.findUnique({
      where: { name: validatedData.name },
    })

    if (existingGroup) {
      return NextResponse.json(
        { error: 'A quantity group with this name already exists' },
        { status: 400 }
      )
    }

    // Create the quantity group
    const group = await prisma.quantityGroup.create({
      data: validatedData,
    })

    return NextResponse.json(group)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to create quantity group' }, { status: 500 })
  }
}
