import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { shippingCalculator, type ShippingAddress, type ShippingPackage } from '@/lib/shipping'

const createLabelSchema = z.object({
  orderId: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest()

    // Only admins can create shipping labels
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const validation = createLabelSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { orderId } = validation.data

    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        OrderItem: {
          include: {
            PaperStock: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!order.carrier || !order.shippingServiceCode) {
      return NextResponse.json(
        { error: 'No shipping method selected for this order' },
        { status: 400 }
      )
    }

    // Parse addresses
    const fromAddress: ShippingAddress = {
      street: '1234 Print Shop Way',
      city: 'Houston',
      state: 'TX',
      zipCode: '77001',
      country: 'US',
      isResidential: false,
    }

    const shippingAddr = order.shippingAddress as any
    const toAddress: ShippingAddress = {
      street: shippingAddr.street || shippingAddr.address,
      street2: shippingAddr.street2,
      city: shippingAddr.city,
      state: shippingAddr.state,
      zipCode: shippingAddr.zipCode || shippingAddr.zip,
      country: shippingAddr.country || 'US',
      isResidential: shippingAddr.isResidential !== false,
    }

    // Calculate package weight
    const packages: ShippingPackage[] = []

    if (order.totalWeight) {
      // Use pre-calculated weight if available
      packages.push({
        weight: order.totalWeight,
        dimensions: order.packageDimensions as any,
      })
    } else {
      // Calculate weight from items
      let totalWeight = 0
      for (const item of order.OrderItem) {
        if (item.calculatedWeight) {
          totalWeight += item.calculatedWeight
        } else if (item.paperStock && item.dimensions) {
          const dims = item.dimensions as any
          const weight = item.paperStock.weight * dims.width * dims.height * item.quantity
          totalWeight += weight
        }
      }

      packages.push({
        weight: Math.max(totalWeight || 1, 1), // Minimum 1 lb
        dimensions: {
          width: 12,
          height: 9,
          length: 16,
        },
      })
    }

    // Create shipping label
    const label = await shippingCalculator.createLabel(
      order.carrier,
      fromAddress,
      toAddress,
      packages,
      order.shippingServiceCode
    )

    // Update order with tracking info
    await prisma.order.update({
      where: { id: orderId },
      data: {
        trackingNumber: label.trackingNumber,
        shippingLabelUrl: label.labelUrl,
      },
    })

    return NextResponse.json({
      success: true,
      label,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create shipping label' }, { status: 500 })
  }
}
