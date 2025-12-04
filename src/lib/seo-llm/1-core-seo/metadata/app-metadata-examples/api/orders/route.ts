import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()

    const searchParams = request.nextUrl.searchParams
    const orderNumber = searchParams.get('orderNumber')
    const email = searchParams.get('email')

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 100) // Max 100 items per page
    const skip = (page - 1) * limit

    if (orderNumber) {
      // Search by order number
      const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: {
          OrderItem: true,
          File: true,
          StatusHistory: {
            orderBy: { createdAt: 'desc' },
          },
        },
      })

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      // Check authorization
      if (!user || (order.email !== user.email && user.role !== 'ADMIN')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      return NextResponse.json(order)
    }

    if (email) {
      // Search by email with pagination
      const [totalCount, orders] = await Promise.all([
        prisma.order.count({ where: { email } }),
        prisma.order.findMany({
          where: { email },
          include: {
            OrderItem: true,
            StatusHistory: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ])

      return NextResponse.json({
        orders,
        pagination: {
          totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPreviousPage: page > 1,
        },
      })
    }

    // Admin: Get all orders with pagination
    if (user?.role === 'ADMIN') {
      const [totalCount, orders] = await Promise.all([
        prisma.order.count(),
        prisma.order.findMany({
          include: {
            OrderItem: true,
            StatusHistory: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ])

      return NextResponse.json({
        orders,
        pagination: {
          totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPreviousPage: page > 1,
        },
      })
    }

    // User: Get their orders with pagination
    if (user?.email) {
      const [totalCount, orders] = await Promise.all([
        prisma.order.count({ where: { email: user.email } }),
        prisma.order.findMany({
          where: { email: user.email },
          include: {
            OrderItem: true,
            StatusHistory: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ])

      return NextResponse.json({
        orders,
        pagination: {
          totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPreviousPage: page > 1,
        },
      })
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()
    const body = await request.json()

    const { email, phone, items, files, subtotal, tax, shipping, total, shippingAddress } = body

    // Generate order number
    const orderCount = await prisma.order.count()
    const orderNumber = `GRP-${String(orderCount + 1).padStart(5, '0')}`

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        email,
        phone,
        userId: user?.id,
        subtotal,
        tax,
        shipping,
        total,
        shippingAddress,
        status: 'PENDING_PAYMENT',
        OrderItem: {
          create: items.map((item: Record<string, unknown>) => ({
            productName: item.productName,
            productSku: item.productSku,
            quantity: item.quantity,
            price: item.price,
            options: item.options,
          })),
        },
        File: files
          ? {
              create: files.map((file: Record<string, unknown>) => ({
                fileName: file.fileName,
                fileUrl: file.fileUrl,
                fileSize: file.fileSize,
                mimeType: file.mimeType,
                metadata: file.metadata,
              })),
            }
          : undefined,
        StatusHistory: {
          create: {
            toStatus: 'PENDING_PAYMENT',
            notes: 'Order created',
            changedBy: user?.email || 'System',
          },
        },
        Notification: {
          create: {
            type: 'ORDER_CONFIRMED',
            sent: false,
          },
        },
      },
      include: {
        OrderItem: true,
        File: true,
        StatusHistory: true,
      },
    })

    // Send confirmation email
    try {
      await fetch(`${process.env.NEXTAUTH_URL}/api/orders/confirm-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerEmail: order.email,
        }),
      })
    } catch (emailError) {
      // Don't fail the order creation if email fails
    }

    // Create payment session for order
    try {
      await fetch(`${process.env.NEXTAUTH_URL}/api/checkout/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          amount: order.total,
          customerEmail: order.email,
        }),
      })
    } catch (paymentError) {
      // Payment can be retried later
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
