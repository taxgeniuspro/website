import { validateRequest } from '@/lib/auth'
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, session } = await validateRequest()
    const { id } = await params

    // Get order with user check for security
    const order = await prisma.order.findFirst({
      where: {
        AND: [{ id }, user ? { userId: user.id } : {}],
      },
      include: {
        OrderItem: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, session } = await validateRequest()

    // Check if user is admin
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { trackingNumber, carrier, status } = body

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        ...(trackingNumber && { trackingNumber }),
        ...(carrier && { carrier }),
        ...(status && { status }),
      },
    })

    // If tracking info was added, send tracking email
    if (trackingNumber && carrier) {
      fetch(`${process.env.NEXTAUTH_URL}/api/orders/send-tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id }),
      }).catch((error) => {})
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
