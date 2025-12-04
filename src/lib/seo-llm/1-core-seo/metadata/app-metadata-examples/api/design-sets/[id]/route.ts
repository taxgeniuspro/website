import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { z } from 'zod'
import { cache } from 'ioredis'

// Schema for updating a design set
const updateDesignSetSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
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

// GET - Get a single design set
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Cache key includes the design set ID
    const cacheKey = `design:set:${id}`
    const cached = await cache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const set = await prisma.designSet.findUnique({
      where: { id },
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

    if (!set) {
      return NextResponse.json({ error: 'Design set not found' }, { status: 404 })
    }

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

    // Cache for 1 hour (3600 seconds)
    await cache.set(cacheKey, transformedSet, 3600)

    return NextResponse.json(transformedSet)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch design set' }, { status: 500 })
  }
}

// PUT - Update a design set
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { user, session } = await validateRequest()
    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const validatedData = updateDesignSetSchema.parse(body)

    // Check if set exists
    const existingSet = await prisma.designSet.findUnique({
      where: { id },
    })

    if (!existingSet) {
      return NextResponse.json({ error: 'Design set not found' }, { status: 404 })
    }

    // Check if new name already exists (if changing name)
    if (validatedData.name && validatedData.name !== existingSet.name) {
      const nameExists = await prisma.designSet.findUnique({
        where: { name: validatedData.name },
      })

      if (nameExists) {
        return NextResponse.json(
          { error: 'A design set with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Update the set in a transaction
    const updatedSet = await prisma.$transaction(async (tx) => {
      // Update basic set info
      const set = await tx.designSet.update({
        where: { id },
        data: {
          name: validatedData.name,
          description: validatedData.description,
          sortOrder: validatedData.sortOrder,
          isActive: validatedData.isActive,
        },
      })

      // If design options are provided, update them
      if (validatedData.designOptions !== undefined) {
        // Delete existing design option items
        await tx.designSetItem.deleteMany({
          where: { designSetId: id },
        })

        // Create new design option items
        if (validatedData.designOptions.length > 0) {
          // Ensure exactly one item is marked as default
          let optionsWithDefault = [...validatedData.designOptions]
          const defaultOptions = optionsWithDefault.filter((o) => o.isDefault)

          if (defaultOptions.length === 0) {
            // No default set, make the first one default
            optionsWithDefault[0].isDefault = true
          } else if (defaultOptions.length > 1) {
            // Multiple defaults set, keep only the first one as default
            optionsWithDefault = optionsWithDefault.map((option) => ({
              ...option,
              isDefault: option === defaultOptions[0],
            }))
          }

          await tx.designSetItem.createMany({
            data: optionsWithDefault.map((option, index) => ({
              id: crypto.randomUUID(),
              designSetId: id,
              designOptionId: option.id,
              isDefault: option.isDefault,
              sortOrder: option.sortOrder || index,
            })),
          })
        }
      }

      // Return the updated set with all relations
      return await tx.designSet.findUnique({
        where: { id },
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
    })

    // Transform the data to match frontend expectations
    if (updatedSet) {
      const transformedSet = {
        ...updatedSet,
        designOptionItems: (updatedSet.DesignSetItem || []).map((item) => ({
          id: item.id,
          designOptionId: item.designOptionId,
          isDefault: item.isDefault,
          sortOrder: item.sortOrder,
          designOption: item.DesignOption,
        })),
        productDesignSets: updatedSet.ProductDesignSet || [],
      }
      return NextResponse.json(transformedSet)
    }

    return NextResponse.json(updatedSet)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to update design set' }, { status: 500 })
  }
}

// DELETE - Delete a design set
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
    // Check if set exists
    const set = await prisma.designSet.findUnique({
      where: { id },
      include: {
        ProductDesignSet: true,
      },
    })

    if (!set) {
      return NextResponse.json({ error: 'Design set not found' }, { status: 404 })
    }

    // Check if set is being used by any products
    if (set.ProductDesignSet.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete design set that is assigned to products' },
        { status: 400 }
      )
    }

    // Delete the set (cascade will handle designSetItems)
    await prisma.designSet.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Design set deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete design set' }, { status: 500 })
  }
}
