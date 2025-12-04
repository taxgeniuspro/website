/**
 * Square Payment Webhook Handler
 *
 * Receives payment events from Square and processes them.
 * Critical: This endpoint must verify webhook signatures for security.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { OrderService } from '@/lib/services/order-service'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || ''
const SQUARE_WEBHOOK_URL = process.env.SQUARE_WEBHOOK_URL || ''

interface SquareWebhookEvent {
  merchant_id: string
  type: string
  event_id: string
  created_at: string
  data: {
    type: string
    id: string
    object: {
      payment?: {
        id: string
        amount_money: {
          amount: number
          currency: string
        }
        status: string
        order_id?: string
        receipt_url?: string
        reference_id?: string // This should be our orderNumber
      }
    }
  }
}

/**
 * POST /api/webhooks/square/payment
 *
 * Handles Square payment webhooks
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    const signature = request.headers.get('x-square-hmacsha256-signature') || ''

    // Verify webhook signature
    if (!verifySquareSignature(rawBody, signature)) {
      console.error('[Square Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse webhook event
    const event: SquareWebhookEvent = JSON.parse(rawBody)

    // Handle different event types
    switch (event.type) {
      case 'payment.created':
        await handlePaymentCreated(event)
        break

      case 'payment.updated':
        await handlePaymentUpdated(event)
        break

      default:
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Square Webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

/**
 * Handle payment.created event
 */
async function handlePaymentCreated(event: SquareWebhookEvent): Promise<void> {
  const payment = event.data.object.payment

  if (!payment) {
    console.error('[Square Webhook] No payment object in event')
    return
  }

  const { id: paymentId, amount_money, status, reference_id } = payment

  // Only process completed payments
  if (status !== 'COMPLETED') {
    return
  }

  if (!reference_id) {
    console.error('[Square Webhook] No reference_id (orderNumber) in payment')
    return
  }

  // Find order by orderNumber
  const order = await prisma.order.findUnique({
    where: { orderNumber: reference_id },
  })

  if (!order) {
    console.error(`[Square Webhook] Order not found: ${reference_id}`)
    return
  }

  // Prevent duplicate processing
  if (order.status !== 'PENDING_PAYMENT') {
    return
  }

  // Verify amount matches
  const paidAmount = amount_money.amount / 100 // Convert cents to dollars
  if (Math.abs(paidAmount - order.total) > 0.01) {
    console.error(`[Square Webhook] Amount mismatch: Paid ${paidAmount}, Expected ${order.total}`)
    // Still process but log the discrepancy
  }

  // Process payment via OrderService
  try {
    await OrderService.processPayment(order.id, paymentId, paidAmount)
  } catch (error) {
    console.error(`[Square Webhook] Failed to process payment:`, error)
    throw error
  }
}

/**
 * Handle payment.updated event
 */
async function handlePaymentUpdated(event: SquareWebhookEvent): Promise<void> {
  const payment = event.data.object.payment

  if (!payment) {
    return
  }

  const { id: paymentId, status, reference_id } = payment

  if (!reference_id) {
    return
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber: reference_id },
  })

  if (!order) {
    return
  }

  // Handle payment failures
  if (status === 'FAILED' || status === 'CANCELED') {
    await handlePaymentFailed(order.id, status)
  }

  // Handle payment completion (if it wasn't completed on creation)
  if (status === 'COMPLETED' && order.status === 'PENDING_PAYMENT') {
    const paidAmount = payment.amount_money.amount / 100
    await OrderService.processPayment(order.id, paymentId, paidAmount)
  }
}

/**
 * Handle payment failure
 */
async function handlePaymentFailed(orderId: string, reason: string): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'PAYMENT_DECLINED',
      StatusHistory: {
        create: {
          fromStatus: 'PENDING_PAYMENT',
          toStatus: 'PAYMENT_DECLINED',
          notes: `Payment failed: ${reason}`,
          changedBy: 'Square',
        },
      },
    },
  })

  // TODO: Send payment failed email
}

/**
 * Verify Square webhook signature
 *
 * Square signs webhooks with HMAC-SHA256
 * Signature format: base64(hmac-sha256(notification_url + request_body, signature_key))
 */
function verifySquareSignature(body: string, signature: string): boolean {
  if (!SQUARE_WEBHOOK_SIGNATURE_KEY) {
    console.warn('[Square Webhook] No signature key configured - SKIPPING VERIFICATION')
    return true // In development, allow without signature
  }

  try {
    // Combine webhook URL + body
    const payload = SQUARE_WEBHOOK_URL + body

    // Calculate HMAC
    const hmac = crypto
      .createHmac('sha256', SQUARE_WEBHOOK_SIGNATURE_KEY)
      .update(payload)
      .digest('base64')

    // Compare signatures (timing-safe)
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hmac))
  } catch (error) {
    console.error('[Square Webhook] Signature verification error:', error)
    return false
  }
}

/**
 * GET /api/webhooks/square/payment
 *
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    service: 'Square Payment Webhook',
    status: 'active',
    configured: !!SQUARE_WEBHOOK_SIGNATURE_KEY,
  })
}
