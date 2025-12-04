import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

/**
 * POST /api/marketing/carts/track
 *
 * Track cart session for abandoned cart automation
 * Called whenever cart is updated (add item, remove item, checkout start)
 *
 * Request body:
 * {
 *   sessionId: string (browser session ID)
 *   userId?: string (if logged in)
 *   email?: string (if provided during checkout)
 *   phone?: string
 *   items: Array<{productId, productName, quantity, price, options}>
 *   subtotal: number (in cents)
 *   tax: number (in cents)
 *   shipping: number (in cents)
 *   total: number (in cents)
 *   shippingMethod?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      sessionId,
      userId,
      email,
      phone,
      items,
      subtotal,
      tax,
      shipping,
      total,
      shippingMethod,
    } = body

    // Validate required fields
    if (!sessionId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, items' },
        { status: 400 }
      )
    }

    // Check if cart session already exists
    const existingCart = await prisma.cartSession.findUnique({
      where: { sessionId },
    })

    const now = new Date()

    if (existingCart) {
      // Update existing cart session
      const updatedCart = await prisma.cartSession.update({
        where: { sessionId },
        data: {
          userId: userId || existingCart.userId,
          email: email || existingCart.email,
          phone: phone || existingCart.phone,
          items: items,
          subtotal,
          tax,
          shipping,
          total,
          shippingMethod: shippingMethod || existingCart.shippingMethod,
          lastActivity: now,
          // Mark as recovered if was previously abandoned
          recovered: existingCart.abandoned ? true : existingCart.recovered,
          recoveredAt:
            existingCart.abandoned && !existingCart.recovered ? now : existingCart.recoveredAt,
        },
      })

      return NextResponse.json({
        success: true,
        cart: updatedCart,
        action: 'updated',
      })
    } else {
      // Create new cart session
      const newCart = await prisma.cartSession.create({
        data: {
          id: nanoid(),
          sessionId,
          userId,
          email,
          phone,
          items,
          subtotal,
          tax,
          shipping,
          total,
          shippingMethod,
          lastActivity: now,
          abandoned: false,
        },
      })

      return NextResponse.json({
        success: true,
        cart: newCart,
        action: 'created',
      })
    }
  } catch (error) {
    console.error('[API] Cart tracking error:', error)
    return NextResponse.json({ error: 'Failed to track cart session' }, { status: 500 })
  }
}
