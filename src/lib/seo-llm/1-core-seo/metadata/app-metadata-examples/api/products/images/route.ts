import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/products/images?productId=... - Get all images for a product
export async function GET(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()
    if (!session || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({ images }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
  }
}

// PUT /api/products/images - Update image metadata (alt, caption, primary, sortOrder)
export async function PUT(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()
    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { imageId, alt, caption, isPrimary, sortOrder } = body

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 })
    }

    // If setting as primary, unset other primary images for this product
    if (isPrimary) {
      const image = await prisma.productImage.findUnique({
        where: { id: imageId },
        select: { productId: true },
      })

      if (image) {
        await prisma.productImage.updateMany({
          where: {
            productId: image.productId,
            id: { not: imageId },
          },
          data: { isPrimary: false },
        })
      }
    }

    const updatedImage = await prisma.productImage.update({
      where: { id: imageId },
      data: {
        ...(alt !== undefined && { alt }),
        ...(caption !== undefined && { caption }),
        ...(isPrimary !== undefined && { isPrimary }),
        ...(sortOrder !== undefined && { sortOrder }),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(
      {
        image: updatedImage,
        success: true,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update image' }, { status: 500 })
  }
}

// DELETE /api/products/images - Delete an image
export async function DELETE(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()
    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 })
    }

    // Get image details before deletion
    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
    })

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // Delete from database
    await prisma.productImage.delete({
      where: { id: imageId },
    })

    // If deleted image was primary, make first remaining image primary
    if (image.isPrimary) {
      const firstImage = await prisma.productImage.findFirst({
        where: { productId: image.productId },
        orderBy: { sortOrder: 'asc' },
      })

      if (firstImage) {
        await prisma.productImage.update({
          where: { id: firstImage.id },
          data: { isPrimary: true },
        })
      }
    }

    // TODO: Also delete from MinIO storage
    // await deleteProductImage(image.objectName)

    return NextResponse.json(
      {
        success: true,
        deletedImageId: imageId,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
  }
}
