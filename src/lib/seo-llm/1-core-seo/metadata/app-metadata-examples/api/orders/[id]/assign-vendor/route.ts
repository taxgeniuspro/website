import { validateRequest } from '@/lib/auth'
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OrderService } from '@/lib/services/order-service'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { user } = await validateRequest()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { vendorId, productionDeadline, notes } = await request.json()

    if (!vendorId) {
      return NextResponse.json({ error: 'Vendor ID is required' }, { status: 400 })
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id },
      include: { OrderItem: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Calculate production deadline if not provided
    let deadline: Date
    if (productionDeadline) {
      deadline = new Date(productionDeadline)
    } else {
      // Default: 3 business days from now
      deadline = new Date()
      deadline.setDate(deadline.getDate() + 3)
    }

    // Assign vendor via OrderService
    await OrderService.assignVendor({
      orderId: id,
      vendorId,
      productionDeadline: deadline,
      notes,
    })

    // Return updated order
    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        Vendor: true,
        StatusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Vendor assigned successfully',
    })
  } catch (error) {
    console.error('[Vendor Assignment] Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Failed to assign vendor'

    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }
}
