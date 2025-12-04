import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { randomUUID } from 'crypto'

// Schema for creating/updating a paper stock set
const paperStockSetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  paperStocks: z
    .array(
      z.object({
        id: z.string(),
        isDefault: z.boolean().default(false),
        sortOrder: z.number().int().min(0).default(0),
      })
    )
    .optional(),
})

// GET - List all paper stock sets
export async function GET(): Promise<unknown> {
  try {
    const groups = await prisma.paperStockSet.findMany({
      include: {
        PaperStockSetItem: {
          include: {
            PaperStock: {
              include: {
                PaperStockCoating: {
                  include: {
                    CoatingOption: true,
                  },
                },
                PaperStockSides: {
                  include: {
                    SidesOption: true,
                  },
                },
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        ProductPaperStockSet: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    })

    // Transform the data to match frontend expectations
    const transformedGroups = groups.map((group) => ({
      ...group,
      paperStockItems: (group.PaperStockSetItem || []).map((item) => ({
        id: item.id,
        paperStockId: item.paperStockId,
        isDefault: item.isDefault,
        sortOrder: item.sortOrder,
        paperStock: item.PaperStock,
      })),
      productPaperStockGroups: group.ProductPaperStockSet || [],
    }))

    return NextResponse.json(transformedGroups)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch paper stock sets' }, { status: 500 })
  }
}

// POST - Create a new paper stock set
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = paperStockSetSchema.parse(body)

    // Check if name already exists
    const existingGroup = await prisma.paperStockSet.findUnique({
      where: { name: validatedData.name },
    })

    if (existingGroup) {
      return NextResponse.json(
        { error: 'A paper stock set with this name already exists' },
        { status: 400 }
      )
    }

    // Ensure at least one paper stock is marked as default
    const paperStocksWithDefault = validatedData.paperStocks || []
    if (paperStocksWithDefault.length > 0) {
      const hasDefault = paperStocksWithDefault.some((stock) => stock.isDefault)
      if (!hasDefault) {
        // If no default is set, make the first one default
        paperStocksWithDefault[0].isDefault = true
      }
    }

    // Create the paper stock set with items
    const group = await prisma.paperStockSet.create({
      data: {
        id: randomUUID(),
        name: validatedData.name,
        description: validatedData.description,
        sortOrder: validatedData.sortOrder,
        isActive: validatedData.isActive,
        updatedAt: new Date(),
        PaperStockSetItem: {
          create: paperStocksWithDefault.map((stock, index) => ({
            id: randomUUID(),
            paperStockId: stock.id,
            isDefault: stock.isDefault,
            sortOrder: stock.sortOrder || index,
            updatedAt: new Date(),
          })),
        },
      },
      include: {
        PaperStockSetItem: {
          include: {
            PaperStock: {
              include: {
                PaperStockCoating: {
                  include: {
                    CoatingOption: true,
                  },
                },
                PaperStockSides: {
                  include: {
                    SidesOption: true,
                  },
                },
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        ProductPaperStockSet: true,
      },
    })

    // Transform the data to match frontend expectations
    const transformedGroup = {
      ...group,
      paperStockItems: (group.PaperStockSetItem || []).map((item) => ({
        id: item.id,
        paperStockId: item.paperStockId,
        isDefault: item.isDefault,
        sortOrder: item.sortOrder,
        paperStock: item.PaperStock,
      })),
      productPaperStockGroups: group.ProductPaperStockSet || [],
    }

    return NextResponse.json(transformedGroup)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to create paper stock set' }, { status: 500 })
  }
}
