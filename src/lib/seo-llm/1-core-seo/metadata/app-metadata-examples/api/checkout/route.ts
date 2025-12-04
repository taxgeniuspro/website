import { MAX_FILE_SIZE, TAX_RATE, DEFAULT_WAREHOUSE_ZIP } from '@/lib/constants'
import { type NextRequest, NextResponse } from 'next/server'

import { validateRequest } from '@/lib/auth'
import { N8NWorkflows } from '@/lib/n8n'
import { prisma } from '@/lib/prisma'
import { sendOrderConfirmationWithFiles, sendAdminOrderNotification } from '@/lib/resend'
import { createOrUpdateSquareCustomer, createSquareCheckout, createSquareOrder } from '@/lib/square'
import { OrderService } from '@/services/OrderService'
import type { CreateOrderInput } from '@/types/service'
import { triggerOrderPlaced } from '@/lib/marketing/workflow-events'

export async function POST(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()
    const data = await request.json()

    const {
      items,
      email,
      name,
      phone,
      shippingAddress,
      billingAddress,
      shippingMethod,
      funnelId,
      funnelStepId,
    } = data

    // Get landing page source from cookie for attribution tracking
    const landingPageSource = request.cookies.get('landing_page_source')?.value || null

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 })
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Calculate totals
    let subtotal = 0
    const orderItems = items.map((item: Record<string, unknown>) => ({
      productName: item.productName || item.name,
      productSku: item.sku || 'CUSTOM',
      quantity: item.quantity,
      price: item.price,
      options: item.options || {},
    }))

    for (const item of orderItems) {
      subtotal += item.price * item.quantity
    }

    // Calculate tax (8.25% for Texas)
    const taxRate = TAX_RATE
    const tax = Math.round(subtotal * taxRate)

    // Calculate shipping
    const shipping = shippingMethod === 'express' ? 2500 : 1000 // $25 or $10

    // Calculate total
    const total = subtotal + tax + shipping

    // Generate temporary order reference for Square (OrderService will generate final order number)
    const tempOrderRef = `TMP-${Date.now().toString(36).toUpperCase()}`

    // Create or update Square customer
    let squareCustomerId: string | undefined
    try {
      const customerResult = await createOrUpdateSquareCustomer(email, name, phone)
      squareCustomerId = customerResult.id
    } catch (error) {
      // Continue without customer ID
    }

    // Create Square order
    let squareOrderId: string | undefined

    interface SquareLineItem {
      name: string
      quantity: string
      basePriceMoney: {
        amount: bigint
        currency: string
      }
    }

    let squareLineItems: SquareLineItem[] = []
    try {
      squareLineItems = orderItems.map((item: Record<string, unknown>) => ({
        name: item.productName as string,
        quantity: String(item.quantity),
        basePriceMoney: {
          amount: BigInt(Math.round(Number(item.price))),
          currency: 'USD',
        },
      }))

      // Add shipping as a line item
      squareLineItems.push({
        name: shippingMethod === 'express' ? 'Express Shipping' : 'Standard Shipping',
        quantity: '1',
        basePriceMoney: {
          amount: BigInt(shipping),
          currency: 'USD',
        },
      })

      const squareOrderResult = await createSquareOrder({
        referenceId: tempOrderRef,
        customerId: squareCustomerId,
        lineItems: squareLineItems,
        taxes: [
          {
            name: 'Sales Tax',
            percentage: (taxRate * 100).toString(),
          },
        ],
      })

      squareOrderId = squareOrderResult.id
    } catch (error) {
      // Continue without Square order ID
    }

    // Create order using OrderService
    const orderService = new OrderService({
      requestId: `checkout_${Date.now()}`,
      userId: user?.id,
      userRole: user?.role,
      timestamp: new Date(),
    })

    const orderInput: CreateOrderInput = {
      userId: user?.id || '',
      email,
      items: orderItems.map((item: Record<string, unknown>) => ({
        productSku: item.productSku as string,
        productName: item.productName as string,
        quantity: item.quantity as number,
        price: item.price as number,
        options: item.options as Record<string, any>,
      })),
      shippingAddress: {
        name,
        address1: shippingAddress.address1 || shippingAddress.street,
        address2: shippingAddress.address2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zip: shippingAddress.zip || shippingAddress.zipCode,
        country: shippingAddress.country || 'US',
        phone,
      },
      billingAddress: billingAddress
        ? {
            name,
            address1: billingAddress.address1 || billingAddress.street,
            address2: billingAddress.address2,
            city: billingAddress.city,
            state: billingAddress.state,
            zip: billingAddress.zip || billingAddress.zipCode,
            country: billingAddress.country || 'US',
            phone,
          }
        : undefined,
      shippingMethod,
      totals: {
        subtotal,
        tax,
        shipping,
        total,
      },
      funnelId: funnelId || undefined,
      funnelStepId: funnelStepId || undefined,
      metadata: {
        squareCustomerId,
        squareOrderId,
        landingPageSource,
      },
    }

    const orderResult = await orderService.createOrder(orderInput)

    if (!orderResult.success || !orderResult.data) {
      return NextResponse.json(
        { error: orderResult.error || 'Failed to create order' },
        { status: 500 }
      )
    }

    const order = orderResult.data

    // Trigger N8N workflow for order creation (vendor notifications only)
    try {
      await N8NWorkflows.onOrderCreated(order.id)
    } catch (n8nError) {
      // Don't fail the order if N8N fails
    }

    // Trigger FunnelKit workflow for customer emails and analytics
    if (user?.id) {
      try {
        await triggerOrderPlaced(user.id, order.id, {
          orderNumber: order.orderNumber,
          total: order.total,
          items: orderItems,
        })
      } catch (workflowError) {
        // Don't fail the order if workflow fails
      }
    }

    // Fetch order with items for emails
    const orderWithItems = await prisma.order.findUnique({
      where: { id: order.id },
      include: { OrderItem: true },
    })

    // Send enhanced order confirmation email to customer
    try {
      await sendOrderConfirmationWithFiles({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: name,
        customerEmail: email,
        items:
          orderWithItems?.OrderItem.map((item: Record<string, unknown>) => ({
            name: item.productName,
            quantity: item.quantity,
            price: item.price,
            options: item.options,
          })) || [],
        subtotal,
        tax,
        shipping,
        total,
        shippingAddress,
      })
    } catch (emailError) {
      // Don't fail the order if email fails
    }

    // Send admin notification email with attachments
    try {
      await sendAdminOrderNotification({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        items:
          orderWithItems?.OrderItem.map((item: Record<string, unknown>) => ({
            name: item.productName,
            quantity: item.quantity,
            price: item.price,
            options: item.options,
          })) || [],
        subtotal,
        tax,
        shipping,
        total,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        shippingMethod,
        orderDate: order.createdAt,
        paymentStatus: 'PENDING_PAYMENT',
      })
    } catch (adminEmailError) {
      // Don't fail the order if admin email fails
    }

    // Create Square payment link
    try {
      const checkoutResult = await createSquareCheckout({
        amount: total,
        orderNumber: order.orderNumber,
        email,
        items: squareLineItems,
      })

      if (checkoutResult.url) {
        // Update order with payment link
        await prisma.order.update({
          where: { id: order.id },
          data: {
            squareOrderId: checkoutResult.orderId || squareOrderId,
          },
        })

        return NextResponse.json({
          success: true,
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            total: order.total,
          },
          checkoutUrl: checkoutResult.url,
        })
      }
    } catch (error) {
      // Return order without payment link
    }

    // If Square checkout failed, return order details for manual processing
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        email: order.email,
      },
      message:
        'Order created. Payment processing temporarily unavailable. We will contact you shortly.',
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process checkout' }, { status: 500 })
  }
}
