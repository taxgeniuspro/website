import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { deleteProductImage } from '@/lib/minio-products'
import {
  createSuccessResponse,
  createErrorResponse,
  createAuthErrorResponse,
  generateRequestId,
} from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET /api/images/[id] - Get a single image
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const image = await prisma.image.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            ProductImage: true,
          },
        },
        ProductImage: {
          include: {
            Product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    })

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    return NextResponse.json(image)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
  }
}

// PUT /api/images/[id] - Update an image
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = generateRequestId()

  try {
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return createAuthErrorResponse('Admin access required', requestId)
    }

    const body = await request.json()
    const { name, description, alt, category, tags } = body

    // Validation
    if (!name) {
      return createErrorResponse('Name is required', 400, undefined, requestId)
    }

    // Check if image exists
    const existingImage = await prisma.image.findUnique({
      where: { id: params.id },
    })

    if (!existingImage) {
      return createErrorResponse('Image not found', 404, undefined, requestId)
    }

    // Update image
    const updatedImage = await prisma.image.update({
      where: { id: params.id },
      data: {
        name,
        description: description || null,
        alt: alt || name,
        category: category || 'general',
        tags: tags
          ? Array.isArray(tags)
            ? tags
            : tags
                .split(',')
                .map((t: string) => t.trim())
                .filter(Boolean)
          : [],
        updatedAt: new Date(),
      },
      include: {
        _count: {
          select: {
            ProductImage: true,
          },
        },
      },
    })

    return createSuccessResponse(updatedImage, 200, undefined, requestId)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return createErrorResponse(
        'An image with this name already exists',
        400,
        undefined,
        requestId
      )
    }

    return createErrorResponse('Failed to update image', 500, { updateError: true }, requestId)
  }
}

// DELETE /api/images/[id] - Delete an image
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = generateRequestId()

  try {
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return createAuthErrorResponse('Admin access required', requestId)
    }

    // Check if image exists and get usage info
    const image = await prisma.image.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            ProductImage: true,
          },
        },
        ProductImage: {
          include: {
            Product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!image) {
      return createErrorResponse('Image not found', 404, undefined, requestId)
    }

    // Check if image is in use
    if (image._count.ProductImage > 0) {
      const productNames = image.ProductImage.map((pi: any) => pi.Product.name).join(', ')
      return createErrorResponse(
        `Cannot delete image. It is currently used by ${image._count.ProductImage} product(s): ${productNames}`,
        400,
        {
          inUse: true,
          usageCount: image._count.ProductImage,
          products: image.ProductImage.map((pi: any) => ({
            id: pi.Product.id,
            name: pi.Product.name,
          })),
        },
        requestId
      )
    }

    // Delete from storage (attempt, but don't fail if it doesn't work)
    try {
      // Extract object names from URLs for deletion
      const urlToObjectName = (url: string) => {
        const match = url.match(/\/([^\/]+\/)([^\/]+)$/)
        return match ? `${match[1]}${match[2]}` : null
      }

      if (image.url) {
        const objectName = urlToObjectName(image.url)
        if (objectName) {
          await deleteProductImage(objectName)
        }
      }
    } catch (storageError) {
      // Log error but continue with database deletion
      console.warn('Failed to delete image from storage:', storageError)
    }

    // Delete from database
    await prisma.image.delete({
      where: { id: params.id },
    })

    return createSuccessResponse(
      {
        message: 'Image deleted successfully',
        id: params.id,
      },
      200,
      undefined,
      requestId
    )
  } catch (error) {
    return createErrorResponse('Failed to delete image', 500, { deleteError: true }, requestId)
  }
}
