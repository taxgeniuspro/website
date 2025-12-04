import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { z } from 'zod'

// GET - Get single file details
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

    const isAdmin = user?.role === 'ADMIN'
    const isOwner = user?.email === order.email

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const file = await prisma.orderFile.findUnique({
      where: { id: fileId },
      include: {
        FileMessage: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!file || file.orderId !== orderId) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Check visibility permissions
    if (!isAdmin && !file.notifyCustomer && file.uploadedByRole !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json(file)
  } catch (error) {
    console.error('Error fetching file:', error)
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 })
  }
}

// PATCH - Update file details
const updateSchema = z.object({
  label: z.string().optional(),
  approvalStatus: z.enum(['WAITING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED']).optional(),
  isVisible: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const { user } = await validateRequest()
    const { id: orderId, fileId } = params

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const body = await request.json()
    const data = updateSchema.parse(body)

    // Only admins can change visibility
    if (data.isVisible !== undefined && !isAdmin) {
      delete data.isVisible
    }

    const updatedFile = await prisma.orderFile.update({
      where: { id: fileId },
      data,
    })

    return NextResponse.json(updatedFile)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating file:', error)
    return NextResponse.json({ error: 'Failed to update file' }, { status: 500 })
  }
}

// DELETE - Delete file
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const { user } = await validateRequest()
    const { id: orderId, fileId } = params

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Verify file belongs to order
    const file = await prisma.orderFile.findUnique({
      where: { id: fileId },
    })

    if (!file || file.orderId !== orderId) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Only allow deleting own files for customers
    if (!isAdmin && file.uploadedBy !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete file and associated messages (cascade)
    await prisma.orderFile.delete({
      where: { id: fileId },
    })

    // TODO: Delete actual file from MinIO storage

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}
