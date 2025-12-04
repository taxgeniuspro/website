import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { z } from 'zod'
import { withApiHandler, ApiError, createSuccessResponse } from '@/lib/api/error-handler'
import { logger } from '@/lib/logger-safe'

// GET - List all files for an order
export const GET = withApiHandler(async (request: NextRequest, context, params: { id: string }) => {
  const { user } = await validateRequest()
  const orderId = params.id

  if (!user) {
    throw ApiError.authentication()
  }

  // Verify order exists and user has access
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      User: true,
    },
  })

  if (!order) {
    throw ApiError.notFound('Order')
  }

  // Check permissions
  const isAdmin = user.role === 'ADMIN'
  const isOwner = user.email === order.email || (order.userId && order.userId === user.id)

  if (!isAdmin && !isOwner) {
    throw ApiError.authorization('You do not have access to this order')
  }

  logger.info('Fetching order files', {
    orderId,
    userId: user.id,
    userRole: user.role,
    requestId: context.requestId,
  })

  // Get all files for the order
  const files = await prisma.orderFile.findMany({
    where: {
      orderId,
      isVisible: true,
    },
    include: {
      FileMessage: {
        where: isAdmin ? {} : { isInternal: false }, // Hide internal messages from customers
        orderBy: {
          createdAt: 'desc',
        },
        take: 5, // Include last 5 messages per file
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Filter out admin-only files for customers
  const visibleFiles = isAdmin
    ? files
    : files.filter((file) => file.notifyCustomer || file.uploadedByRole === 'CUSTOMER')

  logger.info('Order files fetched successfully', {
    orderId,
    totalFiles: files.length,
    visibleFiles: visibleFiles.length,
    userId: user.id,
    requestId: context.requestId,
  })

  return createSuccessResponse({
    files: visibleFiles,
    count: visibleFiles.length,
  })
})

// POST - Upload a new file
const uploadSchema = z.object({
  filename: z.string().min(1),
  fileUrl: z.string().url(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  fileType: z
    .enum(['CUSTOMER_ARTWORK', 'ADMIN_PROOF', 'PRODUCTION_FILE', 'REFERENCE', 'ATTACHMENT'])
    .default('CUSTOMER_ARTWORK'),
  label: z.string().optional(),
  approvalStatus: z.enum(['WAITING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED']).optional(),
  message: z.string().optional(), // Optional message with upload
})

export const POST = withApiHandler(
  async (request: NextRequest, context, params: { id: string }) => {
    const { user } = await validateRequest()
    const orderId = params.id

    if (!user) {
      throw ApiError.authentication()
    }

    // Parse and validate request body
    const body = await request.json()
    const data = uploadSchema.parse(body)

    // Verify order exists and user has access
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      throw ApiError.notFound('Order')
    }

    const isAdmin = user.role === 'ADMIN'
    const isOwner = user.email === order.email || (order.userId && order.userId === user.id)

    if (!isAdmin && !isOwner) {
      throw ApiError.authorization('You do not have access to this order')
    }

    // Enhanced file validation
    if (data.filename && data.fileSize && data.mimeType) {
      const { validateFileAdvanced } = await import('@/lib/security/advanced-file-validator')

      const validationResult = await validateFileAdvanced(
        data.filename,
        data.fileSize,
        data.mimeType,
        undefined, // No file content for URL-based uploads
        orderId
      )

      if (!validationResult.valid) {
        throw ApiError.fileUpload(validationResult.error!, {
          threatLevel: validationResult.threatLevel,
          warnings: validationResult.warnings,
        })
      }

      // Use sanitized filename
      data.filename = validationResult.sanitizedFilename || data.filename

      // Log security warnings
      if (validationResult.threatLevel && validationResult.threatLevel !== 'low') {
        logger.warn('File upload with security warnings', {
          filename: data.filename,
          threatLevel: validationResult.threatLevel,
          warnings: validationResult.warnings,
          orderId,
          userId: user.id,
          requestId: context.requestId,
        })
      }
    }

    // Determine upload role and approval status
    const uploadedByRole = isAdmin ? 'ADMIN' : 'CUSTOMER'
    const approvalStatus =
      data.approvalStatus || (uploadedByRole === 'ADMIN' ? 'WAITING' : 'NOT_REQUIRED')

    logger.info('Creating order file record', {
      orderId,
      filename: data.filename,
      fileType: data.fileType,
      uploadedByRole,
      approvalStatus,
      userId: user.id,
      requestId: context.requestId,
    })

    // Create the file record
    const orderFile = await prisma.orderFile.create({
      data: {
        orderId,
        filename: data.filename,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        thumbnailUrl: data.thumbnailUrl,
        fileType: data.fileType,
        label: data.label,
        approvalStatus,
        uploadedBy: user.id,
        uploadedByRole,
        notifyCustomer: uploadedByRole === 'ADMIN',
        notifyAdmin: uploadedByRole === 'CUSTOMER',
      },
    })

    // Add initial message if provided
    if (data.message) {
      await prisma.fileMessage.create({
        data: {
          orderFileId: orderFile.id,
          message: data.message,
          authorId: user.id,
          authorRole: isAdmin ? 'admin' : 'customer',
          authorName: user.name || user.email,
        },
      })
    }

    // Send email notification based on uploadedByRole
    try {
      if (
        uploadedByRole === 'ADMIN' &&
        data.fileType === 'ADMIN_PROOF' &&
        approvalStatus === 'WAITING'
      ) {
        // Admin uploaded a proof for customer approval - notify customer
        const { FileApprovalEmailService } = await import('@/lib/email/file-approval-email-service')
        const orderWithUser = await prisma.order.findUnique({
          where: { id: orderId },
          include: { User: { select: { name: true } } },
        })

        if (orderWithUser) {
          await FileApprovalEmailService.sendProofReadyNotification(
            {
              id: orderWithUser.id,
              orderNumber: orderWithUser.orderNumber,
              email: orderWithUser.email,
              User: orderWithUser.User,
            },
            {
              id: orderFile.id,
              label: orderFile.label || undefined,
              filename: orderFile.filename,
            },
            data.message
          )

          logger.info('Proof ready notification sent', {
            orderId,
            fileId: orderFile.id,
            customerEmail: orderWithUser.email,
            requestId: context.requestId,
          })
        }
      }
    } catch (emailError) {
      logger.error('Failed to send file upload email', {
        orderId,
        fileId: orderFile.id,
        error: emailError instanceof Error ? emailError.message : String(emailError),
        requestId: context.requestId,
      })
      // Don't fail the request if email fails
    }

    logger.info('File uploaded successfully', {
      orderId,
      fileId: orderFile.id,
      filename: data.filename,
      fileType: data.fileType,
      userId: user.id,
      requestId: context.requestId,
    })

    return createSuccessResponse(orderFile, 201, 'File uploaded successfully')
  },
  {
    validateSchema: uploadSchema,
    rateLimit: {
      keyPrefix: 'file_upload',
      maxRequests: 10,
      windowMs: 60 * 1000, // 1 minute
    },
  }
)
