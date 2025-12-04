import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { z } from 'zod'

// Schema for updating a paper stock set
const updatePaperStockSetSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
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

// GET - Get a single paper stock set
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const group = await prisma.paperStockSet.findUnique({
      where: { id },
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

    if (!group) {
      return NextResponse.json({ error: 'Paper stock set not found' }, { status: 404 })
    }

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
    return NextResponse.json({ error: 'Failed to fetch paper stock set' }, { status: 500 })
  }
}

// PUT - Update a paper stock set
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { user, session } = await validateRequest()
    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const validatedData = updatePaperStockSetSchema.parse(body)

    // Check if group exists
    const existingGroup = await prisma.paperStockSet.findUnique({
      where: { id },
    })

    if (!existingGroup) {
      return NextResponse.json({ error: 'Paper stock set not found' }, { status: 404 })
    }

    // Check if new name already exists (if changing name)
    if (validatedData.name && validatedData.name !== existingGroup.name) {
      const nameExists = await prisma.paperStockSet.findUnique({
        where: { name: validatedData.name },
      })

      if (nameExists) {
        return NextResponse.json(
          { error: 'A paper stock set with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Update the group in a transaction
    const updatedGroup = await prisma.$transaction(async (tx) => {
      // Update basic group info
      const group = await tx.paperStockSet.update({
        where: { id },
        data: {
          name: validatedData.name,
          description: validatedData.description,
          sortOrder: validatedData.sortOrder,
          isActive: validatedData.isActive,
        },
      })

      // If paper stocks are provided, update them
      if (validatedData.paperStocks !== undefined) {
        // Delete existing paper stock items
        await tx.paperStockSetItem.deleteMany({
          where: { paperStockSetId: id },
        })

        // Create new paper stock items
        if (validatedData.paperStocks.length > 0) {
          // Ensure exactly one item is marked as default
          let paperStocksWithDefault = [...validatedData.paperStocks]
          const defaultStocks = paperStocksWithDefault.filter((s) => s.isDefault)

          if (defaultStocks.length === 0) {
            // No default set, make the first one default
            paperStocksWithDefault[0].isDefault = true
          } else if (defaultStocks.length > 1) {
            // Multiple defaults set, keep only the first one as default
            paperStocksWithDefault = paperStocksWithDefault.map((stock, index) => ({
              ...stock,
              isDefault: stock === defaultStocks[0],
            }))
          }

          await tx.paperStockSetItem.createMany({
            data: paperStocksWithDefault.map((stock, index) => ({
              paperStockSetId: id,
              paperStockId: stock.id,
              isDefault: stock.isDefault,
              sortOrder: stock.sortOrder || index,
            })),
          })
        }
      }

      // Return the updated group with all relations
      return await tx.paperStockSet.findUnique({
        where: { id },
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
    })

    // Transform the data to match frontend expectations
    if (updatedGroup) {
      const transformedGroup = {
        ...updatedGroup,
        paperStockItems: (updatedGroup.PaperStockSetItem || []).map((item) => ({
          id: item.id,
          paperStockId: item.paperStockId,
          isDefault: item.isDefault,
          sortOrder: item.sortOrder,
          paperStock: item.PaperStock,
        })),
        productPaperStockGroups: updatedGroup.ProductPaperStockSet || [],
      }
      return NextResponse.json(transformedGroup)
    }

    return NextResponse.json(updatedGroup)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to update paper stock set' }, { status: 500 })
  }
}

// DELETE - Delete a paper stock set
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user, session } = await validateRequest()
    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Check if group exists
    const group = await prisma.paperStockSet.findUnique({
      where: { id },
      include: {
        ProductPaperStockSet: true,
      },
    })

    if (!group) {
      return NextResponse.json({ error: 'Paper stock set not found' }, { status: 404 })
    }

    // Check if group is being used by any products
    if (group.ProductPaperStockSet.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete paper stock set that is assigned to products' },
        { status: 400 }
      )
    }

    // Delete the group (cascade will handle paperStockSetItems)
    await prisma.paperStockSet.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Paper stock set deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete paper stock set' }, { status: 500 })
  }
}
