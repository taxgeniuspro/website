import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/products/[id]/vendor-address
 *
 * Returns the vendor's shipping address for a product
 * This address is used as the "ship from" address for FedEx rate calculations
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await params

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // Find the preferred vendor for this product
    const vendorProduct = await prisma.vendorProduct.findFirst({
      where: {
        productId,
        isPreferred: true,
        Vendor: {
          isActive: true,
        },
      },
      include: {
        Vendor: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    })

    // If no preferred vendor, try to find any active vendor for this product
    const vendor =
      vendorProduct?.Vendor ||
      (
        await prisma.vendorProduct.findFirst({
          where: {
            productId,
            Vendor: {
              isActive: true,
            },
          },
          include: {
            Vendor: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        })
      )?.Vendor

    if (!vendor || !vendor.address) {
      // No vendor found or vendor has no address - return null so default is used
      return NextResponse.json({
        productId,
        vendorId: null,
        vendorName: null,
        address: null,
      })
    }

    return NextResponse.json({
      productId,
      vendorId: vendor.id,
      vendorName: vendor.name,
      address: vendor.address,
    })
  } catch (error) {
    console.error('Error fetching vendor address:', error)
    return NextResponse.json({ error: 'Failed to fetch vendor address' }, { status: 500 })
  }
}
