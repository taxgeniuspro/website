import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  unifiedPricingEngine,
  type UnifiedPricingRequest,
} from '@/lib/pricing/unified-pricing-engine'
import { pricingCalculationRequestSchema } from '@/lib/validation'
import { z } from 'zod'

/**
 * POST /api/pricing/calculate
 *
 * Calculates product price based on customer configuration
 * Connects frontend to existing UnifiedPricingEngine
 */
export async function POST(request: NextRequest) {
  const startTime = performance.now()

  try {
    // Parse and validate request body
    const body = await request.json()
    const validatedRequest = pricingCalculationRequestSchema.parse(body)

    // Fetch catalog data from database
    const catalog = await fetchCatalogData(validatedRequest)

    // Build pricing engine request
    const pricingRequest: UnifiedPricingRequest = {
      productId: validatedRequest.productId,
      categoryId: validatedRequest.categoryId,

      // Size configuration
      sizeSelection: validatedRequest.sizeSelection || 'standard',
      standardSizeId: validatedRequest.standardSizeId ?? undefined,
      customWidth: validatedRequest.customWidth ?? undefined,
      customHeight: validatedRequest.customHeight ?? undefined,

      // Quantity configuration
      quantitySelection: validatedRequest.quantitySelection,
      standardQuantityId: validatedRequest.standardQuantityId ?? undefined,
      customQuantity: validatedRequest.customQuantity ?? undefined,

      // Paper configuration
      paperStockId: validatedRequest.paperStockId || '',
      sides: validatedRequest.sides || 'single',

      // Turnaround
      turnaroundId: validatedRequest.turnaroundId || '',

      // Add-ons
      selectedAddons: validatedRequest.selectedAddons || [],

      // Customer type
      isBroker: validatedRequest.isBroker || false,
      brokerCategoryDiscounts: validatedRequest.brokerCategoryDiscounts || [],
    }

    // Calculate price using UnifiedPricingEngine
    const result = unifiedPricingEngine.calculatePrice(pricingRequest, catalog)

    // Check if calculation was valid
    if (!result.validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pricing calculation validation failed',
          validation: result.validation,
        },
        { status: 400 }
      )
    }

    // Calculate response time
    const endTime = performance.now()
    const responseTime = endTime - startTime

    // Return successful response
    return NextResponse.json({
      success: true,
      price: result.totals.beforeTax,
      unitPrice: result.totals.unitPrice,
      breakdown: {
        basePrice: result.totals.basePrice,
        afterAdjustments: result.totals.afterAdjustments,
        afterTurnaround: result.totals.afterTurnaround,
        addonCosts: result.totalAddonsCost,
        turnaroundMarkup: result.turnaround.markupAmount,
        adjustments: {
          brokerDiscount: result.adjustments.brokerDiscount.applied
            ? {
                percentage: result.adjustments.brokerDiscount.percentage,
                amount: result.adjustments.brokerDiscount.amount,
              }
            : undefined,
          taglineDiscount: result.adjustments.taglineDiscount.applied
            ? {
                percentage: result.adjustments.taglineDiscount.percentage,
                amount: result.adjustments.taglineDiscount.amount,
              }
            : undefined,
          exactSizeMarkup: result.adjustments.exactSizeMarkup.applied
            ? {
                percentage: result.adjustments.exactSizeMarkup.percentage,
                amount: result.adjustments.exactSizeMarkup.amount,
              }
            : undefined,
        },
      },
      calculation: {
        formula: result.baseCalculation.formula,
        size: result.baseCalculation.size,
        quantity: result.baseCalculation.quantity,
        paperPrice: result.baseCalculation.paperPrice,
        sidesMultiplier: result.baseCalculation.sidesMultiplier,
      },
      turnaround: {
        name: result.turnaround.name,
        days: result.turnaround.days,
        markupPercent: result.turnaround.markupPercent,
      },
      addons: result.addons,
      validation: result.validation,
      displayBreakdown: result.displayBreakdown,
      meta: {
        responseTimeMs: Math.round(responseTime),
      },
    })
  } catch (error) {
    // Handle validation errors from Zod
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          validation: {
            isValid: false,
            errors: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
            warnings: [],
          },
        },
        { status: 400 }
      )
    }

    // Handle other errors
    console.error('Pricing calculation error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        validation: {
          isValid: false,
          errors: ['Failed to calculate price'],
          warnings: [],
        },
      },
      { status: 500 }
    )
  }
}

/**
 * Fetch catalog data from database for pricing engine
 */
async function fetchCatalogData(request: z.infer<typeof pricingCalculationRequestSchema>) {
  // Fetch sizes
  const sizes = request.standardSizeId
    ? await prisma.sizeGroup.findMany({
        where: { isActive: true },
      })
    : []

  // Fetch quantities
  const quantities = request.standardQuantityId
    ? await prisma.quantityGroup.findMany({
        where: { isActive: true },
      })
    : []

  // Fetch paper stocks
  const paperStocks = request.paperStockId
    ? await prisma.paperStock.findMany({
        where: { isActive: true },
        include: {
          paperStockCoatings: {
            include: {
              CoatingOption: true,
            },
          },
          paperStockSides: {
            include: {
              SidesOption: true,
            },
          },
        },
      })
    : []

  // Fetch turnaround times
  const turnarounds = request.turnaroundId
    ? await prisma.turnaroundTime.findMany({
        where: { isActive: true },
      })
    : []

  // Fetch add-ons
  const addons =
    request.selectedAddons && request.selectedAddons.length > 0
      ? await prisma.addOn.findMany({
          where: {
            id: { in: request.selectedAddons.map((a) => a.addonId) },
            isActive: true,
          },
          include: {
            addOnSubOptions: true,
          },
        })
      : []

  // Transform database data to pricing engine format
  return {
    sizes: sizes.map((s) => ({
      id: s.id,
      name: s.name,
      displayName: s.name,
      width: 0, // Parse from values if needed
      height: 0,
      preCalculatedValue: 1, // Default, should be calculated from values
      isCustom: false,
      sortOrder: s.sortOrder,
      isActive: s.isActive,
    })),
    quantities: quantities.map((q) => ({
      id: q.id,
      displayValue: 0, // Parse from values
      calculationValue: 0,
      adjustmentValue: undefined,
      isCustom: false,
      sortOrder: q.sortOrder,
      isActive: q.isActive,
    })),
    paperStocks: paperStocks.map((ps) => ({
      id: ps.id,
      name: ps.name,
      pricePerSqInch: ps.pricePerSqInch,
      isExceptionPaper: false, // Determine from paper type - check PaperException table if needed
      doubleSidedMultiplier: 1.0,
      paperType: 'cardstock' as const,
      thickness: undefined,
      coating: undefined,
    })),
    turnarounds: turnarounds.map((t) => ({
      id: t.id,
      name: t.name,
      businessDays: t.daysMin,
      priceMarkupPercent: (t.priceMultiplier - 1.0) * 100, // Convert multiplier to percentage
      isStandard: t.basePrice === 0, // Standard if no base price
      sortOrder: t.sortOrder,
    })),
    addons: addons.map((a) => {
      // Parse configuration from JSON
      const config =
        typeof a.configuration === 'object' ? (a.configuration as Record<string, any>) : {}

      return {
        id: a.id,
        name: a.name,
        category: 'general', // Default category
        pricingModel: a.pricingModel as any,
        configuration: {
          flatPrice: config.flatPrice || config.basePrice || undefined,
          percentage: config.percentage || undefined,
          appliesTo: 'base_price' as const,
          setupFee: config.setupFee || undefined,
          pricePerUnit: config.pricePerUnit || undefined,
          unitType: 'piece' as const,
        },
        isActive: a.isActive,
        sortOrder: a.sortOrder || 0,
        requiresConfiguration: false,
        conflictsWith: [],
        requiredFor: [],
      }
    }),
  }
}
