// API Route: Vendor Status Update Webhook
// Receives order status updates from vendors via N8N

import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OrderStateMachine, type OrderStatus } from '@/domains/orders/state-machine'
import { VendorWebhookHandler, type VendorWebhookPayload } from '@/domains/vendors/webhook-handler'
// import { sendOrderStatusEmail } from '@/lib/order-notifications';

export async function POST(request: NextRequest) {
  try {
    // Parse webhook payload
    const payload: VendorWebhookPayload = await request.json()

    // Initialize webhook handler
    const webhookHandler = new VendorWebhookHandler()

    // Process vendor status to internal status
    const result = await webhookHandler.processWebhook(payload)

    if (!result.success) {
      return NextResponse.json(webhookHandler.formatN8NResponse(false, null, result.error), {
        status: 400,
      })
    }

    // Get current order from database
    const order = await prisma.order.findUnique({
      where: { id: payload.orderId },
      include: {
        customer: true,
        vendor: true,
      },
    })

    if (!order) {
      return NextResponse.json(webhookHandler.formatN8NResponse(false, null, 'Order not found'), {
        status: 404,
      })
    }

    // Initialize state machine with current status
    const stateMachine = new OrderStateMachine(order.status as OrderStatus)

    // Attempt state transition
    const transition = stateMachine.transition(result.event!)

    if (!transition.success) {
      return NextResponse.json(webhookHandler.formatN8NResponse(false, null, transition.error), {
        status: 400,
      })
    }

    // Update order in database
    const updatedOrder = await prisma.order.update({
      where: { id: payload.orderId },
      data: {
        status: transition.newStatus!,
        ...(payload.details?.trackingNumber && {
          trackingNumber: payload.details.trackingNumber,
        }),
        statusHistory: {
          create: {
            status: transition.newStatus!,
            message: payload.details?.message || `Status updated to ${transition.newStatus}`,
            vendorId: payload.vendorId,
            createdAt: new Date(payload.timestamp),
          },
        },
      },
    })

    // Send customer notification if needed
    // TODO: Implement sendOrderStatusEmail function
    // if (transition.notifyCustomer && order.customer.email) {
    //   await sendOrderStatusEmail({
    //     to: order.customer.email,
    //     orderNumber: order.orderNumber,
    //     status: transition.newStatus!,
    //     message: stateMachine.isOnHold()
    //       ? stateMachine.getHoldReason() || 'Your order is on hold'
    //       : `Your order status has been updated to ${transition.newStatus}`,
    //     trackingNumber: payload.details?.trackingNumber
    //   });
    // }

    // Return success response for N8N
    return NextResponse.json(
      webhookHandler.formatN8NResponse(true, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        previousStatus: order.status,
        newStatus: transition.newStatus,
        customerNotified: transition.notifyCustomer,
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error processing webhook',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Optional: Webhook signature verification
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Signature',
    },
  })
}
