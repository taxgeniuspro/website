import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Carrier } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

const selectShippingSchema = z.object({
  orderId: z.string(),
  carrier: z.nativeEnum(Carrier),
  serviceCode: z.string(),
  serviceName: z.string(),
  rateAmount: z.number().positive(),
  estimatedDays: z.number().int().positive(),
})

export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest()
    const body = await request.json()
    const validation = selectShippingSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { orderId, carrier, serviceCode, serviceName, rateAmount, estimatedDays } =
      validation.data

    // Verify order exists and belongs to user (if not admin)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, status: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if user has permission to update this order
    if (user && order.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update order with selected shipping details
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        carrier,
        shippingMethod: serviceName,
        shippingServiceCode: serviceCode,
        shipping: rateAmount,
        // Recalculate total
        total: {
          increment: rateAmount,
        },
      },
    })

    // Mark the selected rate in ShippingRate table if exists
    await prisma.shippingRate.updateMany({
      where: { orderId },
      data: { isSelected: false },
    })

    await prisma.shippingRate.updateMany({
      where: {
        orderId,
        carrier,
        serviceCode,
      },
      data: { isSelected: true },
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to select shipping method' }, { status: 500 })
  }
}
