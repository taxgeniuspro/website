import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE /api/products/customer-images - Delete a customer uploaded image
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 })
    }

    // Find and delete the customer image
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

// GET /api/products/customer-images - Get customer images for a product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // Get customer uploaded images (those with high sort order)
    const images = await prisma.productImage.findMany({
      where: {
        productId,
        sortOrder: { gte: 999 }, // Customer images have high sort order
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      {
        success: true,
        images: images.map((img) => ({
          id: img.id,
          url: img.url,
          thumbnailUrl: img.thumbnailUrl,
          fileName: img.alt?.replace('Customer upload: ', '') || 'Uploaded file',
          fileSize: img.fileSize,
          uploadedAt: img.createdAt,
        })),
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
  }
}
