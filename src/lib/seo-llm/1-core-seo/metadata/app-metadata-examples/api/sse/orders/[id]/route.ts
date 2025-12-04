import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Store active connections
const connections = new Map<string, ReadableStreamDefaultController>()

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: orderId } = await context.params
    const { user, session } = await validateRequest()

    // Verify user has access to this order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        userId: true,
        email: true,
        status: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check authorization
    const isOwner = order.email === session?.user?.email
    const isAdmin = (session?.user as any)?.role === 'ADMIN'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Store connection
        const connectionId = `${orderId}-${Date.now()}`
        connections.set(connectionId, controller)

        // Send initial connection message
        const encoder = new TextEncoder()
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'connected',
              orderId,
              currentStatus: order.status,
            })}\n\n`
          )
        )

        // Set up polling for order updates
        const interval = setInterval(async () => {
          try {
            const updatedOrder = await prisma.order.findUnique({
              where: { id: orderId },
              include: {
                statusHistory: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
                notifications: {
                  where: { sent: false },
                  take: 5,
                },
              },
            })

            if (updatedOrder) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'update',
                    order: {
                      id: updatedOrder.id,
                      status: updatedOrder.status,
                      trackingNumber: updatedOrder.trackingNumber,
                      carrier: updatedOrder.carrier,
                      updatedAt: updatedOrder.updatedAt,
                    },
                    latestStatusChange: updatedOrder.statusHistory[0],
                    pendingNotifications: updatedOrder.notifications.length,
                  })}\n\n`
                )
              )
            }
          } catch (error) {}
        }, 5000) // Poll every 5 seconds

        // Clean up on close
        request.signal.addEventListener('abort', () => {
          clearInterval(interval)
          connections.delete(connectionId)
          controller.close()
        })
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable Nginx buffering
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to establish SSE connection' }, { status: 500 })
  }
}
