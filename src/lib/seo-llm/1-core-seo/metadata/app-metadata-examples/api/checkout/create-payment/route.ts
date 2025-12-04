import { type NextRequest, NextResponse } from 'next/server'
import { createSquareCheckout, createOrUpdateSquareCustomer } from '@/lib/square'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { randomUUID } from 'crypto'

interface CartItem {
  id: string
  productName: string
  sku: string
  quantity: number
  price: number
  options?: any
  fileName?: string
  fileSize?: number
}

interface UploadedImage {
  id: string
  url: string
  thumbnailUrl?: string
  fileName: string
  fileSize?: number
  uploadedAt?: string
}

export async function POST(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()
    const body = await request.json()

    const {
      cartItems,
      uploadedImages,
      customerInfo,
      shippingAddress,
      billingAddress,
      shippingRate,
      selectedAirportId,
      subtotal,
      tax,
      shipping,
      total,
    } = body

    // Normalize email to lowercase for consistent lookup
    const normalizedEmail = customerInfo.email.toLowerCase()

    // Find or create customer
    let customer = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    })

    if (!customer) {
      // Create new customer
      customer = await prisma.user.create({
        data: {
          id: randomUUID(),
          email: normalizedEmail,
          name:
            `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() || 'Customer',
          role: 'CUSTOMER',
          emailVerified: false,
          updatedAt: new Date(),
        },
      })
    }

    // Generate order number
    const orderNumber = `GRP-${Date.now().toString(36).toUpperCase()}`

    // Create or update Square customer
    const squareCustomer = await createOrUpdateSquareCustomer(
      normalizedEmail,
      `${customerInfo.firstName} ${customerInfo.lastName}`,
      customerInfo.phone
    )

    // Create order in database with PENDING_PAYMENT status
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const order = await prisma.order.create({
      data: {
        id: orderId,
        orderNumber,
        referenceNumber: orderNumber,
        updatedAt: new Date(),
        userId: customer.id,
        email: normalizedEmail,
        phone: customerInfo.phone,
        subtotal,
        tax,
        shipping,
        total,
        shippingMethod: shippingRate
          ? `${shippingRate.carrier} - ${shippingRate.serviceName}`
          : null,
        selectedAirportId,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        status: 'PENDING_PAYMENT',
        squareCustomerId: squareCustomer.id,
        // Store uploaded images in adminNotes as JSON
        adminNotes: uploadedImages ? JSON.stringify({ uploadedImages }) : undefined,
        OrderItem: {
          create: cartItems.map((item: CartItem) => ({
            id: `${orderNumber}-${item.id}`,
            productName: item.productName,
            productSku: item.sku,
            quantity: item.quantity,
            price: item.price,
            options: {
              ...item.options,
              fileName: item.fileName,
              fileSize: item.fileSize,
              uploadedImages: uploadedImages, // Store images with each item
            },
          })),
        },
      },
    })

    // Create Square checkout
    const lineItems = cartItems.map((item: CartItem) => ({
      name: `${item.productName} - ${item.options.size || 'Standard'}`,
      quantity: item.quantity.toString(),
      basePriceMoney: {
        amount: BigInt(Math.round(item.price * 100)), // Convert to cents
        currency: 'USD',
      },
    }))

    const checkout = await createSquareCheckout({
      amount: Math.round(total * 100), // Convert to cents
      orderNumber: order.orderNumber,
      email: customerInfo.email,
      items: lineItems,
    })

    // Update order with Square IDs
    await prisma.order.update({
      where: { id: order.id },
      data: {
        squareOrderId: checkout.orderId,
      },
    })

    // Note: Confirmation email will be sent by Square webhook after payment completes
    // Flow: Square webhook → OrderService.processPayment → OrderEmailService.sendOrderConfirmation

    return NextResponse.json({
      success: true,
      checkoutUrl: checkout.url,
      orderId: order.id,
      orderNumber: order.orderNumber,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
