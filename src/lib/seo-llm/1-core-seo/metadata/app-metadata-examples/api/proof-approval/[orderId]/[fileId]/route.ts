import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withApiHandler, ApiError, createSuccessResponse } from '@/lib/api/error-handler'
import { FileApprovalEmailService } from '@/lib/email/file-approval-email-service'
import { logger } from '@/lib/logger-safe'

const proofApprovalSchema = z.object({
  action: z.enum(['approve', 'reject']),
  message: z.string().optional(),
})

export const POST = withApiHandler(
  async (request: NextRequest, context, params: { orderId: string; fileId: string }) => {
    const { orderId, fileId } = params

    // Parse and validate request body
    const body = await request.json()
    const data = proofApprovalSchema.parse(body)

    // Get the order and file
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        User: {
          select: { name: true },
        },
      },
    })

    if (!order) {
      throw ApiError.notFound('Order')
    }

    const orderFile = await prisma.orderFile.findUnique({
      where: {
        id: fileId,
        orderId: orderId, // Ensure file belongs to this order
      },
    })

    if (!orderFile) {
      throw ApiError.notFound('File')
    }

    // Verify this is a proof file that can be approved
    if (orderFile.fileType !== 'ADMIN_PROOF') {
      throw ApiError.validation('Only proof files can be approved or rejected')
    }

    // Verify the file is in a state that can be approved/rejected
    if (orderFile.approvalStatus !== 'WAITING') {
      throw ApiError.validation(
        `This proof has already been ${orderFile.approvalStatus.toLowerCase()}. No further action is needed.`
      )
    }

    const newStatus = data.action === 'approve' ? 'APPROVED' : 'REJECTED'
    const actionLabel = data.action === 'approve' ? 'approved' : 'rejected'

    logger.info('Processing proof approval', {
      orderId,
      fileId,
      action: data.action,
      newStatus,
      customerEmail: order.email,
      requestId: context.requestId,
    })

    try {
      // Update the file status
      const updatedFile = await prisma.orderFile.update({
        where: { id: fileId },
        data: {
          approvalStatus: newStatus,
          notifyAdmin: true, // Notify admin of the decision
        },
      })

      // Add a message to track the approval/rejection
      const customerMessage = data.message?.trim()
      const systemMessage = `Customer ${actionLabel} this proof${customerMessage ? `: ${customerMessage}` : ''}`

      await prisma.fileMessage.create({
        data: {
          orderFileId: fileId,
          message: systemMessage,
          authorId: order.userId || null,
          authorRole: 'customer',
          authorName: order.User?.name || 'Customer',
          isInternal: false,
        },
      })

      // Send email notification to admin
      if (data.action === 'approve') {
        // Check if all proofs for this order are now approved
        const remainingProofs = await prisma.orderFile.count({
          where: {
            orderId,
            fileType: 'ADMIN_PROOF',
            approvalStatus: 'WAITING',
          },
        })

        const allProofsApproved = remainingProofs === 0

        await FileApprovalEmailService.sendProofApprovedNotification(
          {
            id: order.id,
            orderNumber: order.orderNumber,
            email: order.email,
            User: order.User,
          },
          {
            id: orderFile.id,
            label: orderFile.label,
            filename: orderFile.filename,
          },
          customerMessage,
          allProofsApproved
        )

        logger.info('Proof approved by customer', {
          orderId,
          fileId,
          allProofsApproved,
          customerEmail: order.email,
          requestId: context.requestId,
        })
      } else {
        // Proof rejected - send change request notification
        await FileApprovalEmailService.sendProofRejectedNotification(
          {
            id: order.id,
            orderNumber: order.orderNumber,
            email: order.email,
            User: order.User,
          },
          {
            id: orderFile.id,
            label: orderFile.label,
            filename: orderFile.filename,
          },
          customerMessage || 'Customer requested changes to the proof'
        )

        logger.info('Proof rejected by customer', {
          orderId,
          fileId,
          changeRequested: customerMessage || 'No specific changes mentioned',
          customerEmail: order.email,
          requestId: context.requestId,
        })
      }

      return createSuccessResponse(
        {
          action: data.action,
          status: newStatus,
          fileId: orderFile.id,
          orderId: order.id,
          message: `Proof ${actionLabel} successfully`,
        },
        200,
        `Proof ${actionLabel} successfully`
      )
    } catch (error) {
      logger.error('Failed to process proof approval', {
        orderId,
        fileId,
        action: data.action,
        error: error instanceof Error ? error.message : String(error),
        requestId: context.requestId,
      })

      throw ApiError.internal(`Failed to ${data.action} proof. Please try again.`)
    }
  },
  {
    validateSchema: proofApprovalSchema,
    rateLimit: {
      keyPrefix: 'proof_approval',
      maxRequests: 10,
      windowMs: 60 * 1000, // 1 minute
    },
  }
)
