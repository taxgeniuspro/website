/**
 * Invoice Payment API
 *
 * POST /api/invoices/[invoiceId]/pay
 *
 * Creates Square payment link for invoice payment
 */

import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSquareCheckout } from '@/lib/square'

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params

    // Validate invoice ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (!uuidRegex.test(invoiceId)) {
      return NextResponse.json({ error: 'Invalid invoice ID format' }, { status: 400 })
    }

    // Get order with invoice details
    const order = await prisma.order.findUnique({
      where: { invoiceId },
      include: {
        OrderItem: true,
        User: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Check if already paid
    if (order.paidAt) {
      return NextResponse.json(
        {
          error: 'Invoice has already been paid',
          paidAt: order.paidAt,
        },
        { status: 400 }
      )
    }

    // Check if invoice is overdue
    const isOverdue = order.paymentDueDate && order.paymentDueDate < new Date()

    // Prepare line items for Square
    const squareLineItems = order.OrderItem.map((item) => ({
      name: item.productName,
      quantity: String(item.quantity),
      basePriceMoney: {
        amount: BigInt(item.price),
        currency: 'USD',
      },
    }))

    // Add shipping as line item
    if (order.shipping > 0) {
      squareLineItems.push({
        name: 'Shipping',
        quantity: '1',
        basePriceMoney: {
          amount: BigInt(order.shipping),
          currency: 'USD',
        },
      })
    }

    // Add tax as line item
    if (order.tax > 0) {
      squareLineItems.push({
        name: 'Tax',
        quantity: '1',
        basePriceMoney: {
          amount: BigInt(order.tax),
          currency: 'USD',
        },
      })
    }

    // Create Square payment link
    const checkoutResult = await createSquareCheckout({
      amount: order.total,
      orderNumber: order.orderNumber,
      email: order.email,
      items: squareLineItems,
    })

    if (!checkoutResult.url) {
      throw new Error('Failed to create payment link')
    }

    // Update order with Square payment link details
    await prisma.order.update({
      where: { id: order.id },
      data: {
        squareOrderId: checkoutResult.orderId || order.squareOrderId,
      },
    })

    return NextResponse.json({
      success: true,
      invoice: {
        invoiceNumber: order.invoiceNumber,
        invoiceId: order.invoiceId,
        orderNumber: order.orderNumber,
        total: order.total,
        paymentDueDate: order.paymentDueDate,
        isOverdue,
      },
      payment: {
        checkoutUrl: checkoutResult.url,
        squareOrderId: checkoutResult.orderId,
      },
      message: isOverdue
        ? 'This invoice is overdue. Please pay as soon as possible.'
        : 'Payment link created successfully',
    })
  } catch (error) {
    console.error('Error creating invoice payment:', error)

    return NextResponse.json(
      {
        error: 'Failed to create payment link',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
