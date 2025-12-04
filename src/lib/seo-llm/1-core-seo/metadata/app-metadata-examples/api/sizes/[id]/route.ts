import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET single size group
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const sizeGroup = await prisma.sizeGroup.findUnique({
      where: { id },
      include: {
        ProductSizeGroup: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
    })

    if (!sizeGroup) {
      return NextResponse.json({ error: 'Size group not found' }, { status: 404 })
    }

    // Parse values for frontend
    const parsedGroup = {
      ...sizeGroup,
      valuesList: sizeGroup.values.split(',').map((v) => v.trim()),
      hasCustomOption: sizeGroup.values.toLowerCase().includes('custom'),
    }

    return NextResponse.json(parsedGroup)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch size group' }, { status: 500 })
  }
}

// PUT update size group
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name,
      description,
      values,
      defaultValue,
      customMinWidth,
      customMaxWidth,
      customMinHeight,
      customMaxHeight,
      sortOrder,
      isActive,
    } = body

    // Validation
    if (values && defaultValue) {
      const valuesList = values.split(',').map((v: string) => v.trim())
      if (!valuesList.includes(defaultValue)) {
        return NextResponse.json(
          { error: 'Default value must be one of the provided values' },
          { status: 400 }
        )
      }

      const hasCustom = valuesList.some((v) => v.toLowerCase() === 'custom')
      if (hasCustom) {
        if (customMinWidth && customMaxWidth && customMinWidth >= customMaxWidth) {
          return NextResponse.json(
            { error: 'Custom minimum width must be less than maximum width' },
            { status: 400 }
          )
        }
        if (customMinHeight && customMaxHeight && customMinHeight >= customMaxHeight) {
          return NextResponse.json(
            { error: 'Custom minimum height must be less than maximum height' },
            { status: 400 }
          )
        }
      }
    }

    const sizeGroup = await prisma.sizeGroup.update({
      where: { id },
      data: {
        name,
        description,
        values,
        defaultValue,
        customMinWidth: values?.toLowerCase().includes('custom') ? customMinWidth || null : null,
        customMaxWidth: values?.toLowerCase().includes('custom') ? customMaxWidth || null : null,
        customMinHeight: values?.toLowerCase().includes('custom') ? customMinHeight || null : null,
        customMaxHeight: values?.toLowerCase().includes('custom') ? customMaxHeight || null : null,
        sortOrder,
        isActive,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(sizeGroup)
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A size group with this name already exists' },
        { status: 400 }
      )
    }

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Size group not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to update size group' }, { status: 500 })
  }
}

// DELETE size group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Check if the group is being used by any products
    const productsUsingGroup = await prisma.productSizeGroup.count({
      where: { sizeGroupId: id },
    })

    if (productsUsingGroup > 0) {
      return NextResponse.json(
        {
          error: `This size group is being used by ${productsUsingGroup} product(s). Please remove it from all products before deleting.`,
        },
        { status: 400 }
      )
    }

    // Delete the size group
    await prisma.sizeGroup.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Size group not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to delete size group' }, { status: 500 })
  }
}
