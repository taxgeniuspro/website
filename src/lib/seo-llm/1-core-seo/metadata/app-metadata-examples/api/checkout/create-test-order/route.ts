import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { OrderEmailService } from '@/lib/email/order-email-service'
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

    // Generate order number with TEST prefix
    const orderNumber = `TEST-${Date.now().toString(36).toUpperCase()}`

    // Create order in database with CONFIRMATION status (test orders are pre-paid)
    const orderId = `test_order_${Date.now()}_${Math.random().toString(36).substring(7)}`
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
        status: 'CONFIRMATION', // Test orders skip payment and go directly to confirmation
        paymentMethod: 'test_cash',
        paidAt: new Date(), // Mark as paid immediately for test orders
        // Store uploaded images in adminNotes as JSON
        adminNotes: uploadedImages
          ? JSON.stringify({ uploadedImages, testMode: true })
          : JSON.stringify({ testMode: true }),
        OrderItem: {
          create: cartItems.map((item: CartItem) => ({
            id: `${orderNumber}-${item.id}`,
            productName: item.productName,
            productSku: item.sku,
            quantity: item.quantity,
            price: item.price,
            categoryId: item.categoryId || null,
            categoryName: item.categoryName || null,
            options: {
              ...item.options,
              fileName: item.fileName,
              fileSize: item.fileSize,
              uploadedImages: uploadedImages, // Store images with each item
            },
          })),
        },
      },
      include: {
        OrderItem: true,
        User: true,
      },
    })

    // Send confirmation email for test orders
    try {
      await OrderEmailService.sendOrderConfirmation(order)
      //   `[Test Order] Confirmation email sent to ${order.email} for order ${order.orderNumber}`
      // )
    } catch (emailError) {
      console.error('[Test Order] Failed to send confirmation email:', emailError)
      // Don't fail the order creation if email fails
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
    })
  } catch (error) {
    console.error('Test order creation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create test order',
      },
      { status: 500 }
    )
  }
}
