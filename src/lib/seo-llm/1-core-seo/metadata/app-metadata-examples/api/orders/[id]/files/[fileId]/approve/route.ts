import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { z } from 'zod'

// POST - Approve or reject a file
const approvalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  message: z.string().optional(),
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
    const rateLimitResult = checkRateLimit(rateLimitId, RATE_LIMITS.FILE_APPROVAL)

    if (!rateLimitResult.allowed) {
      const errorResponse = NextResponse.json(
        { error: formatRateLimitError(rateLimitResult) },
        { status: 429 }
      )
      addRateLimitHeaders(errorResponse.headers, rateLimitResult)
      return errorResponse
    }

    // Verify order exists and user has access
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

    // Get the file
    const file = await prisma.orderFile.findUnique({
      where: { id: fileId },
    })

    if (!file || file.orderId !== orderId) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Only allow approval if file is waiting for approval
    if (file.approvalStatus !== 'WAITING') {
      return NextResponse.json({ error: 'File is not waiting for approval' }, { status: 400 })
    }

    const body = await request.json()
    const data = approvalSchema.parse(body)

    // Update file approval status
    const updatedFile = await prisma.orderFile.update({
      where: { id: fileId },
      data: {
        approvalStatus: data.status,
        approvedBy: user.id,
        approvedAt: new Date(),
      },
    })

    // Add approval message if provided
    if (data.message) {
      await prisma.fileMessage.create({
        data: {
          orderFileId: fileId,
          message: data.message,
          authorId: user.id,
          authorRole: isAdmin ? 'admin' : 'customer',
          authorName: user.name || user.email || 'Unknown',
        },
      })
    }

    // Check if all files for this order are approved
    const orderFiles = await prisma.orderFile.findMany({
      where: {
        orderId,
        fileType: 'ADMIN_PROOF',
        isVisible: true,
      },
    })

    const allApproved = orderFiles.every(
      (f) => f.approvalStatus === 'APPROVED' || f.approvalStatus === 'NOT_REQUIRED'
    )

    // Update order if all files approved
    if (allApproved && orderFiles.length > 0) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          filesApprovedAt: new Date(),
          filesApprovedBy: user.id,
        },
      })
    }

    // Send email notification to admin about approval/rejection
    try {
      const { FileApprovalEmailService } = await import('@/lib/email/file-approval-email-service')
      const orderWithUser = await prisma.order.findUnique({
        where: { id: orderId },
        include: { User: { select: { name: true } } },
      })

      if (orderWithUser) {
        const fileInfo = {
          id: updatedFile.id,
          label: updatedFile.label || undefined,
          filename: updatedFile.filename,
        }

        if (data.status === 'APPROVED') {
          // Proof approved - notify admin
          await FileApprovalEmailService.sendProofApprovedNotification(
            {
              id: orderWithUser.id,
              orderNumber: orderWithUser.orderNumber,
              email: orderWithUser.email,
              User: orderWithUser.User,
            },
            fileInfo,
            data.message,
            allApproved
          )
        } else {
          // Proof rejected - notify admin with change requests
          await FileApprovalEmailService.sendProofRejectedNotification(
            {
              id: orderWithUser.id,
              orderNumber: orderWithUser.orderNumber,
              email: orderWithUser.email,
              User: orderWithUser.User,
            },
            fileInfo,
            data.message || 'Customer requested changes but did not provide details.'
          )
        }
      }
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError)
      // Don't fail the request if email fails
    }

    // TODO: If all approved, trigger production workflow (e.g., update order status)

    // Add rate limit headers to response
    const response = NextResponse.json({
      file: updatedFile,
      allApproved,
      orderFilesCount: orderFiles.length,
    })
    addRateLimitHeaders(response.headers, rateLimitResult)

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error approving file:', error)
    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 })
  }
}
