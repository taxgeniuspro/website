import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

/**
 * POST /api/marketing/coupons/generate
 *
 * Generate discount coupon for automation campaigns
 * Called by N8N workflows
 *
 * Request body:
 * {
 *   type: "PERCENTAGE" | "FIXED_AMOUNT"
 *   value: number (percentage 0-100 or cents for fixed amount)
 *   userId?: string (tie to specific customer)
 *   description?: string
 *   minPurchase?: number (minimum cart value in cents)
 *   maxDiscount?: number (max discount in cents for percentage)
 *   expiresInDays?: number (default: 7)
 *   campaign?: string (e.g., "abandoned_cart", "winback", "anniversary")
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      type,
      value,
      userId,
      description,
      minPurchase,
      maxDiscount,
      expiresInDays = 7,
      campaign,
    } = body

    // Validate required fields
    if (!type || value === undefined) {
      return NextResponse.json({ error: 'Missing required fields: type, value' }, { status: 400 })
    }

    if (type !== 'PERCENTAGE' && type !== 'FIXED_AMOUNT') {
      return NextResponse.json(
        { error: 'Invalid type. Must be PERCENTAGE or FIXED_AMOUNT' },
        { status: 400 }
      )
    }

    // Generate unique coupon code
    const prefix =
      campaign === 'abandoned_cart'
        ? 'CART'
        : campaign === 'winback'
          ? 'BACK'
          : campaign === 'anniversary'
            ? 'YEAR'
            : 'SAVE'

    const randomPart = nanoid(8)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
    const code = `${prefix}${randomPart}`

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Create coupon
    const coupon = await prisma.coupon.create({
      data: {
        id: nanoid(),
        code,
        type,
        value,
        userId,
        description:
          description || `${value}${type === 'PERCENTAGE' ? '%' : ' cents'} off your order`,
        minPurchase,
        maxDiscount,
        expiresAt,
        usageLimit: 1, // One-time use for automation campaigns
        metadata: {
          campaign: campaign || 'marketing_automation',
          generatedAt: new Date().toISOString(),
        },
      },
    })

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description,
        minPurchase: coupon.minPurchase,
        maxDiscount: coupon.maxDiscount,
        expiresAt: coupon.expiresAt,
        expiresInDays,
      },
    })
  } catch (error) {
    console.error('[API] Coupon generation error:', error)
    return NextResponse.json({ error: 'Failed to generate coupon' }, { status: 500 })
  }
}

/**
 * POST /api/marketing/coupons/validate
 *
 * Validate coupon code for checkout
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 })
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!coupon) {
      return NextResponse.json({ valid: false, error: 'Coupon not found' }, { status: 404 })
    }

    // Check if active
    if (!coupon.isActive) {
      return NextResponse.json({
        valid: false,
        error: 'This coupon is no longer active',
      })
    }

    // Check expiration
    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
      return NextResponse.json({
        valid: false,
        error: 'This coupon has expired',
      })
    }

    // Check usage limit
    if (coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({
        valid: false,
        error: 'This coupon has already been used',
      })
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description,
        minPurchase: coupon.minPurchase,
        maxDiscount: coupon.maxDiscount,
        expiresAt: coupon.expiresAt,
      },
    })
  } catch (error) {
    console.error('[API] Coupon validation error:', error)
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 })
  }
}
