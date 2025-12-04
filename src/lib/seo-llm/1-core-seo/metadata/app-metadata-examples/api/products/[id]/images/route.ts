import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import {
  createSuccessResponse,
  createErrorResponse,
  createAuthErrorResponse,
  generateRequestId,
} from '@/lib/api-response'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// GET /api/products/[id]/images - Get all images for a product
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await validateRequest()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Get product images with image details
    const productImages = await prisma.productImage.findMany({
      where: { productId: params.id },
      include: {
        Image: true,
      },
      orderBy: [
        { isPrimary: 'desc' }, // Primary images first
        { sortOrder: 'asc' }, // Then by sort order
        { createdAt: 'asc' }, // Then by creation date
      ],
    })

    // Transform to include both relationship data and image data
    const imagesWithDetails = productImages.map((pi) => ({
      // Product-Image relationship fields
      id: pi.id,
      productId: pi.productId,
      imageId: pi.imageId,
      isPrimary: pi.isPrimary,
      sortOrder: pi.sortOrder,
      createdAt: pi.createdAt,
      updatedAt: pi.updatedAt,
      // Image details
      image: pi.Image,
    }))

    return NextResponse.json(imagesWithDetails)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch product images' }, { status: 500 })
  }
}

// POST /api/products/[id]/images - Attach an image to a product
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = generateRequestId()

  try {
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return createAuthErrorResponse('Admin access required', requestId)
    }

    const body = await request.json()
    const { imageId, isPrimary, sortOrder } = body

    if (!imageId) {
      return createErrorResponse('Image ID is required', 400, undefined, requestId)
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    })

    if (!product) {
      return createErrorResponse('Product not found', 404, undefined, requestId)
    }

    // Check if image exists
    const image = await prisma.image.findUnique({
      where: { id: imageId },
    })

    if (!image) {
      return createErrorResponse('Image not found', 404, undefined, requestId)
    }

    // Check if relationship already exists
    const existingRelation = await prisma.productImage.findFirst({
      where: {
        productId: params.id,
        imageId: imageId,
      },
    })

    if (existingRelation) {
      return createErrorResponse(
        'Image is already attached to this product',
        400,
        undefined,
        requestId
      )
    }

    // Check image limit (maximum 4 images per product)
    const currentImageCount = await prisma.productImage.count({
      where: { productId: params.id },
    })

    if (currentImageCount >= 4) {
      return createErrorResponse(
        'Maximum 4 images allowed per product',
        400,
        { imageLimit: true },
        requestId
      )
    }

    // If this is marked as primary, unset other primary images
    if (isPrimary) {
      await prisma.productImage.updateMany({
        where: { productId: params.id, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    // Create the relationship
    const productImage = await prisma.productImage.create({
      data: {
        id: randomUUID(),
        productId: params.id,
        imageId: imageId,
        isPrimary: isPrimary || currentImageCount === 0, // First image becomes primary
        sortOrder: sortOrder || currentImageCount + 1,
        updatedAt: new Date(),
      },
      include: {
        Image: true,
      },
    })

    return createSuccessResponse(
      {
        id: productImage.id,
        productId: productImage.productId,
        imageId: productImage.imageId,
        isPrimary: productImage.isPrimary,
        sortOrder: productImage.sortOrder,
        createdAt: productImage.createdAt,
        updatedAt: productImage.updatedAt,
        image: productImage.Image,
      },
      201,
      undefined,
      requestId
    )
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return createErrorResponse(
        'Image is already attached to this product',
        400,
        undefined,
        requestId
      )
    }

    return createErrorResponse(
      'Failed to attach image to product',
      500,
      { attachError: true },
      requestId
    )
  }
}

// DELETE /api/products/[id]/images - Detach an image from a product
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = generateRequestId()

  try {
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return createAuthErrorResponse('Admin access required', requestId)
    }

    const searchParams = request.nextUrl.searchParams
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return createErrorResponse('Image ID is required', 400, undefined, requestId)
    }

    // Check if relationship exists
    const productImage = await prisma.productImage.findFirst({
      where: {
        productId: params.id,
        imageId: imageId,
      },
    })

    if (!productImage) {
      return createErrorResponse('Image is not attached to this product', 404, undefined, requestId)
    }

    // Delete the relationship
    await prisma.productImage.delete({
      where: { id: productImage.id },
    })

    // If we deleted the primary image, make the first remaining image primary
    if (productImage.isPrimary) {
      const firstRemainingImage = await prisma.productImage.findFirst({
        where: { productId: params.id },
        orderBy: { sortOrder: 'asc' },
      })

      if (firstRemainingImage) {
        await prisma.productImage.update({
          where: { id: firstRemainingImage.id },
          data: { isPrimary: true },
        })
      }
    }

    return createSuccessResponse(
      {
        message: 'Image detached from product successfully',
        productId: params.id,
        imageId: imageId,
      },
      200,
      null,
      requestId
    )
  } catch (error) {
    return createErrorResponse(
      'Failed to detach image from product',
      500,
      { detachError: true },
      requestId
    )
  }
}
