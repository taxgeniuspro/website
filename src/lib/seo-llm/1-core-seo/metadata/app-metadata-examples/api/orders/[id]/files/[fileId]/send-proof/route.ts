import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { z } from 'zod'
import { withApiHandler, ApiError, createSuccessResponse } from '@/lib/api/error-handler'
import { FileApprovalEmailService } from '@/lib/email/file-approval-email-service'
import { logger } from '@/lib/logger-safe'

const sendProofSchema = z.object({
  message: z.string().optional(),
})

export const POST = withApiHandler(
  async (request: NextRequest, context, params: { id: string; fileId: string }) => {
    const { user } = await validateRequest()
    const { id: orderId, fileId } = params

    if (!user) {
      throw ApiError.authentication()
    }

    // Only admins can send proof emails
    if (user.role !== 'ADMIN') {
      throw ApiError.authorization('Only administrators can send proof emails')
    }

    // Parse and validate request body
    const body = await request.json()
    const data = sendProofSchema.parse(body)

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

    // Verify this is a valid file for proof email (should be admin uploaded or proof type)
    if (orderFile.uploadedByRole !== 'ADMIN' && orderFile.fileType !== 'ADMIN_PROOF') {
      throw ApiError.validation(
        'Only admin-uploaded files or proof files can be sent as proof emails'
      )
    }

    logger.info('Sending proof email', {
      orderId,
      fileId,
      filename: orderFile.filename,
      customerEmail: order.email,
      adminId: user.id,
      requestId: context.requestId,
    })

    try {
      // Send the proof email with attachment
      await FileApprovalEmailService.sendProofWithAttachment(
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
          fileUrl: orderFile.fileUrl,
          mimeType: orderFile.mimeType || undefined,
          fileSize: orderFile.fileSize || undefined,
        },
        data.message
      )

      // Update the file status to indicate it's been sent for approval
      await prisma.orderFile.update({
        where: { id: fileId },
        data: {
          approvalStatus: 'WAITING',
          notifyCustomer: true,
        },
      })

      // Log the action for audit trail
      await prisma.fileMessage.create({
        data: {
          orderFileId: fileId,
          message: data.message || 'Proof sent to customer for approval via email',
          authorId: user.id,
          authorRole: 'admin',
          authorName: user.name || user.email,
          isInternal: false,
        },
      })

      logger.info('Proof email sent successfully', {
        orderId,
        fileId,
        customerEmail: order.email,
        adminId: user.id,
        requestId: context.requestId,
      })

      return createSuccessResponse(
        {
          message: 'Proof email sent successfully',
          fileId: orderFile.id,
          customerEmail: order.email,
        },
        200,
        'Proof email sent to customer'
      )
    } catch (emailError) {
      logger.error('Failed to send proof email', {
        orderId,
        fileId,
        error: emailError instanceof Error ? emailError.message : String(emailError),
        requestId: context.requestId,
      })

      throw ApiError.internal('Failed to send proof email. Please try again.')
    }
  },
  {
    validateSchema: sendProofSchema,
    rateLimit: {
      keyPrefix: 'send_proof_email',
      maxRequests: 5,
      windowMs: 60 * 1000, // 1 minute
    },
  }
)
