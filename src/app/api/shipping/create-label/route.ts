import { type NextRequest, NextResponse } from 'next/server'
import { FedExProviderEnhanced } from '@/lib/shipping/providers/fedex-provider'
import { logger } from '@/lib/logger'
import { db } from '@/lib/db'

// TypeScript interface for Order (replaces @prisma/client import)
interface Order {
  id: string;
  user_id: string;
  stripe_session_id: string;
  items: any;
  total: number;
  status: string;
  email: string;
  tracking_number: string | null;
  shipping_method: string | null;
  created_at: string;
  updated_at: string;
}

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

    // Update order with tracking information using Supabase
    const { data: updatedOrder, error: updateError } = await db
      .from('orders')
      .update({
        tracking_number: label.trackingNumber,
        shipping_method: serviceType,
      })
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) {
      logger.error('[Shipping Label] Error updating order', {
        orderId,
        error: updateError,
      })
      return NextResponse.json(
        { error: 'Failed to update order with tracking information' },
        { status: 500 }
      )
    }

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
