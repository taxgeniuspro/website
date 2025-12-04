import { type NextRequest, NextResponse } from 'next/server'
import { FedExProviderEnhanced } from '@/lib/shipping/providers/fedex-provider'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/db'

// Initialize FedEx provider
const fedexProvider = new FedExProviderEnhanced({
  clientId: process.env.FEDEX_API_KEY!,
  clientSecret: process.env.FEDEX_SECRET_KEY!,
  accountNumber: process.env.FEDEX_ACCOUNT_NUMBER!,
  testMode: process.env.FEDEX_TEST_MODE === 'true',
  useIntelligentPacking: process.env.FEDEX_USE_INTELLIGENT_PACKING === 'true',
})

/**
 * Create shipping label and update order with tracking
 * POST /api/shipping/create-label
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { orderId, origin, destination, packages, serviceType } = body

    // Validate required fields
    if (!orderId || !destination || !packages || !serviceType) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, destination, packages, serviceType' },
        { status: 400 }
      )
    }

    logger.info('[Shipping Label] Creating label', {
      orderId,
      serviceType,
      destination: destination.zipCode,
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

    // Create shipping label
    const label = await fedexProvider.createShipment(
      fromAddress,
      destination,
      packages,
      serviceType
    )

    logger.info('[Shipping Label] Label created successfully', {
      orderId,
      trackingNumber: label.trackingNumber,
    })

    // Update order with tracking information
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        trackingNumber: label.trackingNumber,
        shippingMethod: serviceType,
      },
    })

    logger.info('[Shipping Label] Order updated with tracking', {
      orderId,
      trackingNumber: label.trackingNumber,
    })

    return NextResponse.json({
      success: true,
      label: label,
      trackingNumber: label.trackingNumber,
      orderId: updatedOrder.id,
    })
  } catch (error: any) {
    logger.error('[Shipping Label] Error creating label', {
      error: error.message,
      stack: error.stack,
    })

    return NextResponse.json(
      {
        error: 'Failed to create shipping label. Please try again.',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
