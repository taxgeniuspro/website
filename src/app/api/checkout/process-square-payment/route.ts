import { type NextRequest, NextResponse } from 'next/server'
import { SquareClient, SquareEnvironment } from 'square'
import { randomUUID } from 'crypto'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

// Validate environment variables on startup
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID

if (!SQUARE_ACCESS_TOKEN) {
  logger.error('[Square] CRITICAL: SQUARE_ACCESS_TOKEN is not set!')
}
if (!SQUARE_LOCATION_ID) {
  logger.error('[Square] CRITICAL: SQUARE_LOCATION_ID is not set!')
}

// Determine environment with fallback to sandbox
// SquareEnvironment provides full base URLs: Production or Sandbox
const squareEnvironment =
  SQUARE_ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox

// Initialize Square client
// NOTE: Square SDK v43+ uses 'token' parameter (not 'accessToken')
const client = new SquareClient({
  token: SQUARE_ACCESS_TOKEN!,
  environment: squareEnvironment,
})

/**
 * Process Square payment (Card or Cash App Pay)
 * Creates payment and saves order to database
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id
    const body = await request.json()

    const {
      sourceId,
      amount,
      currency = 'USD',
      orderId,
      orderNumber,
      items,
      email,
      shippingAddress,
      shippingMethod,
      paymentMethod = 'SQUARE',
    } = body

    // Validate required fields
    if (!sourceId || !amount) {
      return NextResponse.json({ error: 'Missing required payment details' }, { status: 400 })
    }

    if (!items || !email) {
      return NextResponse.json({ error: 'Missing order information' }, { status: 400 })
    }

    logger.info('[Square Payment] Processing payment', {
      amount,
      currency,
      orderNumber,
      paymentMethod,
      hasUserId: !!userId,
    })

    // Validate location ID is available
    if (!SQUARE_LOCATION_ID) {
      logger.error('[Square Payment] SQUARE_LOCATION_ID not set')
      return NextResponse.json(
        { error: 'Payment configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    // Create payment using Square Payments API
    const result = await client.payments.create({
      sourceId: sourceId,
      amountMoney: {
        amount: BigInt(amount),
        currency: currency,
      },
      idempotencyKey: randomUUID(),
      locationId: SQUARE_LOCATION_ID,
      referenceId: orderNumber,
    })

    logger.info('[Square Payment] Payment successful', {
      paymentId: result.payment?.id,
      status: result.payment?.status,
      orderNumber,
    })

    // Save order to database
    const order = await prisma.order.create({
      data: {
        userId: userId || 'guest', // Use guest for unauthenticated users
        paymentSessionId: result.payment?.id || randomUUID(),
        paymentMethod: paymentMethod,
        squareOrderId: result.payment?.orderId,
        items: items, // JSON array of items
        total: Number(amount) / 100, // Convert cents to dollars
        status: result.payment?.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
        email: email,
        shippingAddress: shippingAddress || null,
        shippingMethod: shippingMethod || null,
      },
    })

    logger.info('[Square Payment] Order saved to database', {
      orderId: order.id,
      paymentId: result.payment?.id,
    })

    return NextResponse.json({
      success: true,
      paymentId: result.payment?.id,
      orderId: order.id,
      orderNumber: orderNumber,
      status: result.payment?.status,
      receiptUrl: result.payment?.receiptUrl,
      message: 'Payment processed successfully',
    })
  } catch (error: any) {
    logger.error('[Square Payment] Error processing payment', {
      error: error.message,
      stack: error.stack,
    })

    // Handle specific Square API errors
    if (error?.errors && Array.isArray(error.errors)) {
      const squareError = error.errors[0]
      const errorCode = squareError?.code
      const errorDetail = squareError?.detail

      if (errorCode === 'CARD_DECLINED') {
        return NextResponse.json(
          { error: 'Your card was declined. Please try a different payment method.' },
          { status: 400 }
        )
      } else if (errorCode === 'INSUFFICIENT_FUNDS') {
        return NextResponse.json(
          { error: 'Insufficient funds. Please try a different card.' },
          { status: 400 }
        )
      } else if (errorCode === 'INVALID_CARD' || errorCode === 'INVALID_CARD_DATA') {
        return NextResponse.json(
          { error: 'Invalid card details. Please check your information and try again.' },
          { status: 400 }
        )
      } else if (errorCode === 'CVV_FAILURE') {
        return NextResponse.json(
          { error: 'Card verification failed. Please check your CVV and try again.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: errorDetail || 'Payment processing failed. Please try again.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Payment processing failed. Please try again.' },
      { status: 500 }
    )
  }
}
