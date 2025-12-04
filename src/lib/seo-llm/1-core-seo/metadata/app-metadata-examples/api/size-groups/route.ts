import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema for creating/updating a size group
const sizeGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  values: z.string().min(1, 'Values is required'),
  defaultValue: z.string().min(1, 'Default value is required'),
  customMinWidth: z.number().nullable().optional(),
  customMaxWidth: z.number().nullable().optional(),
  customMinHeight: z.number().nullable().optional(),
  customMaxHeight: z.number().nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})

// GET - List all size groups
export async function GET(): Promise<unknown> {
  try {
    const groups = await prisma.sizeGroup.findMany({
      orderBy: {
        sortOrder: 'asc',
      },
    })

    return NextResponse.json(groups)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch size groups' }, { status: 500 })
  }
}

// POST - Create a new size group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = sizeGroupSchema.parse(body)

    // Check if name already exists
    const existingGroup = await prisma.sizeGroup.findUnique({
      where: { name: validatedData.name },
    })

    if (existingGroup) {
      return NextResponse.json(
        { error: 'A size group with this name already exists' },
        { status: 400 }
      )
    }

    // Create the size group with proper ID and timestamps
    const group = await prisma.sizeGroup.create({
      data: {
        ...validatedData,
        id: crypto.randomUUID(),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(group)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to create size group' }, { status: 500 })
  }
}
