import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()
    const subscription = await request.json()

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    // Store subscription in database
    // If user is logged in, associate with user
    // Otherwise, store as anonymous subscription

    // Upsert subscription (update if exists, create if not)
    await prisma.pushSubscription.upsert({
      where: {
        endpoint: subscription.endpoint,
      },
      update: {
        subscription: JSON.stringify(subscription),
        active: true,
        updatedAt: new Date(),
      },
      create: {
        endpoint: subscription.endpoint,
        subscription: JSON.stringify(subscription),
        active: true,
        userId: user?.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription stored successfully',
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to store subscription' }, { status: 500 })
  }
}
