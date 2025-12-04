import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET single quantity group
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const quantityGroup = await prisma.quantityGroup.findUnique({
      where: { id },
      include: {
        products: {
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

    if (!quantityGroup) {
      return NextResponse.json({ error: 'Quantity group not found' }, { status: 404 })
    }

    // Parse values for frontend
    const parsedGroup = {
      ...quantityGroup,
      valuesList: quantityGroup.values.split(',').map((v) => v.trim()),
      hasCustomOption: quantityGroup.values.toLowerCase().includes('custom'),
    }

    return NextResponse.json(parsedGroup)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch quantity group' }, { status: 500 })
  }
}

// PUT update quantity group
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, values, defaultValue, customMin, customMax, sortOrder, isActive } =
      body

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
      if (hasCustom && customMin && customMax && customMin >= customMax) {
        return NextResponse.json(
          { error: 'Custom minimum must be less than maximum' },
          { status: 400 }
        )
      }
    }

    const quantityGroup = await prisma.quantityGroup.update({
      where: { id },
      data: {
        name,
        description,
        values,
        defaultValue,
        customMin: values?.toLowerCase().includes('custom') ? customMin || null : null,
        customMax: values?.toLowerCase().includes('custom') ? customMax || null : null,
        sortOrder,
        isActive,
      },
    })

    return NextResponse.json(quantityGroup)
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A quantity group with this name already exists' },
        { status: 400 }
      )
    }

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Quantity group not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to update quantity group' }, { status: 500 })
  }
}

// DELETE quantity group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Check if the group is being used by any products
    const productsUsingGroup = await prisma.productQuantityGroup.count({
      where: { quantityGroupId: id },
    })

    if (productsUsingGroup > 0) {
      return NextResponse.json(
        {
          error: `This quantity group is being used by ${productsUsingGroup} product(s). Please remove it from all products before deleting.`,
        },
        { status: 400 }
      )
    }

    // Delete the quantity group
    await prisma.quantityGroup.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Quantity group not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to delete quantity group' }, { status: 500 })
  }
}
