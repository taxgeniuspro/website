import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/products/by-slug/[slug] - Get product by slug or SKU with all related data
export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    // Look up by slug OR SKU
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ slug: params.slug }, { sku: params.slug }],
        isActive: true,
      },
      include: {
        ProductCategory: true,
        ProductImage: {
          orderBy: { sortOrder: 'asc' },
        },
        ProductPaperStockSet: {
          include: {
            PaperStockSet: {
              include: {
                PaperStockSetItem: {
                  include: {
                    PaperStock: true,
                  },
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
        ProductQuantityGroup: {
          include: {
            QuantityGroup: true,
          },
        },
        ProductSizeGroup: {
          include: {
            SizeGroup: true,
          },
        },
        productAddOns: {
          include: {
            AddOn: true,
          },
        },
        ProductAddOnSet: {
          include: {
            AddOnSet: {
              include: {
                AddOnSetItem: {
                  include: {
                    AddOn: true,
                  },
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(
      {
        success: true,
        product,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}
