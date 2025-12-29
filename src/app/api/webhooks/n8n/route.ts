import { type NextRequest, NextResponse } from 'next/server'
import { db, firstOrNull } from '@/lib/db'

// TypeScript interfaces for database entities
interface Order {
  id: string;
  orderNumber: string;
  referenceNumber?: string;
  status: string;
  total: number;
  adminNotes?: string;
  trackingNumber?: string;
  carrier?: string;
  vendorId?: string;
  shippingAddress?: unknown;
  [key: string]: unknown;
}

interface Vendor {
  id: string;
  name: string;
  isActive: boolean;
  n8nWebhookUrl?: string;
  [key: string]: unknown;
}

interface OrderItem {
  id: string;
  orderId: string;
  [key: string]: unknown;
}

interface Notification {
  id: string;
  orderId: string;
  type: string;
  sent: boolean;
  [key: string]: unknown;
}

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
      // Get vendor with least orders (simplified - gets first active vendor)
      const { data: vendors } = await db
        .from('vendors')
        .select('*')
        .eq('is_active', true)
        .limit(1)

      const vendor = firstOrNull(vendors) as Vendor | null

      if (vendor) {
        await db
          .from('orders')
          .update({ vendor_id: vendor.id })
          .eq('id', order.id)
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

    // Update order status (Supabase doesn't have transactions like Prisma,
    // but individual operations are atomic)

    // Update order
    const { data: updatedData, error: updateError } = await db
      .from('orders')
      .update({
        status: newStatus,
        admin_notes: notes
          ? `${order.adminNotes || ''}\n[${new Date().toISOString()}] ${notes}`
          : order.adminNotes,
      })
      .eq('id', order.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    const updatedOrder = updatedData as Order

    // Add status history
    await db
      .from('status_history')
      .insert({
        id: `${order.orderNumber}-status-${Date.now()}`,
        order_id: order.id,
        from_status: order.status,
        to_status: newStatus,
        notes,
        changed_by: changedBy || 'N8N Automation',
      })

    // Create notification based on status
    const notificationTypes: Record<string, string> = {
      PAID: 'PAYMENT_RECEIVED',
      PROCESSING: 'ORDER_PROCESSING',
      SHIPPED: 'ORDER_SHIPPED',
      DELIVERED: 'ORDER_DELIVERED',
      REFUNDED: 'ORDER_REFUNDED',
    }

    if (notificationTypes[newStatus as string]) {
      await db
        .from('notifications')
        .insert({
          id: `${order.orderNumber}-notif-${Date.now()}`,
          order_id: order.id,
          type: notificationTypes[newStatus as string],
          sent: false,
        })
    }

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
    let vendor: Vendor | null = null
    if (vendorId) {
      const { data: vendorData } = await db
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single()
      vendor = vendorData as Vendor | null
    } else if (vendorName) {
      const { data: vendorData } = await db
        .from('vendors')
        .select('*')
        .eq('name', vendorName)
        .single()
      vendor = vendorData as Vendor | null
    }

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Update order with vendor
    const { data: updatedData, error: updateError } = await db
      .from('orders')
      .update({
        vendor_id: vendor.id,
        admin_notes: notes
          ? `${order.adminNotes || ''}\n[${new Date().toISOString()}] Assigned to ${vendor.name}: ${notes}`
          : order.adminNotes,
      })
      .eq('id', order.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    const updatedOrder = updatedData as Order

    // Send webhook to vendor's N8N if configured
    if (vendor.n8nWebhookUrl) {
      try {
        const { data: orderItems } = await db
          .from('order_items')
          .select('*')
          .eq('order_id', order.id)

        await fetch(vendor.n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'order.assigned',
            order: {
              orderNumber: order.orderNumber,
              referenceNumber: order.referenceNumber,
              items: orderItems || [],
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

    const newStatus = statusMap[status as string] || order.status

    const { data: updatedData, error: updateError } = await db
      .from('orders')
      .update({
        status: newStatus,
        admin_notes: notes
          ? `${order.adminNotes || ''}\n[${new Date().toISOString()}] Fulfillment: ${notes}`
          : order.adminNotes,
      })
      .eq('id', order.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    const updatedOrder = updatedData as Order

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
    const { trackingNumber, carrier } = payload

    const order = await findOrder(identifier)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update order with tracking info
    const { data: updatedData, error: updateError } = await db
      .from('orders')
      .update({
        tracking_number: trackingNumber,
        carrier: (carrier as string)?.toUpperCase(),
        status: 'SHIPPED',
      })
      .eq('id', order.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    const updatedOrder = updatedData as Order

    // Add status history
    await db
      .from('status_history')
      .insert({
        id: `${order.orderNumber}-tracking-${Date.now()}`,
        order_id: order.id,
        from_status: order.status,
        to_status: 'SHIPPED',
        notes: `Tracking: ${trackingNumber} (${carrier})`,
        changed_by: 'N8N Automation',
      })

    // Create shipping notification
    await db
      .from('notifications')
      .insert({
        id: `${order.orderNumber}-ship-notif-${Date.now()}`,
        order_id: order.id,
        type: 'ORDER_SHIPPED',
        sent: false,
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
    const { data: existingNotifications } = await db
      .from('notifications')
      .select('*')
      .eq('order_id', order.id)
      .eq('type', type)
      .limit(1)

    const existingNotification = firstOrNull(existingNotifications) as Notification | null

    let notification: Notification
    if (existingNotification && !force) {
      notification = existingNotification
    } else {
      const { data: newNotification, error: createError } = await db
        .from('notifications')
        .insert({
          id: `${order.orderNumber}-${type}-${Date.now()}`,
          order_id: order.id,
          type: type,
          sent: false,
        })
        .select()
        .single()

      if (createError || !newNotification) {
        return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
      }

      notification = newNotification as Notification
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
async function findOrder(identifier: string): Promise<Order | null> {
  // Try to find by ID first
  const { data: orderById } = await db
    .from('orders')
    .select('*')
    .eq('id', identifier)
    .single()

  if (orderById) {
    return orderById as Order
  }

  // If not found, try by order number
  const { data: orderByNumber } = await db
    .from('orders')
    .select('*')
    .eq('order_number', identifier)
    .single()

  return orderByNumber as Order | null
}
