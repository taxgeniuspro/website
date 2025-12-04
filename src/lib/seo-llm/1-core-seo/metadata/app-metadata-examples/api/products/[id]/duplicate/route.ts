import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

// POST /api/products/[id]/duplicate
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Fetch the original product with all relationships using SET architecture
    const originalProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        ProductCategory: true,
        ProductPaperStockSet: {
          include: {
            PaperStockSet: true,
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
        ProductAddOnSet: {
          include: {
            AddOnSet: true,
          },
        },
        ProductTurnaroundTimeSet: {
          include: {
            TurnaroundTimeSet: true,
          },
        },
        ProductDesignSet: {
          include: {
            DesignSet: true,
          },
        },
        ProductImage: {
          include: {
            Image: true,
          },
        },
      },
    })

    if (!originalProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Generate a unique SKU and slug
    const randomSuffix = Math.random().toString(36).substring(7)
    const newSku = `${originalProduct.sku}-COPY-${randomSuffix}`.toUpperCase()
    const newSlug = `${originalProduct.slug}-copy-${randomSuffix}`
    const newName = `${originalProduct.name} (Copy)`

    // Create the duplicated product
    const duplicatedProduct = await prisma.product.create({
      data: {
        id: randomUUID(),
        // Basic fields
        name: newName,
        slug: newSlug,
        sku: newSku,
        description: originalProduct.description,
        shortDescription: originalProduct.shortDescription,
        categoryId: originalProduct.categoryId,
        basePrice: originalProduct.basePrice,

        // Gang run fields
        gangRunEligible: originalProduct.gangRunEligible,

        // Rush order fields
        rushAvailable: originalProduct.rushAvailable,
        rushDays: originalProduct.rushDays,
        rushFee: originalProduct.rushFee,

        // Other fields
        setupFee: originalProduct.setupFee,
        productionTime: originalProduct.productionTime,

        // Set to inactive by default for review
        isActive: false,
        isFeatured: false,

        updatedAt: new Date(),

        // Copy paper stock sets
        ProductPaperStockSet:
          originalProduct.ProductPaperStockSet && originalProduct.ProductPaperStockSet.length > 0
            ? {
                create: originalProduct.ProductPaperStockSet.map((pss) => ({
                  id: randomUUID(),
                  paperStockSetId: pss.paperStockSetId,
                  isDefault: pss.isDefault,
                  updatedAt: new Date(),
                })),
              }
            : undefined,

        // Copy quantity groups
        ProductQuantityGroup:
          originalProduct.ProductQuantityGroup && originalProduct.ProductQuantityGroup.length > 0
            ? {
                create: originalProduct.ProductQuantityGroup.map((pqg) => ({
                  id: randomUUID(),
                  quantityGroupId: pqg.quantityGroupId,
                  updatedAt: new Date(),
                })),
              }
            : undefined,

        // Copy size groups
        ProductSizeGroup:
          originalProduct.ProductSizeGroup && originalProduct.ProductSizeGroup.length > 0
            ? {
                create: originalProduct.ProductSizeGroup.map((psg) => ({
                  id: randomUUID(),
                  sizeGroupId: psg.sizeGroupId,
                  updatedAt: new Date(),
                })),
              }
            : undefined,

        // Copy addon sets
        ProductAddOnSet:
          originalProduct.ProductAddOnSet && originalProduct.ProductAddOnSet.length > 0
            ? {
                create: originalProduct.ProductAddOnSet.map((pas) => ({
                  id: randomUUID(),
                  addOnSetId: pas.addOnSetId,
                  isDefault: pas.isDefault,
                  updatedAt: new Date(),
                })),
              }
            : undefined,

        // Copy turnaround time sets
        ProductTurnaroundTimeSet:
          originalProduct.ProductTurnaroundTimeSet &&
          originalProduct.ProductTurnaroundTimeSet.length > 0
            ? {
                create: originalProduct.ProductTurnaroundTimeSet.map((ptts) => ({
                  id: randomUUID(),
                  turnaroundTimeSetId: ptts.turnaroundTimeSetId,
                  isDefault: ptts.isDefault,
                  updatedAt: new Date(),
                })),
              }
            : undefined,

        // Copy design sets
        ProductDesignSet:
          originalProduct.ProductDesignSet && originalProduct.ProductDesignSet.length > 0
            ? {
                create: originalProduct.ProductDesignSet.map((pds) => ({
                  id: randomUUID(),
                  designSetId: pds.designSetId,
                  isDefault: pds.isDefault,
                  sortOrder: pds.sortOrder || 1,
                  updatedAt: new Date(),
                })),
              }
            : undefined,

        // Copy product images (reference same images)
        ProductImage:
          originalProduct.ProductImage && originalProduct.ProductImage.length > 0
            ? {
                create: originalProduct.ProductImage.map((img) => ({
                  id: randomUUID(),
                  imageId: img.imageId,
                  isPrimary: img.isPrimary,
                  sortOrder: img.sortOrder,
                  updatedAt: new Date(),
                })),
              }
            : undefined,
      },
      include: {
        ProductCategory: true,
        ProductPaperStockSet: {
          include: {
            PaperStockSet: true,
          },
        },
        ProductImage: {
          include: {
            Image: true,
          },
        },
        _count: {
          select: {
            ProductImage: true,
            ProductPaperStockSet: true,
            ProductQuantityGroup: true,
            ProductSizeGroup: true,
            ProductAddOnSet: true,
            ProductTurnaroundTimeSet: true,
            ProductDesignSet: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      product: duplicatedProduct,
      message: `Product duplicated successfully as "${newName}"`,
    })
  } catch (error) {
    console.error('Error duplicating product:', error)
    return NextResponse.json(
      {
        error: 'Failed to duplicate product',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
