import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { user, session } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      weight,
      pricePerSqInch,
      tooltipText,
      isActive,
      coatings,
      sidesOptions,
      vendorPricePerSqInch,
      markupType,
      markupValue,
    } = body

    // Calculate final pricePerSqInch and profitMargin if vendor price is provided
    let finalPricePerSqInch = pricePerSqInch || 0
    let profitMargin = null

    if (vendorPricePerSqInch && markupValue !== null && markupValue !== undefined) {
      if (markupType === 'PERCENTAGE') {
        // Markup is a percentage (e.g., 100 for 100%)
        finalPricePerSqInch = vendorPricePerSqInch * (1 + markupValue / 100)
      } else {
        // Markup is a flat dollar amount (e.g., 1.00)
        finalPricePerSqInch = vendorPricePerSqInch + markupValue
      }
      profitMargin = finalPricePerSqInch - vendorPricePerSqInch
    }

    // Update paper stock and relationships in a transaction
    const paperStock = await prisma.$transaction(async (tx) => {
      // Delete existing relationships
      await tx.paperStockCoating.deleteMany({
        where: { paperStockId: id },
      })
      await tx.paperStockSides.deleteMany({
        where: { paperStockId: id },
      })

      // Update paper stock with new relationships
      return await tx.paperStock.update({
        where: { id },
        data: {
          name,
          weight: weight || 0,
          pricePerSqInch: finalPricePerSqInch,
          tooltipText: tooltipText || null,
          isActive: isActive !== undefined ? isActive : true,
          updatedAt: new Date(),
          // Vendor pricing & markup fields
          vendorPricePerSqInch: vendorPricePerSqInch || null,
          markupType: markupType || 'PERCENTAGE',
          markupValue: markupValue !== undefined ? markupValue : 0,
          profitMargin,
          // Add new coating relationships
          PaperStockCoating: {
            create:
              coatings?.map((c: Record<string, unknown>) => ({
                coatingId: c.id,
                isDefault: c.isDefault || false,
              })) || [],
          },
          // Add new sides relationships
          PaperStockSides: {
            create:
              sidesOptions?.map((s: Record<string, unknown>) => ({
                sidesOptionId: s.id,
                priceMultiplier: s.multiplier || 1.0,
                isEnabled: true,
                isDefault: s.isDefault || false,
              })) || [],
          },
        },
        include: {
          PaperStockCoating: {
            include: { CoatingOption: true },
          },
          PaperStockSides: {
            include: { SidesOption: true },
          },
        },
      })
    })

    return NextResponse.json(paperStock)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Paper stock not found' }, { status: 404 })
    }

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A paper stock with this name already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to update paper stock' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user, session } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    // Check if paper stock is being used by products
    const productsCount = await prisma.productPaperStock.count({
      where: { paperStockId: id },
    })

    if (productsCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete paper stock. ${productsCount} products are using it.` },
        { status: 400 }
      )
    }

    // Delete paper stock (relationships will cascade delete)
    await prisma.paperStock.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Paper stock not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to delete paper stock' }, { status: 500 })
  }
}
