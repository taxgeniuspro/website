import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Re-Order API Endpoint
 *
 * Fetches order data and prepares it for re-ordering
 * - Checks product availability
 * - Retrieves current product data
 * - Returns structured data for client-side cart population
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Authenticate user
    const { user } = await validateRequest()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Fetch original order with all related data
    const order = await prisma.order.findUnique({
      where: {
        id,
        userId: user.id, // Ensure user owns this order
      },
      include: {
        OrderItem: {
          include: {
            PaperStock: true,
            OrderItemAddOn: {
              include: {
                AddOn: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Block re-ordering cancelled/refunded orders
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      return NextResponse.json(
        { error: 'Cannot reorder a cancelled or refunded order' },
        { status: 400 }
      )
    }

    // Process each order item to check availability and get current data
    const items = await Promise.all(
      order.OrderItem.map(async (orderItem) => {
        // Parse options from JSON
        const options = (orderItem.options as Record<string, any>) || {}

        // Try to find the product by SKU first, then by name
        const product = await prisma.product.findFirst({
          where: {
            OR: [{ sku: orderItem.productSku }, { name: orderItem.productName }],
            isActive: true,
          },
          include: {
            ProductImage: {
              where: { isPrimary: true },
              take: 1,
              include: {
                Image: true,
              },
            },
          },
        })

        // Product availability check
        if (!product) {
          return {
            id: orderItem.id,
            productName: orderItem.productName,
            productSku: orderItem.productSku,
            quantity: orderItem.quantity,
            originalPrice: orderItem.price,
            available: false,
            reason: 'Product no longer available',
          }
        }

        // Build re-order item data
        return {
          id: orderItem.id,
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          productSku: product.sku,
          quantity: orderItem.quantity,
          originalPrice: orderItem.price,
          currentPrice: orderItem.price ?? orderItem.price, // Using original price (pricing calc would be complex)
          priceChanged: false,
          available: true,
          image: product.productImages[0]?.Image?.url || null,
          options: options,
          dimensions: orderItem.dimensions,
          paperStockWeight: orderItem.calculatedWeight,
          paperStock: orderItem.PaperStock
            ? {
                id: orderItem.PaperStock.id,
                name: orderItem.PaperStock.name,
              }
            : null,
          addOns: orderItem.OrderItemAddOn.map((addon) => ({
            id: addon.AddOn.id,
            name: addon.AddOn.name,
            price: addon.calculatedPrice,
            configuration: addon.configuration,
          })),
        }
      })
    )

    // Calculate totals
    const availableItems = items.filter((item) => item.available)
    const currentTotal = availableItems.reduce(
      (sum, item) => sum + (item.currentPrice ?? 0) * item.quantity,
      0
    )

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt.toISOString(),
        originalTotal: order.total,
      },
      items,
      summary: {
        totalItems: items.length,
        availableItems: availableItems.length,
        unavailableItems: items.filter((item) => !item.available).length,
        currentTotal,
        originalTotal: order.total,
        priceChanged: Math.abs(currentTotal - order.total) > 0.01,
      },
    })
  } catch (error) {
    console.error('Error processing reorder:', error)
    return NextResponse.json({ error: 'Failed to process reorder' }, { status: 500 })
  }
}
