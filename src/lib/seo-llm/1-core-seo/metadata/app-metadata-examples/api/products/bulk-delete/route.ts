import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteProductImage } from '@/lib/minio-products'
import { validateRequest } from '@/lib/auth'
import { createSuccessResponse, createDatabaseErrorResponse } from '@/lib/api-response'

// POST /api/products/bulk-delete - Delete multiple products
export async function POST(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()
    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productIds } = await request.json()

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'Product IDs array is required' }, { status: 400 })
    }

    // Fetch all products to get their images for deletion
    const productsToDelete = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      include: {
        ProductImage: true,
      },
    })

    // Delete all product images from MinIO
    for (const product of productsToDelete) {
      if (product.productImages && product.productImages.length > 0) {
        for (const image of product.productImages) {
          try {
            await deleteProductImage(image.storageKey)
          } catch (error) {
            console.error(`Failed to delete image ${image.storageKey}:`, error)
            // Continue with deletion even if image cleanup fails
          }
        }
      }
    }

    // Delete products (cascade will handle related records)
    const result = await prisma.product.deleteMany({
      where: {
        id: { in: productIds },
      },
    })

    return createSuccessResponse({
      deleted: result.count,
      message: `Successfully deleted ${result.count} product${result.count > 1 ? 's' : ''}`,
    })
  } catch (error) {
    console.error('Bulk delete error:', error)
    return createDatabaseErrorResponse(error)
  }
}
