import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface CalculateBaseWeightRequest {
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
}

interface WeightCalculationResult {
  weight: number
  breakdown: {
    paperWeight: number
    size: number
    quantity: number
    formula: string
    calculation: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: CalculateBaseWeightRequest = await request.json()

    // Validate required fields
    if (!data.paperStockId) {
      return NextResponse.json({ error: 'Paper stock ID is required' }, { status: 400 })
    }

    // Load paper stock data
    const paperStock = await prisma.paperStock.findUnique({
      where: { id: data.paperStockId },
    })

    if (!paperStock) {
      return NextResponse.json({ error: 'Paper stock not found' }, { status: 404 })
    }

    let standardSize = null
    let standardQuantity = null

    // Load size data if standard size selected
    if (data.sizeSelection === 'standard') {
      if (!data.standardSizeId) {
        return NextResponse.json(
          { error: 'Standard size ID is required when using standard size' },
          { status: 400 }
        )
      }

      standardSize = await prisma.standardSize.findUnique({
        where: { id: data.standardSizeId },
      })

      if (!standardSize) {
        return NextResponse.json({ error: 'Standard size not found' }, { status: 404 })
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
    }

    // Resolve quantity using same logic as pricing
    let resolvedQuantity: number
    if (data.quantitySelection === 'custom') {
      if (!data.customQuantity) {
        return NextResponse.json({ error: 'Custom quantity is required' }, { status: 400 })
      }

      // Enforce 5000 increment rule for custom quantities above 5000
      if (data.customQuantity > 5000 && data.customQuantity % 5000 !== 0) {
        return NextResponse.json(
          {
            error: 'Custom quantities above 5000 must be in increments of 5000',
          },
          { status: 400 }
        )
      }

      resolvedQuantity = data.customQuantity
    } else {
      if (!standardQuantity) {
        return NextResponse.json({ error: 'Standard quantity data missing' }, { status: 400 })
      }

      // For quantities >= 5000, use exact displayed value
      if (standardQuantity.displayValue >= 5000) {
        resolvedQuantity = standardQuantity.displayValue
      }
      // For quantities < 5000, check for adjustments
      else if (
        standardQuantity.adjustmentValue !== null &&
        standardQuantity.adjustmentValue !== undefined
      ) {
        resolvedQuantity = standardQuantity.adjustmentValue
      } else {
        resolvedQuantity = standardQuantity.calculationValue
      }
    }

    // Resolve size using same logic as pricing
    let resolvedSize: number
    if (data.sizeSelection === 'custom') {
      if (!data.customWidth || !data.customHeight) {
        return NextResponse.json({ error: 'Custom width and height are required' }, { status: 400 })
      }
      resolvedSize = data.customWidth * data.customHeight
    } else {
      if (!standardSize) {
        return NextResponse.json({ error: 'Standard size data missing' }, { status: 400 })
      }
      // Use pre-calculated value (NOT width × height)
      resolvedSize = standardSize.preCalculatedValue
    }

    // Calculate weight using exact formula: quantity × size × paper_weight
    const weight = resolvedQuantity * resolvedSize * paperStock.weight

    const calculation = `${resolvedQuantity} × ${resolvedSize} × ${paperStock.weight} = ${weight}`

    const result: WeightCalculationResult = {
      weight,
      breakdown: {
        paperWeight: paperStock.weight,
        size: resolvedSize,
        quantity: resolvedQuantity,
        formula: 'Quantity × Size × Paper Weight',
        calculation,
      },
    }

    return NextResponse.json({
      success: true,
      weight: result.weight,
      breakdown: result.breakdown,
      PaperStock: {
        id: paperStock.id,
        name: paperStock.name,
        weight: paperStock.weight,
      },
      standardSize: standardSize
        ? {
            id: standardSize.id,
            name: standardSize.name,
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
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate weight' }, { status: 500 })
  }
}
