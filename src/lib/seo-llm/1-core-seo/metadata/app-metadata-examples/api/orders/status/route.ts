import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'
import { canTransitionTo, generateReferenceNumber } from '@/lib/order-management'
import { N8NWorkflows } from '@/lib/n8n'
import { requireAuth, requireAdminAuth, handleAuthError } from '@/lib/auth/api-helpers'

// Update order status
export async function PUT(request: NextRequest) {
  try {
    // Only admins can update order status
    const { user } = await requireAdminAuth()

    const body = await request.json()
    const { orderId, newStatus, notes } = body

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: 'Order ID and new status are required' }, { status: 400 })
    }

    // Validate the status value
    if (!Object.values(OrderStatus).includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    // Get current order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        referenceNumber: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if transition is valid
    if (!canTransitionTo(order.status, newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${order.status} to ${newStatus}` },
        { status: 400 }
      )
    }

    // Generate reference number if transitioning to CONFIRMATION and doesn't have one
    let referenceNumber = order.referenceNumber
    if (newStatus === OrderStatus.CONFIRMATION && !referenceNumber) {
      // Get the next order number
      const orderCount = await prisma.order.count()
      referenceNumber = generateReferenceNumber(orderCount + 1)
    }

    // Update order status in a transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Create status history entry
      await tx.statusHistory.create({
        data: {
          orderId: orderId,
          fromStatus: order.status,
          toStatus: newStatus,
          notes: notes,
          changedBy: user.email || user.id,
        },
      })

      // Update the order
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          ...(referenceNumber && { referenceNumber }),
        },
        include: {
          StatusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      })

      // If order is delivered, schedule review request for 3 days later
      if (newStatus === OrderStatus.DELIVERED) {
        await tx.notification.create({
          data: {
            orderId: orderId,
            type: 'ORDER_DELIVERED',
            sent: false,
          },
        })
      }

      return updated
    })

    // Trigger N8N workflow for status change
    try {
      await N8NWorkflows.onOrderStatusChanged(orderId, order.status)

      // Additional workflow triggers based on specific status
      if (newStatus === OrderStatus.SHIPPED) {
        const trackingInfo = updatedOrder.trackingNumber
          ? {
              trackingNumber: updatedOrder.trackingNumber,
              carrier: updatedOrder.carrier || 'FEDEX',
            }
          : null

        if (trackingInfo) {
          await N8NWorkflows.onOrderShipped(orderId, trackingInfo)
        }
      }
    } catch (n8nError) {}

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    })
  } catch (error) {
    // Handle auth errors
    if (
      (error as any)?.name === 'AuthenticationError' ||
      (error as any)?.name === 'AuthorizationError'
    ) {
      return handleAuthError(error)
    }
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 })
  }
}

// Get order status history
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth()

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Check if user owns the order or is admin
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        userId: true,
        status: true,
        referenceNumber: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (user.role !== 'ADMIN' && order.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get status history
    const statusHistory = await prisma.statusHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      currentStatus: order.status,
      referenceNumber: order.referenceNumber,
      history: statusHistory,
    })
  } catch (error) {
    // Handle auth errors
    if (
      (error as any)?.name === 'AuthenticationError' ||
      (error as any)?.name === 'AuthorizationError'
    ) {
      return handleAuthError(error)
    }
    return NextResponse.json({ error: 'Failed to fetch order status history' }, { status: 500 })
  }
}
