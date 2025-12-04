import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateRequestId } from '@/lib/api-response'
import { getShippingRegistry } from '@/lib/shipping/module-registry'
import { cache } from 'ioredis'

// Request validation schema
const RateRequestSchema = z.object({
  destination: z.object({
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
    state: z.string().length(2),
    city: z.string(),
    street: z.string().optional(),
    countryCode: z.string().default('US'),
    isResidential: z.boolean().optional().default(true),
  }),
  package: z
    .object({
      weight: z.number().min(0.1).max(500), // increased to support freight
      dimensions: z
        .object({
          length: z.number(),
          width: z.number(),
          height: z.number(),
        })
        .optional(),
    })
    .optional(),
  packages: z
    .array(
      z.object({
        weight: z.number().min(0.1),
        dimensions: z
          .object({
            length: z.number(),
            width: z.number(),
            height: z.number(),
          })
          .optional(),
      })
    )
    .optional(),
  providers: z.array(z.enum(['fedex', 'southwest-cargo'])).optional(), // Made optional - will use all enabled if not specified
})

// Default origin (Gang Run Printing warehouse)
const DEFAULT_ORIGIN = {
  street: '1300 Basswood Road',
  city: 'Schaumburg',
  state: 'IL',
  zipCode: '60173',
  country: 'US',
  isResidential: false,
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const body = await request.json()

    // Log the incoming request for debugging

    const validation = RateRequestSchema.safeParse(body)

    if (!validation.success) {
      console.error('[Shipping API] Validation failed:', validation.error.issues)
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.issues,
          requestId,
        },
        { status: 400 }
      )
    }

    const { destination, package: pkg, packages, providers: requestedProviders } = validation.data

    // Build packages array (support single package or multiple)
    const packagesToShip = packages || (pkg ? [pkg] : [{ weight: 1 }]) // Default to 1 lb if neither provided

    // Create cache key based on key parameters
    const totalWeight = packagesToShip.reduce((sum, p) => sum + p.weight, 0)
    const cacheKey = `shipping:rates:${destination.zipCode}:${destination.state}:${totalWeight}:${requestedProviders?.join(',') || 'all'}`

    // Check cache first (5-minute TTL for shipping rates)
    const cached = await cache.get(cacheKey)
    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
        requestId,
      })
    }

    // Get shipping registry
    const registry = getShippingRegistry()

    // Determine which modules to use
    let modulesToUse = registry.getEnabledModules()

    // Filter by requested providers if specified
    if (requestedProviders && requestedProviders.length > 0) {
      modulesToUse = modulesToUse.filter((module) => requestedProviders.includes(module.id))
    }

    // Build destination address
    const destinationAddress = {
      street: destination.street || '123 Main St',
      city: destination.city,
      state: destination.state,
      zipCode: destination.zipCode,
      country: destination.countryCode,
      isResidential: destination.isResidential,
    }

    // Collect rates from all enabled modules
    const allRates = []
    const errors: Record<string, string> = {}

    for (const module of modulesToUse) {
      try {
        const moduleRates = await module.provider.getRates(
          DEFAULT_ORIGIN,
          destinationAddress,
          packagesToShip.map((p) => ({
            weight: p.weight,
            dimensions: p.dimensions,
          }))
        )

        // Transform to API response format
        moduleRates.forEach((rate) => {
          allRates.push({
            provider: module.id,
            providerName: rate.serviceName,
            serviceType: rate.serviceCode,
            serviceCode: rate.serviceCode,
            carrier: module.carrier,
            rate: {
              amount: rate.rateAmount,
              currency: rate.currency,
            },
            delivery: {
              estimatedDays: {
                min: rate.estimatedDays,
                max: rate.estimatedDays,
              },
              text: `${rate.estimatedDays} business day${rate.estimatedDays > 1 ? 's' : ''}`,
              guaranteed: rate.isGuaranteed,
              date: rate.deliveryDate?.toISOString(),
            },
          })
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[Shipping API] ${module.name} error:`, errorMessage)
        errors[module.id] = errorMessage
        // Continue with other providers
      }
    }

    // Sort rates by price (ascending) and limit to top 3 cheapest options
    const sortedRates = allRates.sort((a, b) => a.rate.amount - b.rate.amount)
    const top3Rates = sortedRates.slice(0, 3)

    const responseData = {
      success: true,
      rates: top3Rates,
      metadata: {
        origin: DEFAULT_ORIGIN,
        packagesCount: packagesToShip.length,
        totalWeight: packagesToShip.reduce((sum, p) => sum + p.weight, 0),
        modulesUsed: modulesToUse.map((m) => m.id),
        moduleStatus: registry.getStatus(),
        errors: Object.keys(errors).length > 0 ? errors : undefined,
        totalRatesFound: allRates.length,
        displayingTopRates: top3Rates.length,
      },
    }

    // Cache for 5 minutes (300 seconds) - shipping rates change more frequently
    await cache.set(cacheKey, responseData, 300)

    return NextResponse.json({
      ...responseData,
      requestId,
    })
  } catch (error) {
    console.error('Shipping rate error:', error)
    return NextResponse.json(
      {
        error: 'Failed to calculate shipping rates',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    )
  }
}
