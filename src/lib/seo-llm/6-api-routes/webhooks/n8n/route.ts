import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// N8N webhook endpoint for order automation
export async function POST(request: NextRequest) {
  try {
    // Verify N8N API key if configured
    const apiKey = request.headers.get('x-n8n-api-key')
    if (process.env.N8N_API_KEY && apiKey !== process.env.N8N_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { action, orderId, orderNumber, ...payload } = data

    switch (action) {
      case 'order.created':
        return await handleOrderCreated(orderId || orderNumber, payload)

      case 'order.status.update':
        return await handleOrderStatusUpdate(orderId || orderNumber, payload)

      case 'order.vendor.assign':
        return await handleVendorAssignment(orderId || orderNumber, payload)

      case 'order.fulfillment.update':
        return await handleFulfillmentUpdate(orderId || orderNumber, payload)

      case 'order.tracking.update':
        return await handleTrackingUpdate(orderId || orderNumber, payload)

      case 'notification.send':
        return await handleNotificationSend(orderId || orderNumber, payload)

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// Get N8N webhook status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhooks/n8n',
    supportedActions: [
      'order.created',
      'order.status.update',
      'order.vendor.assign',
      'order.fulfillment.update',
      'order.tracking.update',
      'notification.send',
    ],
  })
}

async function handleOrderCreated(identifier: string, payload: Record<string, unknown>) {
  try {
    // Find order
    const order = await findOrder(identifier)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Trigger any automated workflows
    // For example, assign to vendor based on product type
    if (payload.autoAssignVendor) {
      const vendor = await prisma.vendor.findFirst({
        where: { isActive: true },
        orderBy: { orders: { _count: 'asc' } }, // Assign to vendor with least orders
      })

      if (vendor) {
        await prisma.order.update({
          where: { id: order.id },
          data: { vendorId: vendor.id },
        })
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}

async function handleOrderStatusUpdate(identifier: string, payload: Record<string, unknown>) {
  try {
    const { newStatus, notes, changedBy } = payload

    const order = await findOrder(identifier)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update order status
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: newStatus,
          adminNotes: notes
            ? `${order.adminNotes || ''}\n[${new Date().toISOString()}] ${notes}`
            : order.adminNotes,
        },
      })

      // Add status history
      await tx.statusHistory.create({
        data: {
          id: `${order.orderNumber}-status-${Date.now()}`,
          orderId: order.id,
          fromStatus: order.status,
          toStatus: newStatus,
          notes,
          changedBy: changedBy || 'N8N Automation',
        },
      })

      // Create notification based on status
      const notificationTypes: Record<string, string> = {
        PAID: 'PAYMENT_RECEIVED',
        PROCESSING: 'ORDER_PROCESSING',
        SHIPPED: 'ORDER_SHIPPED',
        DELIVERED: 'ORDER_DELIVERED',
        REFUNDED: 'ORDER_REFUNDED',
      }

      if (notificationTypes[newStatus]) {
        await tx.notification.create({
          data: {
            id: `${order.orderNumber}-notif-${Date.now()}`,
            orderId: order.id,
            type: notificationTypes[newStatus] as any,
            sent: false,
          },
        })
      }

      return updated
    })

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}

async function handleVendorAssignment(identifier: string, payload: Record<string, unknown>) {
  try {
    const { vendorId, vendorName, notes } = payload

    const order = await findOrder(identifier)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Find vendor
    let vendor = null
    if (vendorId) {
      vendor = await prisma.vendor.findUnique({ where: { id: vendorId } })
    } else if (vendorName) {
      vendor = await prisma.vendor.findUnique({ where: { name: vendorName } })
    }

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Update order with vendor
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        vendorId: vendor.id,
        adminNotes: notes
          ? `${order.adminNotes || ''}\n[${new Date().toISOString()}] Assigned to ${vendor.name}: ${notes}`
          : order.adminNotes,
      },
    })

    // Send webhook to vendor's N8N if configured
    if (vendor.n8nWebhookUrl) {
      try {
        await fetch(vendor.n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'order.assigned',
            order: {
              orderNumber: order.orderNumber,
              referenceNumber: order.referenceNumber,
              items: await prisma.orderItem.findMany({ where: { orderId: order.id } }),
              total: order.total,
              shippingAddress: order.shippingAddress,
            },
          }),
        })
      } catch (error) {}
    }

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        vendorId: updatedOrder.vendorId,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to assign vendor' }, { status: 500 })
  }
}

async function handleFulfillmentUpdate(identifier: string, payload: Record<string, unknown>) {
  try {
    const { status, notes } = payload

    const order = await findOrder(identifier)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Map fulfillment status to order status
    const statusMap: Record<string, string> = {
      preparing: 'PRODUCTION',
      printing: 'PRINTING',
      quality_check: 'QUALITY_CHECK',
      packaging: 'PACKAGING',
      ready: 'READY_FOR_PICKUP',
      shipped: 'SHIPPED',
    }

    const newStatus = statusMap[status] || order.status

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: newStatus as any,
        adminNotes: notes
          ? `${order.adminNotes || ''}\n[${new Date().toISOString()}] Fulfillment: ${notes}`
          : order.adminNotes,
      },
    })

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update fulfillment' }, { status: 500 })
  }
}

async function handleTrackingUpdate(identifier: string, payload: Record<string, unknown>) {
  try {
    const { trackingNumber, carrier, trackingUrl } = payload

    const order = await findOrder(identifier)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update order with tracking info
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          trackingNumber,
          carrier: carrier?.toUpperCase() as any,
          status: 'SHIPPED',
        },
      })

      // Add status history
      await tx.statusHistory.create({
        data: {
          id: `${order.orderNumber}-tracking-${Date.now()}`,
          orderId: order.id,
          fromStatus: order.status,
          toStatus: 'SHIPPED',
          notes: `Tracking: ${trackingNumber} (${carrier})`,
          changedBy: 'N8N Automation',
        },
      })

      // Create shipping notification
      await tx.notification.create({
        data: {
          id: `${order.orderNumber}-ship-notif-${Date.now()}`,
          orderId: order.id,
          type: 'ORDER_SHIPPED',
          sent: false,
        },
      })

      return updated
    })

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        trackingNumber: updatedOrder.trackingNumber,
        carrier: updatedOrder.carrier,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update tracking' }, { status: 500 })
  }
}

async function handleNotificationSend(identifier: string, payload: Record<string, unknown>) {
  try {
    const { type, force = false } = payload

    const order = await findOrder(identifier)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Create or update notification
    const existingNotification = await prisma.notification.findFirst({
      where: {
        orderId: order.id,
        type: type,
      },
    })

    let notification
    if (existingNotification && !force) {
      notification = existingNotification
    } else {
      notification = await prisma.notification.create({
        data: {
          id: `${order.orderNumber}-${type}-${Date.now()}`,
          orderId: order.id,
          type: type,
          sent: false,
        },
      })
    }

    // Trigger notification processing
    // This would normally call the notification processor
    // For now, just mark it for processing

    return NextResponse.json({
      success: true,
      notification: {
        id: notification.id,
        type: notification.type,
        sent: notification.sent,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}

// Helper function to find order by ID or order number
async function findOrder(identifier: string) {
  // Try to find by ID first
  let order = await prisma.order.findUnique({
    where: { id: identifier },
  })

  // If not found, try by order number
  if (!order) {
    order = await prisma.order.findUnique({
      where: { orderNumber: identifier },
    })
  }

  return order
}
