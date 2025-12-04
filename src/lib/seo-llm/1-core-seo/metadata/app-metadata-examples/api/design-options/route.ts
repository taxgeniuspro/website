import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { randomUUID } from 'crypto'

// Schema for creating/updating a design option
const designOptionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().nullable().optional(),
  tooltipText: z.string().nullable().optional(),
  pricingType: z.enum(['FREE', 'FLAT', 'SIDE_BASED']).default('FLAT'),
  requiresSideSelection: z.boolean().default(false),
  sideOnePrice: z.number().nullable().optional(),
  sideTwoPrice: z.number().nullable().optional(),
  basePrice: z.number().default(0),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})

// GET - List all design options
export async function GET(): Promise<unknown> {
  try {
    const options = await prisma.designOption.findMany({
      orderBy: {
        sortOrder: 'asc',
      },
    })

    return NextResponse.json(options)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch design options' }, { status: 500 })
  }
}

// POST - Create a new design option
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = designOptionSchema.parse(body)

    // Check if name already exists
    const existingOption = await prisma.designOption.findUnique({
      where: { name: validatedData.name },
    })

    if (existingOption) {
      return NextResponse.json(
        { error: 'A design option with this name already exists' },
        { status: 400 }
      )
    }

    // Check if code already exists
    const existingCode = await prisma.designOption.findUnique({
      where: { code: validatedData.code },
    })

    if (existingCode) {
      return NextResponse.json(
        { error: 'A design option with this code already exists' },
        { status: 400 }
      )
    }

    // Create the design option
    const option = await prisma.designOption.create({
      data: {
        id: randomUUID(),
        ...validatedData,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(option)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to create design option' }, { status: 500 })
  }
}
