import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { logger } from '@/lib/logger-safe'
import { z } from 'zod'

// Helper functions
async function getOrderNumber(orderId: string): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true },
  })
  return order?.orderNumber || orderId
}

async function getUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  })
  return user
}

const associateTempFilesSchema = z.object({
  tempFiles: z.array(
    z.object({
      fileId: z.string(),
      originalName: z.string(),
      size: z.number(),
      mimeType: z.string(),
      thumbnailUrl: z.string().optional(),
      isImage: z.boolean(),
    })
  ),
})

/**
 * POST /api/orders/[id]/files/associate-temp
 * Associate temporarily uploaded files with an order
 * Called after order creation to convert temporary uploads to OrderFile records
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params

    // Validate request
    const { user } = await validateRequest()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify order ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        email: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if user owns this order (user can be null for guest checkouts)
    if (order.userId && order.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const validated = associateTempFilesSchema.parse(body)

    if (validated.tempFiles.length === 0) {
      return NextResponse.json({ files: [] }, { status: 200 })
    }

    // Validate all files before creating records
    const { validateFile } = await import('@/lib/security/file-validator')

    for (const tempFile of validated.tempFiles) {
      const validationResult = await validateFile(
        tempFile.originalName,
        tempFile.size,
        tempFile.mimeType,
        orderId
      )

      if (!validationResult.valid) {
        return NextResponse.json(
          { error: `File "${tempFile.originalName}": ${validationResult.error}` },
          { status: 400 }
        )
      }
    }

    // Extract session ID from the first temp file path
    const sessionId =
      request.headers.get('x-session-id') ||
      `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create OrderFile records for each temporary upload (with sanitized filenames)
    const createdFiles = await Promise.all(
      validated.tempFiles.map(async (tempFile) => {
        const { sanitizeFilename } = await import('@/lib/security/file-validator')
        const sanitized = sanitizeFilename(tempFile.originalName)
        const filename = sanitized.valid ? sanitized.sanitizedFilename! : tempFile.originalName

        // Create the database record first with temporary URL
        const orderFile = await prisma.orderFile.create({
          data: {
            orderId: order.id,
            filename,
            fileUrl: `/api/upload/temporary/${tempFile.fileId}`, // Will be updated after migration
            fileSize: tempFile.size,
            mimeType: tempFile.mimeType,
            thumbnailUrl: tempFile.thumbnailUrl,
            fileType: 'CUSTOMER_ARTWORK', // Customer-uploaded artwork
            approvalStatus: 'NOT_REQUIRED', // Customer artwork doesn't need approval
            uploadedBy: user.id,
            uploadedByRole: 'CUSTOMER',
            isVisible: true,
            notifyAdmin: true, // Notify admin of new customer artwork
            notifyCustomer: false,
            metadata: {
              tempFileId: tempFile.fileId,
              sessionId: sessionId,
              migrationStatus: 'pending',
            },
          },
          include: {
            FileMessage: true,
          },
        })

        return orderFile
      })
    )

    // Migrate files to permanent storage
    try {
      const { FileMigrationService } = await import('@/lib/storage/file-migration')

      const migrationData = createdFiles.map((file) => ({
        fileId: (file.metadata as any)?.tempFileId || '',
        sessionId: (file.metadata as any)?.sessionId || sessionId,
        orderFileId: file.id,
        fileType: 'CUSTOMER_ARTWORK' as const,
      }))

      await FileMigrationService.migrateOrderFiles(order.id, migrationData)

      logger.info('Files migrated to permanent storage successfully', {
        orderId: order.id,
        fileCount: createdFiles.length,
      })
    } catch (migrationError) {
      logger.error('File migration failed, files remain in temporary storage', {
        orderId: order.id,
        error: migrationError instanceof Error ? migrationError.message : String(migrationError),
      })

      // Update file records to indicate migration failure
      await Promise.all(
        createdFiles.map((file) =>
          prisma.orderFile.update({
            where: { id: file.id },
            data: {
              metadata: {
                ...(file.metadata as any),
                migrationStatus: 'failed',
                migrationError:
                  migrationError instanceof Error ? migrationError.message : String(migrationError),
              },
            },
          })
        )
      )

      // Don't fail the request - files are still accessible via temporary URLs
      logger.warn('Continuing with temporary file URLs due to migration failure')
    }

    // Send email notification to admin about uploaded artwork
    try {
      const { FileApprovalEmailService } = await import('@/lib/email/file-approval-email-service')
      await FileApprovalEmailService.sendArtworkUploadedNotification(
        {
          id: order.id,
          orderNumber: await getOrderNumber(order.id),
          email: order.email,
          User: order.userId ? await getUserData(order.userId) : undefined,
        },
        createdFiles.map((f) => ({
          filename: f.filename,
          label: f.label || undefined,
        }))
      )
    } catch (emailError) {
      console.error('Failed to send artwork uploaded email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      files: createdFiles,
      message: `${createdFiles.length} file(s) associated with order`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error associating temporary files:', error)
    return NextResponse.json({ error: 'Failed to associate files with order' }, { status: 500 })
  }
}
