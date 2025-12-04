import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteProductImage } from '@/lib/minio-products'
import { validateRequest } from '@/lib/auth'
import { transformProductForFrontend } from '@/lib/data-transformers'
import { randomUUID } from 'crypto'
import {
  createSuccessResponse,
  createNotFoundErrorResponse,
  createDatabaseErrorResponse,
} from '@/lib/api-response'

// GET /api/products/[id] - Get single product
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        ProductCategory: true,
        ProductImage: {
          include: {
            Image: true, // Include the Image relation to get URLs
          },
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
        ProductAddOnSet: {
          include: {
            AddOnSet: true,
          },
        },
        ProductTurnaroundTimeSet: {
          include: {
            TurnaroundTimeSet: {
              include: {
                TurnaroundTimeSetItem: {
                  include: {
                    TurnaroundTime: true,
                  },
                },
              },
            },
          },
        },
        ProductOption: {
          include: {
            OptionValue: {
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        PricingTier: {
          orderBy: { minQuantity: 'asc' },
        },
      },
    })

    if (!product) {
      return createNotFoundErrorResponse('Product')
    }

    // Transform for frontend compatibility
    const transformedProduct = transformProductForFrontend(product)
    return createSuccessResponse(transformedProduct)
  } catch (error) {
    return createDatabaseErrorResponse(error)
  }
}

// PUT /api/products/[id] - Update product
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const { user, session } = await validateRequest()
    //   hasSession: !!session,
    //   hasUser: !!user,
    //   role: user?.role,
    // })

    if (!session || !user || user.role !== 'ADMIN') {
      console.error('[PUT Product] Unauthorized:', {
        session: !!session,
        user: !!user,
        role: user?.role,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    //   hasImages: !!data.images,
    //   paperStockSetId: data.paperStockSetId,
    //   quantityGroupId: data.quantityGroupId,
    //   sizeGroupId: data.sizeGroupId,
    //   turnaroundTimeSetId: data.turnaroundTimeSetId,
    //   addOnSetId: data.addOnSetId,
    //   name: data.name,
    //   sku: data.sku,
    // })

    const {
      images,
      paperStockSetId,
      quantityGroupId,
      sizeGroupId,
      turnaroundTimeSetId,
      addOnSetId,
      designSetId,
      options,
      pricingTiers,
      ...rest
    } = data

    // Only include valid Product model fields
    const productData = {
      name: rest.name,
      sku: rest.sku,
      slug: rest.slug || rest.sku?.toLowerCase().replace(/\s+/g, '-'),
      categoryId: rest.categoryId,
      description: rest.description,
      shortDescription: rest.shortDescription,
      basePrice: rest.basePrice,
      setupFee: rest.setupFee,
      isActive: rest.isActive,
      isFeatured: rest.isFeatured,
      productionTime: rest.productionTime,
      rushAvailable: rest.rushAvailable,
      rushDays: rest.rushDays,
      rushFee: rest.rushFee,
      updatedAt: new Date(),
    }

    // Get existing product to compare images
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        ProductImage: {
          include: {
            Image: true, // Include Image relation to get URLs
          },
        },
        ProductPaperStockSet: true,
        ProductQuantityGroup: true,
        ProductSizeGroup: true,
        ProductTurnaroundTimeSet: true,
        ProductAddOnSet: true,
        ProductOption: {
          include: {
            OptionValue: true,
          },
        },
        PricingTier: true,
      },
    })

    if (!existingProduct) {
      console.error('[PUT Product] Product not found:', id)
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Delete removed images from MinIO
    const existingImageUrls = existingProduct.ProductImage.map((img) => img.Image.url)
    const newImageUrls = images?.map((img: Record<string, unknown>) => img.url) || []
    const imagesToDelete = existingImageUrls.filter((url) => !newImageUrls.includes(url))

    for (const url of imagesToDelete) {
      try {
        await deleteProductImage(url)
      } catch (error) {
        console.error('[PUT Product] Failed to delete image from MinIO:', error)
      }
    }

    // Update product using transaction
    const product = await prisma.$transaction(async (tx) => {
      // Delete existing relations
      await tx.productImage.deleteMany({ where: { productId: id } })
      await tx.productPaperStockSet.deleteMany({ where: { productId: id } })
      await tx.productQuantityGroup.deleteMany({ where: { productId: id } })
      await tx.productSizeGroup.deleteMany({ where: { productId: id } })
      await tx.productTurnaroundTimeSet.deleteMany({ where: { productId: id } })
      await tx.productAddOnSet.deleteMany({ where: { productId: id } })
      await tx.productOption.deleteMany({ where: { productId: id } })
      await tx.pricingTier.deleteMany({ where: { productId: id } })

      // Update product with new data
      return await tx.product.update({
        where: { id },
        data: {
          ...productData,
          // Recreate images - handle both imageId (existing) and full image data (new)
          ProductImage:
            images?.length > 0
              ? {
                  create: await Promise.all(
                    images.map(async (img: any, index: number) => {
                      // If imageId is provided, use it directly
                      if (img.imageId || img.id) {
                        return {
                          id: randomUUID(),
                          imageId: img.imageId || img.id,
                          sortOrder: index,
                          isPrimary: img.isPrimary || false,
                          updatedAt: new Date(),
                        }
                      }

                      // Otherwise, create a new Image record first
                      const newImage = await tx.image.create({
                        data: {
                          id: randomUUID(),
                          name: img.name || `product-${id}-${index}`,
                          url: img.url,
                          thumbnailUrl: img.thumbnailUrl,
                          largeUrl: img.largeUrl,
                          mediumUrl: img.mediumUrl,
                          webpUrl: img.webpUrl,
                          blurDataUrl: img.blurDataUrl,
                          alt: img.alt,
                          width: img.width,
                          height: img.height,
                          fileSize: img.fileSize,
                          mimeType: img.mimeType,
                          category: 'product',
                          updatedAt: new Date(),
                        },
                      })

                      return {
                        id: randomUUID(),
                        imageId: newImage.id,
                        sortOrder: index,
                        isPrimary: img.isPrimary || false,
                        updatedAt: new Date(),
                      }
                    })
                  ),
                }
              : undefined,
          // Recreate paper stock set association
          ProductPaperStockSet: paperStockSetId
            ? {
                create: {
                  id: randomUUID(),
                  paperStockSetId: paperStockSetId,
                  isDefault: true,
                  updatedAt: new Date(),
                },
              }
            : undefined,
          // Recreate quantity group association
          ProductQuantityGroup: quantityGroupId
            ? {
                create: {
                  id: randomUUID(),
                  quantityGroupId: quantityGroupId,
                  updatedAt: new Date(),
                },
              }
            : undefined,
          // Recreate size group association
          ProductSizeGroup: sizeGroupId
            ? {
                create: {
                  id: randomUUID(),
                  sizeGroupId: sizeGroupId,
                  updatedAt: new Date(),
                },
              }
            : undefined,
          // Recreate turnaround time set association
          ProductTurnaroundTimeSet: turnaroundTimeSetId
            ? {
                create: {
                  id: randomUUID(),
                  turnaroundTimeSetId: turnaroundTimeSetId,
                  isDefault: true,
                  updatedAt: new Date(),
                },
              }
            : undefined,
          // Recreate addon set association
          ProductAddOnSet: addOnSetId
            ? {
                create: {
                  id: randomUUID(),
                  addOnSetId: addOnSetId,
                  isDefault: true,
                  updatedAt: new Date(),
                },
              }
            : undefined,
          // Recreate options with values
          ProductOption:
            options?.length > 0
              ? {
                  create: options.map((opt: Record<string, unknown>, index: number) => ({
                    name: opt.name,
                    type: opt.type,
                    required: opt.required,
                    sortOrder: index,
                    OptionValue: {
                      create: ((opt.values as any[]) || []).map(
                        (val: Record<string, unknown>, valIndex: number) => ({
                          value: val.value,
                          label: val.label,
                          additionalPrice: val.additionalPrice,
                          isDefault: val.isDefault,
                          sortOrder: valIndex,
                        })
                      ),
                    },
                  })),
                }
              : undefined,
          // Recreate pricing tiers
          PricingTier:
            pricingTiers?.length > 0
              ? {
                  create: pricingTiers.map((tier: Record<string, unknown>) => ({
                    minQuantity: tier.minQuantity,
                    maxQuantity: tier.maxQuantity,
                    pricePerUnit: tier.pricePerUnit,
                    discountPercentage: tier.discountPercentage,
                  })),
                }
              : undefined,
        },
        include: {
          ProductCategory: true,
          ProductImage: {
            include: {
              Image: true,
            },
          },
          ProductPaperStockSet: {
            include: {
              PaperStockSet: {
                include: {
                  PaperStockSetItem: {
                    include: {
                      PaperStock: true,
                    },
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
          ProductTurnaroundTimeSet: {
            include: {
              TurnaroundTimeSet: {
                include: {
                  TurnaroundTimeSetItem: {
                    include: {
                      TurnaroundTime: true,
                    },
                  },
                },
              },
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
                  },
                },
              },
            },
          },
          ProductOption: {
            include: {
              OptionValue: true,
            },
          },
          PricingTier: true,
        },
      })
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('[PUT Product] Error occurred:', error)

    // Check for Prisma unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const prismaError = error as any
      const field = prismaError.meta?.target?.[0]
      console.error('[PUT Product] Unique constraint violation:', field)
      return NextResponse.json(
        { error: `A product with this ${field} already exists` },
        { status: 400 }
      )
    }

    // Log the full error for debugging
    console.error('[PUT Product] Full error details:', error)

    // Return error response
    const errorMessage = error instanceof Error ? error.message : 'Failed to update product'
    return NextResponse.json(
      {
        error: 'Failed to update product',
        details: errorMessage,
        debug: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 }
    )
  }
}

// PATCH /api/products/[id] - Simple update product (for toggles, etc.)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { user, session } = await validateRequest()
    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Update product with simple fields
    const product = await prisma.product.update({
      where: { id },
      data,
      include: {
        ProductCategory: true,
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { user, session } = await validateRequest()
    //   hasSession: !!session,
    //   hasUser: !!user,
    //   role: user?.role,
    // })

    if (!session || !user || user.role !== 'ADMIN') {
      console.error('[DELETE Product] Unauthorized attempt:', {
        session: !!session,
        user: !!user,
        role: user?.role,
      })
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    // Get product with images to delete from MinIO
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        ProductImage: {
          include: {
            Image: true,
          },
        },
      },
    })

    if (!product) {
      console.error('[DELETE Product] Product not found:', id)
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Delete images from MinIO
    for (const image of product.ProductImage) {
      try {
        await deleteProductImage(image.Image.url)
      } catch (error) {
        console.error('[DELETE Product] Failed to delete image from MinIO:', error)
      }
    }

    // Delete product (cascade will handle relations)
    await prisma.product.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Product deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('[DELETE Product] Error deleting product:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error: 'Failed to delete product',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
