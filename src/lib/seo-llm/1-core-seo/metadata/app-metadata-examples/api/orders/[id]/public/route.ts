import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Find order by ID or order number
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id },
          { orderNumber: id },
        ],
      },
      include: {
        OrderItem: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Return only public order information
    const publicOrderData = {
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      subtotal: order.subtotal,
      tax: order.tax,
      shipping: order.shipping,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      shippingMethod: order.shippingMethod,
      shippingAddress: order.shippingAddress,
      email: order.email,
      items: order.OrderItem.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        options: item.options,
      })),
    }

    return NextResponse.json(publicOrderData)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch order data' },
      { status: 500 }
    )
  }
}
