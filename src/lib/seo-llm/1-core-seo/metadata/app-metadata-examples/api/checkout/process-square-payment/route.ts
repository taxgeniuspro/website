import { type NextRequest, NextResponse } from 'next/server'
import { SquareClient, SquareEnvironment } from 'square'
import { randomUUID } from 'crypto'

// Validate environment variables on startup
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID

if (!SQUARE_ACCESS_TOKEN) {
  console.error('[Square] CRITICAL: SQUARE_ACCESS_TOKEN is not set!')
}
if (!SQUARE_LOCATION_ID) {
  console.error('[Square] CRITICAL: SQUARE_LOCATION_ID is not set!')
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

// This endpoint processes tokenized card payments through Square
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { sourceId, amount, currency = 'USD', orderId, orderNumber } = body

    if (!sourceId || !amount) {
      return NextResponse.json({ error: 'Missing required payment details' }, { status: 400 })
    }

    //   amount,
    //   currency,
    //   orderNumber,
    //   hasSourceId: !!sourceId,
    // })

    // Validate location ID is available
    if (!SQUARE_LOCATION_ID) {
      console.error('[Square Payment] SQUARE_LOCATION_ID not set')
      return NextResponse.json(
        { error: 'Payment configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    // Create payment using Square Payments API (v43+ uses client.payments.create)
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

    //   paymentId: result.payment?.id,
    //   status: result.payment?.status,
    //   orderNumber,
    // })

    return NextResponse.json({
      success: true,
      paymentId: result.payment?.id,
      orderId: orderId,
      orderNumber: orderNumber,
      status: result.payment?.status,
      receiptUrl: result.payment?.receiptUrl,
      message: 'Payment processed successfully',
    })
  } catch (error: any) {
    console.error('[Square Payment] Error:', error)

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
