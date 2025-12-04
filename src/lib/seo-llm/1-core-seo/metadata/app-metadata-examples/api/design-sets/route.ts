import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { randomUUID } from 'crypto'

// Schema for creating/updating a design set
const designSetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  designOptions: z
    .array(
      z.object({
        id: z.string(),
        isDefault: z.boolean().default(false),
        sortOrder: z.number().int().min(0).default(0),
      })
    )
    .optional(),
})

// GET - List all design sets
export async function GET(): Promise<unknown> {
  try {
    const sets = await prisma.designSet.findMany({
      include: {
        DesignSetItem: {
          include: {
            DesignOption: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        ProductDesignSet: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    })

    // Transform the data to match frontend expectations
    const transformedSets = sets.map((set) => ({
      ...set,
      designOptionItems: (set.DesignSetItem || []).map((item) => ({
        id: item.id,
        designOptionId: item.designOptionId,
        isDefault: item.isDefault,
        sortOrder: item.sortOrder,
        designOption: item.DesignOption,
      })),
      productDesignSets: set.ProductDesignSet || [],
    }))

    return NextResponse.json(transformedSets)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch design sets' }, { status: 500 })
  }
}

// POST - Create a new design set
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = designSetSchema.parse(body)

    // Check if name already exists
    const existingSet = await prisma.designSet.findUnique({
      where: { name: validatedData.name },
    })

    if (existingSet) {
      return NextResponse.json(
        { error: 'A design set with this name already exists' },
        { status: 400 }
      )
    }

    // Ensure at least one design option is marked as default
    const designOptionsWithDefault = validatedData.designOptions || []
    if (designOptionsWithDefault.length > 0) {
      const hasDefault = designOptionsWithDefault.some((option) => option.isDefault)
      if (!hasDefault) {
        // If no default is set, make the first one default
        designOptionsWithDefault[0].isDefault = true
      }
    }

    // Create the design set with items
    const set = await prisma.designSet.create({
      data: {
        id: randomUUID(),
        name: validatedData.name,
        description: validatedData.description,
        sortOrder: validatedData.sortOrder,
        isActive: validatedData.isActive,
        updatedAt: new Date(),
        DesignSetItem: {
          create: designOptionsWithDefault.map((option, index) => ({
            id: randomUUID(),
            designOptionId: option.id,
            isDefault: option.isDefault,
            sortOrder: option.sortOrder || index,
            updatedAt: new Date(),
          })),
        },
      },
      include: {
        DesignSetItem: {
          include: {
            DesignOption: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        ProductDesignSet: true,
      },
    })

    // Transform the data to match frontend expectations
    const transformedSet = {
      ...set,
      designOptionItems: (set.DesignSetItem || []).map((item) => ({
        id: item.id,
        designOptionId: item.designOptionId,
        isDefault: item.isDefault,
        sortOrder: item.sortOrder,
        designOption: item.DesignOption,
      })),
      productDesignSets: set.ProductDesignSet || [],
    }

    return NextResponse.json(transformedSet)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to create design set' }, { status: 500 })
  }
}
