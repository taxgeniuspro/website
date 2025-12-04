import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: { orderNumber: string } }) {
  try {
    const { orderNumber } = params

    if (!orderNumber) {
      return NextResponse.json({ error: 'Order number is required' }, { status: 400 })
    }

    // Check if order exists in database
    const order = await prisma.order.findUnique({
      where: {
        orderNumber: orderNumber,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        email: true,
        createdAt: true,
        paidAt: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        email: order.email,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        isVisible: true,
      },
    })
  } catch (error) {
    console.error('Order check error:', error)
    return NextResponse.json({ error: 'Failed to check order' }, { status: 500 })
  }
}
