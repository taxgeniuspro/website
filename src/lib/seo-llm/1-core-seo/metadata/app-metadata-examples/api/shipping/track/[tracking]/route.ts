import { type NextRequest, NextResponse } from 'next/server'
import { Carrier } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { shippingCalculator } from '@/lib/shipping'

export async function GET(request: NextRequest, { params }: { params: { tracking: string } }) {
  try {
    const trackingNumber = params.tracking
    const carrierParam = request.nextUrl.searchParams.get('carrier')

    if (!trackingNumber) {
      return NextResponse.json({ error: 'Tracking number is required' }, { status: 400 })
    }

    // Try to find the order by tracking number to get the carrier
    let carrier: Carrier | undefined

    if (carrierParam && carrierParam in Carrier) {
      carrier = carrierParam as Carrier
    } else {
      // Look up the order by tracking number
      const order = await prisma.order.findFirst({
        where: { trackingNumber },
        select: { carrier: true },
      })

      if (order?.carrier) {
        carrier = order.carrier
      }
    }

    if (!carrier) {
      // Try to determine carrier by tracking number format
      carrier = detectCarrierByFormat(trackingNumber)
    }

    if (!carrier) {
      return NextResponse.json(
        { error: 'Unable to determine carrier for tracking number' },
        { status: 400 }
      )
    }

    // Get tracking info
    const trackingInfo = await shippingCalculator.trackShipment(carrier, trackingNumber)

    return NextResponse.json({
      success: true,
      tracking: trackingInfo,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to track shipment' }, { status: 500 })
  }
}

/**
 * Detect carrier by tracking number format
 */
function detectCarrierByFormat(trackingNumber: string): Carrier | undefined {
  // Remove spaces and convert to uppercase
  const cleaned = trackingNumber.replace(/\s/g, '').toUpperCase()

  // FedEx patterns
  if (
    /^\d{12}$/.test(cleaned) || // 12 digits
    /^\d{15}$/.test(cleaned) || // 15 digits
    /^[0-9]{20}$/.test(cleaned) || // 20 digits
    /^[0-9]{22}$/.test(cleaned) // 22 digits
  ) {
    return Carrier.FEDEX
  }

  // UPS patterns
  if (
    /^1Z[A-Z0-9]{16}$/.test(cleaned) || // 1Z followed by 16 alphanumeric
    /^T\d{10}$/.test(cleaned) || // T followed by 10 digits
    /^\d{9}$/.test(cleaned) || // 9 digits
    /^\d{26}$/.test(cleaned) // 26 digits
  ) {
    return Carrier.UPS
  }

  // Southwest Cargo pattern (custom format)
  if (/^SWC[A-Z0-9]+$/.test(cleaned)) {
    return Carrier.SOUTHWEST_CARGO
  }

  return undefined
}
