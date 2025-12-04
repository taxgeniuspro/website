import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/marketing/carts/abandoned
 *
 * Fetch abandoned carts for automation (N8N)
 * Called by N8N hourly cron workflow
 *
 * Query params:
 * - minHours: Minimum hours since last activity (default: 3)
 * - maxHours: Maximum hours since last activity (default: 72)
 * - minValue: Minimum cart value in cents (default: 0)
 * - maxValue: Maximum cart value in cents (optional, for tiered campaigns)
 * - limit: Max results to return (default: 50)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const minHours = parseInt(searchParams.get('minHours') || '3', 10)
    const maxHours = parseInt(searchParams.get('maxHours') || '72', 10)
    const minValue = parseInt(searchParams.get('minValue') || '0', 10)
    const maxValue = searchParams.get('maxValue')
      ? parseInt(searchParams.get('maxValue')!, 10)
      : undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const now = new Date()
    const minActivityDate = new Date(now.getTime() - maxHours * 60 * 60 * 1000)
    const maxActivityDate = new Date(now.getTime() - minHours * 60 * 60 * 1000)

    // Build where clause
    const where: any = {
      abandoned: false, // Not yet marked as abandoned
      lastActivity: {
        gte: minActivityDate,
        lte: maxActivityDate,
      },
      total: {
        gte: minValue,
      },
      // Must have email to send abandonment reminder
      email: {
        not: null,
      },
    }

    // Add max value filter if specified (for tiered campaigns)
    if (maxValue !== undefined) {
      where.total.lte = maxValue
    }

    // Fetch abandoned carts
    const abandonedCarts = await prisma.cartSession.findMany({
      where,
      take: limit,
      orderBy: {
        lastActivity: 'asc', // Oldest first
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Mark carts as abandoned (so they don't get fetched again)
    const cartIds = abandonedCarts.map((cart) => cart.id)
    if (cartIds.length > 0) {
      await prisma.cartSession.updateMany({
        where: {
          id: {
            in: cartIds,
          },
        },
        data: {
          abandoned: true,
          abandonedAt: now,
        },
      })
    }

    // Calculate hours since last activity for each cart
    const cartsWithAge = abandonedCarts.map((cart) => ({
      ...cart,
      hoursSinceActivity: Math.floor(
        (now.getTime() - new Date(cart.lastActivity).getTime()) / (1000 * 60 * 60)
      ),
      items: cart.items as any[], // Cast JSON to array
    }))

    return NextResponse.json({
      success: true,
      count: abandonedCarts.length,
      carts: cartsWithAge,
      filters: {
        minHours,
        maxHours,
        minValue,
        maxValue,
      },
    })
  } catch (error) {
    console.error('[API] Fetch abandoned carts error:', error)
    return NextResponse.json({ error: 'Failed to fetch abandoned carts' }, { status: 500 })
  }
}

/**
 * POST /api/marketing/carts/abandoned/mark-recovered
 *
 * Mark cart as recovered when customer completes purchase
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const cart = await prisma.cartSession.update({
      where: { sessionId },
      data: {
        recovered: true,
        recoveredAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      cart,
    })
  } catch (error) {
    console.error('[API] Mark cart recovered error:', error)
    return NextResponse.json({ error: 'Failed to mark cart as recovered' }, { status: 500 })
  }
}
