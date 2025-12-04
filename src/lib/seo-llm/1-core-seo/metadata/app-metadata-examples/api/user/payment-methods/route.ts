import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { createOrUpdateSquareCustomer } from '@/lib/square'
import { SquareClient, SquareEnvironment } from 'square'

// Initialize Square client
const client = new SquareClient({
  squareVersion: '2024-06-04',
  accessToken: process.env.SQUARE_ACCESS_TOKEN!,
  environment:
    process.env.SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
} as any)

// GET - Fetch user's saved payment methods
export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const paymentMethods = await prisma.savedPaymentMethod.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      include: {
        BillingAddress: true,
      },
    })

    return NextResponse.json({ paymentMethods })
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 })
  }
}

// POST - Save new payment method using Square tokenization
export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      sourceId, // Square card token from frontend
      nickname,
      billingAddressId,
      isDefault,
    } = body

    if (!sourceId) {
      return NextResponse.json({ error: 'Payment source required' }, { status: 400 })
    }

    // Create or get Square customer
    const squareCustomer = await createOrUpdateSquareCustomer(
      user.email,
      user.name,
      user.phoneNumber
    )

    // Create card on file with Square
    const { result: cardResult } = await client.cardsApi.createCard({
      sourceId,
      card: {
        customerId: squareCustomer.id,
      },
    })

    if (!cardResult.card) {
      throw new Error('Failed to create card with Square')
    }

    const card = cardResult.card

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.savedPaymentMethod.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      })
    }

    // Check if this is the user's first payment method
    const paymentMethodCount = await prisma.savedPaymentMethod.count({
      where: { userId: user.id },
    })

    const savedPaymentMethod = await prisma.savedPaymentMethod.create({
      data: {
        userId: user.id,
        squareCustomerId: squareCustomer.id,
        squareCardId: card.id || '',
        nickname: nickname || `${card.cardBrand} ending in ${card.last4}`,
        maskedNumber: `****-****-****-${card.last4}`,
        cardBrand: card.cardBrand || 'UNKNOWN',
        expiryMonth: card.expMonth || 0,
        expiryYear: card.expYear || 0,
        isDefault: isDefault || paymentMethodCount === 0, // First payment method is always default
        billingAddressId: billingAddressId || null,
      },
      include: {
        BillingAddress: true,
      },
    })

    return NextResponse.json({ paymentMethod: savedPaymentMethod })
  } catch (error) {
    console.error('Error creating payment method:', error)
    return NextResponse.json({ error: 'Failed to save payment method' }, { status: 500 })
  }
}

// PATCH - Update payment method
export async function PATCH(req: NextRequest) {
  try {
    const { user } = await validateRequest()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, nickname, billingAddressId, isDefault } = body

    // Verify payment method belongs to user
    const existingPaymentMethod = await prisma.savedPaymentMethod.findFirst({
      where: { id, userId: user.id },
    })

    if (!existingPaymentMethod) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.savedPaymentMethod.updateMany({
        where: { userId: user.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const paymentMethod = await prisma.savedPaymentMethod.update({
      where: { id },
      data: {
        nickname,
        billingAddressId,
        isDefault,
      },
      include: {
        BillingAddress: true,
      },
    })

    return NextResponse.json({ paymentMethod })
  } catch (error) {
    console.error('Error updating payment method:', error)
    return NextResponse.json({ error: 'Failed to update payment method' }, { status: 500 })
  }
}

// DELETE - Delete payment method
export async function DELETE(req: NextRequest) {
  try {
    const { user } = await validateRequest()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Payment method ID required' }, { status: 400 })
    }

    // Verify payment method belongs to user
    const existingPaymentMethod = await prisma.savedPaymentMethod.findFirst({
      where: { id, userId: user.id },
    })

    if (!existingPaymentMethod) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
    }

    // Delete card from Square
    try {
      await client.cardsApi.disableCard(existingPaymentMethod.squareCardId)
    } catch (squareError) {
      console.warn('Failed to disable card in Square:', squareError)
      // Continue with local deletion even if Square fails
    }

    await prisma.savedPaymentMethod.delete({
      where: { id },
    })

    // If deleted payment method was default, set another as default
    if (existingPaymentMethod.isDefault) {
      const firstPaymentMethod = await prisma.savedPaymentMethod.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      })

      if (firstPaymentMethod) {
        await prisma.savedPaymentMethod.update({
          where: { id: firstPaymentMethod.id },
          data: { isDefault: true },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting payment method:', error)
    return NextResponse.json({ error: 'Failed to delete payment method' }, { status: 500 })
  }
}
