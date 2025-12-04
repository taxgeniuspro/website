import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { basePriceEngine, type PricingInput } from '@/lib/pricing/base-price-engine'

interface CalculateBasePriceRequest {
  // Size configuration
  sizeSelection: 'standard' | 'custom'
  standardSizeId?: string
  customWidth?: number
  customHeight?: number

  // Quantity configuration
  quantitySelection: 'standard' | 'custom'
  standardQuantityId?: string
  customQuantity?: number

  // Paper configuration
  paperStockId: string
  sidesOptionId: string

  // Product context (for validation)
  productId?: string
}

export async function POST(request: NextRequest) {
  try {
    const data: CalculateBasePriceRequest = await request.json()

    // Validate required fields
    if (!data.paperStockId) {
      return NextResponse.json({ error: 'Paper stock ID is required' }, { status: 400 })
    }

    if (!data.sidesOptionId) {
      return NextResponse.json({ error: 'Sides option ID is required' }, { status: 400 })
    }

    // Load paper stock data
    const paperStock = await prisma.paperStock.findUnique({
      where: { id: data.paperStockId },
    })

    // Load sides multiplier from PaperStockSides
    const paperStockSides = await prisma.paperStockSides.findUnique({
      where: {
        paperStockId_sidesOptionId: {
          paperStockId: data.paperStockId,
          sidesOptionId: data.sidesOptionId,
        },
      },
    })

    if (!paperStock) {
      return NextResponse.json({ error: 'Paper stock not found' }, { status: 404 })
    }

    if (!paperStockSides) {
      return NextResponse.json(
        {
          error: 'Sides configuration not available for this paper stock',
        },
        { status: 404 }
      )
    }

    let standardSize = null
    let standardQuantity = null
    let productConfig = null

    // Load size data if standard size selected
    if (data.sizeSelection === 'standard') {
      if (!data.standardSizeId) {
        return NextResponse.json(
          { error: 'Standard size ID is required when using standard size' },
          { status: 400 }
        )
      }

      // Note: This API still uses StandardSize for backwards compatibility
      // Size group relationships are handled at the product level
      standardSize = await prisma.standardSize.findUnique({
        where: { id: data.standardSizeId },
      })

      if (!standardSize) {
        return NextResponse.json({ error: 'Standard size not found' }, { status: 404 })
      }

      if (!standardSize.isActive) {
        return NextResponse.json({ error: 'Selected size is not active' }, { status: 400 })
      }
    }

    // Load quantity data if standard quantity selected
    if (data.quantitySelection === 'standard') {
      if (!data.standardQuantityId) {
        return NextResponse.json(
          { error: 'Standard quantity ID is required when using standard quantity' },
          { status: 400 }
        )
      }

      standardQuantity = await prisma.standardQuantity.findUnique({
        where: { id: data.standardQuantityId },
      })

      if (!standardQuantity) {
        return NextResponse.json({ error: 'Standard quantity not found' }, { status: 404 })
      }

      if (!standardQuantity.isActive) {
        return NextResponse.json({ error: 'Selected quantity is not active' }, { status: 400 })
      }
    }

    // Load product configuration if product specified
    if (data.productId) {
      productConfig = await prisma.productPricingConfig.findUnique({
        where: { productId: data.productId },
      })

      // Validate custom options are allowed for this product
      if (data.sizeSelection === 'custom' && productConfig && !productConfig.allowCustomSize) {
        return NextResponse.json(
          { error: 'Custom size is not allowed for this product' },
          { status: 400 }
        )
      }

      if (
        data.quantitySelection === 'custom' &&
        productConfig &&
        !productConfig.allowCustomQuantity
      ) {
        return NextResponse.json(
          { error: 'Custom quantity is not allowed for this product' },
          { status: 400 }
        )
      }

      // Validate custom dimensions within limits
      if (data.sizeSelection === 'custom' && productConfig) {
        if (
          data.customWidth &&
          productConfig.minCustomWidth &&
          data.customWidth < productConfig.minCustomWidth
        ) {
          return NextResponse.json(
            { error: `Minimum width is ${productConfig.minCustomWidth} inches` },
            { status: 400 }
          )
        }
        if (
          data.customWidth &&
          productConfig.maxCustomWidth &&
          data.customWidth > productConfig.maxCustomWidth
        ) {
          return NextResponse.json(
            { error: `Maximum width is ${productConfig.maxCustomWidth} inches` },
            { status: 400 }
          )
        }
        if (
          data.customHeight &&
          productConfig.minCustomHeight &&
          data.customHeight < productConfig.minCustomHeight
        ) {
          return NextResponse.json(
            { error: `Minimum height is ${productConfig.minCustomHeight} inches` },
            { status: 400 }
          )
        }
        if (
          data.customHeight &&
          productConfig.maxCustomHeight &&
          data.customHeight > productConfig.maxCustomHeight
        ) {
          return NextResponse.json(
            { error: `Maximum height is ${productConfig.maxCustomHeight} inches` },
            { status: 400 }
          )
        }
      }

      // Validate custom quantity within limits
      if (data.quantitySelection === 'custom') {
        // CRITICAL: Enforce 5000 increment rule for quantities above 5000
        if (data.customQuantity && data.customQuantity > 5000) {
          if (data.customQuantity % 5000 !== 0) {
            return NextResponse.json(
              {
                error: `Custom quantities above 5000 must be in increments of 5000`,
                details: {
                  received: data.customQuantity,
                  validExamples: [10000, 15000, 20000, 55000, 60000],
                  nearestValid: {
                    lower: Math.floor(data.customQuantity / 5000) * 5000,
                    upper: Math.ceil(data.customQuantity / 5000) * 5000,
                  },
                },
              },
              { status: 400 }
            )
          }
        }

        if (productConfig) {
          if (
            data.customQuantity &&
            productConfig.minCustomQuantity &&
            data.customQuantity < productConfig.minCustomQuantity
          ) {
            return NextResponse.json(
              { error: `Minimum quantity is ${productConfig.minCustomQuantity}` },
              { status: 400 }
            )
          }
          if (
            data.customQuantity &&
            productConfig.maxCustomQuantity &&
            data.customQuantity > productConfig.maxCustomQuantity
          ) {
            return NextResponse.json(
              { error: `Maximum quantity is ${productConfig.maxCustomQuantity}` },
              { status: 400 }
            )
          }
        }
      }
    }

    // Prepare input for pricing engine
    const pricingInput: PricingInput = {
      sizeSelection: data.sizeSelection,
      standardSize: standardSize || undefined,
      customWidth: data.customWidth,
      customHeight: data.customHeight,
      quantitySelection: data.quantitySelection,
      standardQuantity: standardQuantity || undefined,
      customQuantity: data.customQuantity,
      basePaperPrice: paperStock.pricePerSqInch,
      sidesMultiplier: paperStockSides.priceMultiplier,
    }

    // Calculate base price using exact formula
    const result = basePriceEngine.calculateBasePrice(pricingInput)

    // If validation failed, return error
    if (!result.validation.isValid) {
      return NextResponse.json(
        {
          error: 'Pricing calculation validation failed',
          details: result.validation.errors,
        },
        { status: 400 }
      )
    }

    // Return successful calculation
    return NextResponse.json({
      success: true,
      basePrice: result.basePrice,
      breakdown: result.breakdown,
      PaperStock: {
        id: paperStock.id,
        name: paperStock.name,
        pricePerSqInch: paperStock.pricePerSqInch,
      },
      sidesConfiguration: {
        sidesOptionId: data.sidesOptionId,
        priceMultiplier: paperStockSides.priceMultiplier,
      },
      standardSize: standardSize
        ? {
            id: standardSize.id,
            name: standardSize.name,
            displayName: standardSize.displayName,
            preCalculatedValue: standardSize.preCalculatedValue,
          }
        : null,
      standardQuantity: standardQuantity
        ? {
            id: standardQuantity.id,
            displayValue: standardQuantity.displayValue,
            calculationValue: standardQuantity.calculationValue,
            adjustmentValue: standardQuantity.adjustmentValue,
          }
        : null,
      customValues: {
        width: data.customWidth,
        height: data.customHeight,
        quantity: data.customQuantity,
      },
      productConfig: productConfig
        ? {
            allowCustomSize: productConfig.allowCustomSize,
            allowCustomQuantity: productConfig.allowCustomQuantity,
            limits: {
              minCustomWidth: productConfig.minCustomWidth,
              maxCustomWidth: productConfig.maxCustomWidth,
              minCustomHeight: productConfig.minCustomHeight,
              maxCustomHeight: productConfig.maxCustomHeight,
              minCustomQuantity: productConfig.minCustomQuantity,
              maxCustomQuantity: productConfig.maxCustomQuantity,
            },
          }
        : null,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate base price' }, { status: 500 })
  }
}

// GET endpoint to retrieve standard sizes and quantities for a product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    const query: Record<string, unknown> = {
      include: {
        _count: {
          select: {
            productSizes: true,
            ProductQuantityGroup: true,
          },
        },
      },
    }

    // Get available sizes
    const sizes = await prisma.standardSize.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    // Get available quantities
    const quantities = await prisma.standardQuantity.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    let productConfig = null
    let productSizes = []
    let productQuantities = []

    if (productId) {
      // Get product-specific configuration
      productConfig = await prisma.productPricingConfig.findUnique({
        where: { productId },
      })

      // Get product-specific sizes
      const productSizeLinks = await prisma.productSize.findMany({
        where: {
          productId,
          isActive: true,
        },
        include: {
          StandardSize: true,
        },
        orderBy: {
          StandardSize: {
            sortOrder: 'asc',
          },
        },
      })

      productSizes = productSizeLinks.map((link) => ({
        ...link.StandardSize,
        isDefault: link.isDefault,
      }))

      // Get product-specific quantity groups
      const productQuantityGroupLinks = await prisma.productQuantityGroup.findMany({
        where: {
          productId,
        },
        include: {
          QuantityGroup: true,
        },
        orderBy: {
          QuantityGroup: {
            sortOrder: 'asc',
          },
        },
      })

      // For each quantity group, parse the quantities and return them as individual options
      productQuantities = productQuantityGroupLinks.flatMap((link) => {
        const group = link.QuantityGroup
        const valuesList = group.values
          .split(',')
          .map((v: string) => v.trim())
          .filter((v: string) => v)

        return valuesList.map((value: string, index: number) => ({
          id: `${group.id}-${index}`, // Create unique ID for each quantity value
          displayValue: value === 'custom' ? 'Custom' : parseInt(value) || value,
          calculationValue: value === 'custom' ? null : parseInt(value) || null,
          adjustmentValue: null,
          sortOrder: index,
          isActive: true,
          isDefault: value === group.defaultValue,
          groupId: group.id,
          groupName: group.name,
          isCustom: value.toLowerCase() === 'custom',
        }))
      })
    }

    return NextResponse.json({
      success: true,
      sizes: productId ? productSizes : sizes,
      quantities: productId ? productQuantities : quantities,
      productConfig,
      allSizes: sizes,
      allQuantities: quantities,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch pricing configuration' }, { status: 500 })
  }
}
