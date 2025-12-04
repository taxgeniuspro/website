import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { endpoint } = await request.json()

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })
    }

    // Mark subscription as inactive
    await prisma.pushSubscription.updateMany({
      where: {
        endpoint,
      },
      data: {
        active: false,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Unsubscribed successfully',
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
  }
}
