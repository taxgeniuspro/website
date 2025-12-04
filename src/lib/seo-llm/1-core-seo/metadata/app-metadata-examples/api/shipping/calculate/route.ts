import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { type ShippingAddress, type ShippingPackage } from '@/lib/shipping'
import { getShippingRegistry } from '@/lib/shipping/module-registry'
import { prisma } from '@/lib/prisma'
import { calculateWeight } from '@/lib/shipping/weight-calculator'
import { splitIntoBoxes, getBoxSplitSummary } from '@/lib/shipping/box-splitter'

const calculateRequestSchema = z.object({
  toAddress: z.object({
    street: z.string(),
    street2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string().default('US'),
    isResidential: z.boolean().optional(),
  }),
  items: z.array(
    z.object({
      productId: z.string().optional(),
      quantity: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
      paperStockId: z.string().optional(),
      paperStockWeight: z.number().optional(),
    })
  ),
  fromAddress: z
    .object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string(),
      country: z.string().default('US'),
    })
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    const body = JSON.parse(rawBody)

    const validation = calculateRequestSchema.safeParse(body)

    if (!validation.success) {
      console.error('[Shipping API] Validation failed:', validation.error.flatten())
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { toAddress, items, fromAddress } = validation.data

    // PERFORMANCE: Batch fetch all product metadata in parallel (was sequential per-item)
    const productIds = items.map((item) => item.productId).filter((id): id is string => !!id)

    let hasFreeShipping = false

    interface ProductWithMetadata {
      id: string
      metadata: unknown
    }

    let productsData: ProductWithMetadata[] = []

    if (productIds.length > 0) {
      productsData = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, metadata: true },
      })

      // Check for free shipping
      hasFreeShipping = productsData.some((product) => {
        if (product?.metadata && typeof product.metadata === 'object') {
          const metadata = product.metadata as { freeShipping?: boolean }
          return metadata.freeShipping === true
        }
        return false
      })
    }

    // If free shipping, return immediately with $0 rate
    if (hasFreeShipping) {
      return NextResponse.json({
        success: true,
        rates: [
          {
            carrier: 'FEDEX',
            service: 'FREE_SHIPPING',
            cost: 0,
            deliveryDays: 5,
            description: 'Free Standard Shipping',
          },
        ],
        totalWeight: '0',
        boxSummary: 'Free Shipping - No weight calculated',
        numBoxes: 0,
      })
    }

    // Default from address (GangRun Printing warehouse)
    const shipFrom: ShippingAddress = fromAddress || {
      street: '1300 Basswood Road',
      city: 'Schaumburg',
      state: 'IL',
      zipCode: '60173',
      country: 'US',
      isResidential: false,
    }

    // PERFORMANCE: Batch fetch all paper stocks in parallel (was sequential per-item)
    const paperStockIds = items.map((item) => item.paperStockId).filter((id): id is string => !!id)

    const paperStocksData =
      paperStockIds.length > 0
        ? await prisma.paperStock.findMany({
            where: { id: { in: paperStockIds } },
            select: { id: true, weight: true },
          })
        : []

    // Create a lookup map for O(1) access
    const paperStockMap = new Map(paperStocksData.map((ps) => [ps.id, ps.weight]))

    // Calculate weight for each item
    const packages: ShippingPackage[] = []
    let totalWeight = 0

    for (const item of items) {
      let weight = 0

      // If paperStockWeight is provided directly, use it
      if (item.paperStockWeight) {
        weight = calculateWeight({
          paperStockWeight: item.paperStockWeight,
          width: item.width,
          height: item.height,
          quantity: item.quantity,
        })
      }
      // Look up from pre-fetched paper stock map (O(1) instead of DB query)
      else if (item.paperStockId && paperStockMap.has(item.paperStockId)) {
        weight = calculateWeight({
          paperStockWeight: paperStockMap.get(item.paperStockId)!,
          width: item.width,
          height: item.height,
          quantity: item.quantity,
        })
      }
      // Default weight if no paper stock info (using typical 60lb offset = 0.0009)
      else {
        weight = calculateWeight({
          paperStockWeight: 0.0009, // Default: 60lb offset paper (~0.0009 lbs/sq in)
          width: item.width,
          height: item.height,
          quantity: item.quantity,
        })
      }

      totalWeight += weight
    }

    // Split into boxes using standard box dimensions and 36lb max weight
    const boxes = splitIntoBoxes(totalWeight)
    const boxSummary = getBoxSplitSummary(boxes)

    // Use the split boxes for rating
    packages.push(...boxes)

    // PERFORMANCE: Determine supported carriers (using pre-fetched product data)
    const supportedCarriers = new Set<string>()

    // If we already fetched product data for free shipping check, reuse it
    if (productsData.length > 0) {
      for (const product of productsData) {
        // For now, allow all carriers (FedEx + Southwest Cargo)
        // TODO: Add vendor filtering when product categories have vendor relationships
        supportedCarriers.add('FEDEX')
        supportedCarriers.add('SOUTHWEST_CARGO')
      }
    }

    // If no products or no supported carriers set, default to all
    if (supportedCarriers.size === 0) {
      supportedCarriers.add('FEDEX')
      supportedCarriers.add('SOUTHWEST_CARGO')
    }

    // Get rates using module registry
    const registry = getShippingRegistry()
    let rates: unknown[] = []

    try {
      // Get enabled modules and filter by supported carriers
      const enabledModules = registry.getEnabledModules()
      const modulesToUse = enabledModules.filter((module) => {
        const carrierName = module.carrier.toUpperCase().replace(/\s+/g, '_')
        return supportedCarriers.has(carrierName) || supportedCarriers.has(module.carrier)
      })

      // Fetch rates from each module with error handling
      const ratePromises = modulesToUse.map((module) =>
        module.provider
          .getRates(shipFrom, toAddress, packages)
          .then((moduleRates) => {
            return moduleRates
          })
          .catch((err) => {
            console.error(`[Shipping API] ❌ ${module.name} error:`, err.message || err)
            return []
          })
      )

      // Create timeout promise (10 seconds)
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Shipping rate calculation timed out')), 10000)
      )

      const allRates = await Promise.race([Promise.all(ratePromises), timeout])
      rates = allRates.flat()

      // PERFORMANCE: Filter to specific FedEx services only (Ground, 2Day, Overnight)
      // Plus Southwest Cargo services
      const ALLOWED_SERVICE_CODES = [
        'FEDEX_GROUND',
        'GROUND_HOME_DELIVERY',
        'FEDEX_2_DAY',
        'STANDARD_OVERNIGHT',
        'SMART_POST', // Ground Economy
        'SOUTHWEST_CARGO_PICKUP', // Southwest Cargo airport pickup (Standard - 3 days)
        'SOUTHWEST_CARGO_DASH', // Southwest Dash express delivery (Premium - Next Flight Guaranteed)
      ]

      interface ApiRate {
        serviceCode?: string
        service?: string
        cost?: number
        rateAmount?: number
      }

      rates = rates.filter((rate: unknown) => {
        const r = rate as ApiRate
        const serviceCode = r.serviceCode || r.service
        return ALLOWED_SERVICE_CODES.includes(serviceCode)
      })

      // Sort rates by price (lowest to highest)
      rates.sort((a: unknown, b: unknown) => {
        const rateA = a as ApiRate
        const rateB = b as ApiRate
        const priceA = typeof rateA.cost === 'number' ? rateA.cost : rateA.rateAmount || 0
        const priceB = typeof rateB.cost === 'number' ? rateB.cost : rateB.rateAmount || 0
        return priceA - priceB
      })
    } catch (timeoutError) {
      console.error('[Shipping API] ❌ Timeout error:', timeoutError)
      // Empty rates array on timeout - UI will show "no shipping available"
      rates = []
    }

    return NextResponse.json({
      success: true,
      rates,
      totalWeight: totalWeight.toFixed(2),
      boxSummary,
      numBoxes: boxes.length,
    })
  } catch (error) {
    console.error('[Shipping API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to calculate shipping rates',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
