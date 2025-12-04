import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const {
      basePrice = 0,
      setupFee = 0,
      paperStockSetId,
      quantityGroup,
      sizeGroup,
      addOns = [],
    } = data

    // Simple test calculation
    // In production, this would use the actual pricing engine
    let totalPrice = basePrice + setupFee

    // Add a simple multiplier for demonstration
    // This is just for testing - real calculation would be more complex
    if (paperStockSetId) {
      totalPrice *= 1.1 // 10% for paper stock set
    }

    if (quantityGroup) {
      totalPrice *= 1.05 // 5% for quantity group selection
    }

    if (sizeGroup) {
      totalPrice *= 1.05 // 5% for size group selection
    }

    // Add 15% for each add-on
    totalPrice *= 1 + addOns.length * 0.15

    return NextResponse.json({
      success: true,
      totalPrice: Math.round(totalPrice * 100) / 100, // Round to 2 decimal places
      breakdown: {
        basePrice,
        setupFee,
        hasPaperStockSet: !!paperStockSetId,
        hasQuantityGroup: !!quantityGroup,
        hasSizeGroup: !!sizeGroup,
        addOnsCount: addOns.length,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate test price' }, { status: 500 })
  }
}
