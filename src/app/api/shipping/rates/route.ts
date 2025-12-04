import { type NextRequest, NextResponse } from 'next/server'
import { FedExProviderEnhanced } from '@/lib/shipping/providers/fedex-provider'
import { logger } from '@/lib/logger'

// Initialize FedEx provider with environment variables
const fedexProvider = new FedExProviderEnhanced({
  clientId: process.env.FEDEX_API_KEY!,
  clientSecret: process.env.FEDEX_SECRET_KEY!,
  accountNumber: process.env.FEDEX_ACCOUNT_NUMBER!,
  testMode: process.env.FEDEX_TEST_MODE === 'true',
  markupPercentage: Number(process.env.FEDEX_MARKUP_PERCENTAGE) || 0,
  useIntelligentPacking: process.env.FEDEX_USE_INTELLIGENT_PACKING === 'true',
})

/**
 * Get shipping rates from FedEx
 * POST /api/shipping/rates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { origin, destination, packages } = body

    // Validate required fields
    if (!destination || !packages || !Array.isArray(packages) || packages.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: destination and packages' },
        { status: 400 }
      )
    }

    logger.info('[Shipping Rates] Fetching rates', {
      destination: destination.zipCode,
      packageCount: packages.length,
    })

    // Use configured origin if not provided
    const fromAddress = origin || {
      street: process.env.SHIPPING_ORIGIN_STREET!,
      city: process.env.SHIPPING_ORIGIN_CITY!,
      state: process.env.SHIPPING_ORIGIN_STATE!,
      zipCode: process.env.SHIPPING_ORIGIN_ZIP!,
      country: process.env.SHIPPING_ORIGIN_COUNTRY!,
      isResidential: process.env.SHIPPING_ORIGIN_IS_RESIDENTIAL === 'true',
    }

    // Get rates from FedEx
    const rates = await fedexProvider.getRates(fromAddress, destination, packages)

    logger.info('[Shipping Rates] Rates fetched successfully', {
      rateCount: rates.length,
      destination: destination.zipCode,
    })

    return NextResponse.json({
      success: true,
      rates: rates,
      origin: fromAddress,
      destination: destination,
    })
  } catch (error: any) {
    logger.error('[Shipping Rates] Error fetching rates', {
      error: error.message,
      stack: error.stack,
    })

    return NextResponse.json(
      {
        error: 'Failed to fetch shipping rates. Please try again.',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
