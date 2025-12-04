import { validateRequest } from '@/lib/auth'
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET quotes (customer or admin)
export async function GET(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const quoteId = searchParams.get('id')
    const status = searchParams.get('status') as QuoteStatus | null

    // If requesting specific quote
    if (quoteId) {
      const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      if (!quote) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
      }

      // Check authorization - users can only view their own quotes
      if (quote.userId && quote.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      return NextResponse.json(quote)
    }

    // List quotes
    const whereClause: Record<string, any> = {}

    // Admin users can see all quotes, regular users see only their quotes
    if (user?.role === 'ADMIN') {
      // Admin can see all quotes - no userId filter
    } else {
      // Regular users only see their own quotes
      whereClause.userId = userId
    }

    // Filter by status if provided
    if (status) {
      whereClause.status = status
    }

    const quotes = await prisma.quote.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(quotes)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
  }
}

// CREATE a new quote
export async function POST(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      customerEmail,
      customerName,
      customerPhone,
      productDetails,
      pricing,
      validDays = 30,
      notes,
    } = body

    // Validate required fields
    if (!customerEmail || !productDetails || !pricing) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Calculate expiration date
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + validDays)

    // Generate quote number
    const quoteCount = await prisma.quote.count()
    const quoteNumber = `Q-${(quoteCount + 1).toString().padStart(5, '0')}`

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        userId: userId,
        customerEmail,
        customerName,
        customerPhone,
        productDetails,
        pricing,
        validUntil,
        status: 'DRAFT',
        notes,
        createdBy: userId,
      },
    })

    return NextResponse.json({
      success: true,
      quote,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 })
  }
}

// UPDATE quote status or convert to order
export async function PUT(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, convertToOrder } = body

    if (!id) {
      return NextResponse.json({ error: 'Quote ID is required' }, { status: 400 })
    }

    const quote = await prisma.quote.findUnique({
      where: { id },
    })

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Check authorization - users can only update their own quotes
    if (quote.userId && quote.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Convert to order if requested
    if (convertToOrder) {
      // Check if quote is valid
      if (quote.validUntil < new Date()) {
        return NextResponse.json({ error: 'Quote has expired' }, { status: 400 })
      }

      // Create order from quote
      const orderCount = await prisma.order.count()
      const referenceNumber = `GRP-${(orderCount + 1).toString().padStart(5, '0')}`

      const order = await prisma.order.create({
        data: {
          referenceNumber,
          userId: quote.userId,
          email: quote.customerEmail,
          phone: quote.customerPhone,
          subtotal:
            quote.pricing && typeof quote.pricing === 'object' && 'subtotal' in quote.pricing
              ? Number(quote.pricing.subtotal)
              : 0,
          tax:
            quote.pricing && typeof quote.pricing === 'object' && 'tax' in quote.pricing
              ? Number(quote.pricing.tax)
              : 0,
          shipping:
            quote.pricing && typeof quote.pricing === 'object' && 'shipping' in quote.pricing
              ? Number(quote.pricing.shipping)
              : 0,
          total:
            quote.pricing && typeof quote.pricing === 'object' && 'total' in quote.pricing
              ? Number(quote.pricing.total)
              : 0,
          status: 'PENDING_PAYMENT',
          shippingAddress: {
            name: quote.customerName,
            email: quote.customerEmail,
            phone: quote.customerPhone,
          },
        },
      })

      // Update quote status
      await prisma.quote.update({
        where: { id },
        data: {
          status: 'CONVERTED',
          convertedToOrderId: order.id,
        },
      })

      return NextResponse.json({
        success: true,
        orderId: order.id,
        orderNumber: order.referenceNumber,
      })
    }

    // Update quote status
    if (status) {
      const updatedQuote = await prisma.quote.update({
        where: { id },
        data: { status },
      })

      return NextResponse.json({
        success: true,
        quote: updatedQuote,
      })
    }

    return NextResponse.json({ error: 'No update action specified' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 })
  }
}
