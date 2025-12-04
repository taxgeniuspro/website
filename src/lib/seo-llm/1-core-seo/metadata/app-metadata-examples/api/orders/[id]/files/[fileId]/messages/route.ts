import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { z } from 'zod'

// GET - Get messages for a file
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const { user } = await validateRequest()
    const { id: orderId, fileId } = params

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const isAdmin = session?.user?.role === 'ADMIN'
    const isOwner = session?.user?.email === order.email

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify file exists
    const file = await prisma.orderFile.findUnique({
      where: { id: fileId },
    })

    if (!file || file.orderId !== orderId) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Get messages
    const messages = await prisma.fileMessage.findMany({
      where: {
        orderFileId: fileId,
        // Filter internal notes for customers
        ...(isAdmin ? {} : { isInternal: false }),
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json({
      messages,
      count: messages.length,
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST - Add a message to a file
const messageSchema = z.object({
  message: z.string().min(1),
  isInternal: z.boolean().optional().default(false),
  attachments: z.array(z.string().url()).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const { user } = await validateRequest()
    const { id: orderId, fileId } = params

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const {
      checkRateLimit,
      getRateLimitIdentifier,
      getClientIp,
      formatRateLimitError,
      addRateLimitHeaders,
      RATE_LIMITS,
    } = await import('@/lib/security/rate-limiter')

    const clientIp = getClientIp(request.headers)
    const rateLimitId = getRateLimitIdentifier(clientIp, user.id)
    const rateLimitResult = checkRateLimit(rateLimitId, RATE_LIMITS.MESSAGE_POST)

    if (!rateLimitResult.allowed) {
      const errorResponse = NextResponse.json(
        { error: formatRateLimitError(rateLimitResult) },
        { status: 429 }
      )
      addRateLimitHeaders(errorResponse.headers, rateLimitResult)
      return errorResponse
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const isAdmin = user.role === 'ADMIN'
    const isOwner = user.email === order.email

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify file exists
    const file = await prisma.orderFile.findUnique({
      where: { id: fileId },
    })

    if (!file || file.orderId !== orderId) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const body = await request.json()
    const data = messageSchema.parse(body)

    // Only admins can create internal notes
    const isInternal = isAdmin ? data.isInternal : false

    const message = await prisma.fileMessage.create({
      data: {
        orderFileId: fileId,
        message: data.message,
        isInternal,
        authorId: user.id,
        authorRole: isAdmin ? 'admin' : 'customer',
        authorName: user.name || user.email,
        attachments: data.attachments,
      },
    })

    // TODO: Send email notification about new message

    // Add rate limit headers to response
    const response = NextResponse.json(message, { status: 201 })
    addRateLimitHeaders(response.headers, rateLimitResult)

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating message:', error)
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
  }
}
