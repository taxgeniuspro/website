import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { randomUUID } from 'crypto'
import { type NextRequest } from 'next/server'
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limit'
import { ProductService } from '@/services/ProductService'
import { cache } from 'ioredis'
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createDatabaseErrorResponse,
  createAuthErrorResponse,
  generateRequestId,
} from '@/lib/api-response'
import { createProductSchema } from '@/lib/validation'
import { transformProductsForFrontend, transformProductForFrontend } from '@/lib/data-transformers'
import type { Product } from '@/types/product'

// GET /api/products - List all products
// TEMPORARY: Using old implementation until ProductService relation names are fixed
export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const isActive = searchParams.get('isActive')
    const gangRunEligible = searchParams.get('gangRunEligible')
    const includeSEOMetrics = searchParams.get('includeSEOMetrics') === 'true'

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100) // Max 100 items per page
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (categoryId) where.categoryId = categoryId
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }
    if (gangRunEligible !== null && gangRunEligible !== undefined) {
      where.gangRunEligible = gangRunEligible === 'true'
    }

    const totalCount = await prisma.product.count({ where })

    const products = await prisma.product.findMany({
      where,
      skip,
      take: limit,
      select: {
        // Basic product fields
        id: true,
        name: true,
        slug: true,
        sku: true,
        description: true,
        shortDescription: true,
        basePrice: true,
        setupFee: true,
        productionTime: true,
        rushAvailable: true,
        rushDays: true,
        rushFee: true,
        isActive: true,
        isFeatured: true,
        gangRunEligible: true,
        categoryId: true,
        createdAt: true,
        updatedAt: true,
        ...(includeSEOMetrics ? { seoMetrics: true } : {}),

        // Include only essential relations (max 2 levels deep)
        ProductCategory: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        ProductImage: {
          select: {
            id: true,
            imageId: true,
            isPrimary: true,
            sortOrder: true,
            Image: {
              select: {
                id: true,
                url: true,
                thumbnailUrl: true,
                alt: true,
                width: true,
                height: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        ProductPaperStockSet: {
          select: {
            id: true,
            paperStockSetId: true,
            isDefault: true,
            PaperStockSet: {
              select: {
                id: true,
                name: true,
                description: true,
                // Don't include deeply nested items for list view
              },
            },
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
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    })

    const responseTime = Date.now() - startTime

    // Transform to match frontend expectations (PascalCase property names)
    const transformedProducts = transformProductsForFrontend(products)

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return createSuccessResponse(
      transformedProducts,
      200,
      {
        count: transformedProducts.length,
        totalCount,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage,
        responseTime,
      },
      requestId
    )
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error(`[${requestId}] Database error:`, error)

    return createDatabaseErrorResponse(error, requestId)
  }
}

// POST /api/products - Create new product
export async function POST(request: NextRequest) {
  // Apply rate limiting for admin endpoints (using api preset instead of sensitive)
  const rateLimitResponse = await withRateLimit(request, {
    ...RateLimitPresets.api,
    prefix: 'products-create',
  })
  if (rateLimitResponse) return rateLimitResponse

  const requestId = generateRequestId()

  try {
    const { user, session } = await validateRequest()

    if (!session || !user || user.role !== 'ADMIN') {
      return createAuthErrorResponse('Admin access required', requestId)
    }

    let rawData
    try {
      rawData = await request.json()
    } catch (parseError) {
      return createErrorResponse('Invalid JSON request body', 400, undefined, requestId)
    }

    let data
    try {
      data = createProductSchema.parse(rawData)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error(
          `[${requestId}] Validation failed:`,
          JSON.stringify(
            {
              errors: validationError.issues,
              receivedData: rawData,
            },
            null,
            2
          )
        )
        return createValidationErrorResponse(validationError.issues, requestId)
      }
      return createErrorResponse('Data validation failed', 400, undefined, requestId)
    }

    const {
      name,
      sku,
      categoryId,
      description,
      shortDescription,
      isActive,
      isFeatured,
      images,
      paperStockSetId,
      quantityGroupId,
      sizeGroupId,
      selectedAddOns,
      turnaroundTimeSetId,
      addOnSetId,
      designSetId,
      productionTime,
      rushAvailable,
      rushDays,
      rushFee,
      basePrice,
      setupFee,
    } = data

    // Auto-generate SKU from product name if not provided
    const baseSku =
      sku ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    // Check for duplicate SKU and generate unique one if needed
    let uniqueSku = baseSku
    let skuCounter = 1
    while (true) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: uniqueSku },
        select: { id: true },
      })
      if (!existingSku) break
      uniqueSku = `${baseSku}-${skuCounter}`
      skuCounter++
      if (skuCounter > 100) {
        return createErrorResponse(
          'Unable to generate unique SKU after 100 attempts',
          400,
          undefined,
          requestId
        )
      }
    }

    // Generate slug from name and ensure it's unique
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    let uniqueSlug = baseSlug
    let slugCounter = 1
    while (true) {
      const existingSlug = await prisma.product.findUnique({
        where: { slug: uniqueSlug },
        select: { id: true },
      })
      if (!existingSlug) break
      uniqueSlug = `${baseSlug}-${slugCounter}`
      slugCounter++
      if (slugCounter > 100) {
        return createErrorResponse(
          'Unable to generate unique slug after 100 attempts',
          400,
          undefined,
          requestId
        )
      }
    }

    try {
      const [category, paperStockSet, quantityGroup, sizeGroup, addOns] = await Promise.all([
        prisma.productCategory.findUnique({ where: { id: categoryId } }),
        prisma.paperStockSet.findUnique({ where: { id: paperStockSetId } }),
        prisma.quantityGroup.findUnique({ where: { id: quantityGroupId } }),
        prisma.sizeGroup.findUnique({ where: { id: sizeGroupId } }),
        selectedAddOns.length > 0
          ? prisma.addOn.findMany({ where: { id: { in: selectedAddOns } } })
          : [],
      ])

      if (!category) {
        return createErrorResponse(`Category not found: ${categoryId}`, 400, null, requestId)
      }
      if (!paperStockSet) {
        return createErrorResponse(
          `Paper stock set not found: ${paperStockSetId}`,
          400,
          null,
          requestId
        )
      }
      if (!quantityGroup) {
        return createErrorResponse(
          `Quantity group not found: ${quantityGroupId}`,
          400,
          null,
          requestId
        )
      }
      if (!sizeGroup) {
        return createErrorResponse(`Size group not found: ${sizeGroupId}`, 400, null, requestId)
      }
      if (selectedAddOns.length > 0 && addOns.length !== selectedAddOns.length) {
        const missing = selectedAddOns.filter((id) => !addOns.find((ao) => ao.id === id))
        return createErrorResponse(`Add-ons not found: ${missing.join(', ')}`, 400, null, requestId)
      }
    } catch (validationError) {
      return createDatabaseErrorResponse(validationError, requestId)
    }

    // Create product with optimized transaction
    const product = await prisma.$transaction(
      async (tx) => {
        // Step 1: Create the base product first
        const newProduct = await tx.product.create({
          data: {
            id: randomUUID(),
            name,
            sku: uniqueSku,
            slug: uniqueSlug,
            categoryId,
            description,
            shortDescription,
            isActive,
            isFeatured,
            basePrice,
            setupFee,
            productionTime,
            rushAvailable,
            rushDays,
            rushFee,
            updatedAt: new Date(),
          },
        })

        // Step 2: Create relationships in parallel for better performance
        const relationshipPromises = []

        // Paper stock set (required)
        relationshipPromises.push(
          tx.productPaperStockSet.create({
            data: {
              id: randomUUID(),
              productId: newProduct.id,
              paperStockSetId: paperStockSetId,
              isDefault: true,
              updatedAt: new Date(),
            },
          })
        )

        // Quantity group (required)
        if (quantityGroupId) {
          relationshipPromises.push(
            tx.productQuantityGroup.create({
              data: {
                id: randomUUID(),
                productId: newProduct.id,
                quantityGroupId: quantityGroupId,
                updatedAt: new Date(),
              },
            })
          )
        }

        // Size group (required)
        if (sizeGroupId) {
          relationshipPromises.push(
            tx.productSizeGroup.create({
              data: {
                id: randomUUID(),
                productId: newProduct.id,
                sizeGroupId: sizeGroupId,
                updatedAt: new Date(),
              },
            })
          )
        }

        // Turnaround time set (optional)
        if (turnaroundTimeSetId) {
          relationshipPromises.push(
            tx.productTurnaroundTimeSet.create({
              data: {
                id: randomUUID(),
                productId: newProduct.id,
                turnaroundTimeSetId: turnaroundTimeSetId,
                isDefault: true,
                updatedAt: new Date(),
              },
            })
          )
        }

        // Add-on set (optional but preferred over individual add-ons)
        if (addOnSetId) {
          relationshipPromises.push(
            tx.productAddOnSet.create({
              data: {
                id: randomUUID(),
                productId: newProduct.id,
                addOnSetId: addOnSetId,
                isDefault: false,
                updatedAt: new Date(),
              },
            })
          )
        }

        // Design set (optional)
        if (designSetId) {
          relationshipPromises.push(
            tx.productDesignSet.create({
              data: {
                id: randomUUID(),
                productId: newProduct.id,
                designSetId: designSetId,
                isDefault: true,
                sortOrder: 1,
                updatedAt: new Date(),
              },
            })
          )
        }

        // Individual add-ons (optional, for backward compatibility)
        if (selectedAddOns.length > 0) {
          relationshipPromises.push(
            tx.productAddOn.createMany({
              data: selectedAddOns.map((addOnId: string) => ({
                id: randomUUID(),
                productId: newProduct.id,
                addOnId,
                updatedAt: new Date(),
              })),
            })
          )
        }

        // Images (optional) - Link existing images or create new ones
        if (images.length > 0) {
          for (let index = 0; index < images.length; index++) {
            const img = images[index]
            let imageId: string

            // Check if imageId exists (image already created by upload API)
            if (img.imageId) {
              // Image already exists, just use its ID
              imageId = img.imageId
            } else {
              // Create new Image record with required ID and updatedAt
              const newImageId = randomUUID()
              const image = await tx.image.create({
                data: {
                  id: newImageId,
                  name: `${uniqueSlug}-${Date.now()}-${index}`,
                  url: img.url,
                  thumbnailUrl: img.thumbnailUrl || img.url,
                  alt: img.alt || name,
                  width: img.width,
                  height: img.height,
                  fileSize: img.fileSize,
                  mimeType: img.mimeType,
                  category: 'product',
                  updatedAt: new Date(), // REQUIRED: Image table requires updatedAt field
                },
              })
              imageId = image.id
            }

            // Link image to product via ProductImage
            relationshipPromises.push(
              tx.productImage.create({
                data: {
                  id: randomUUID(),
                  productId: newProduct.id,
                  imageId: imageId,
                  sortOrder: img.sortOrder !== undefined ? img.sortOrder : index,
                  isPrimary: img.isPrimary !== undefined ? img.isPrimary : index === 0,
                  updatedAt: new Date(),
                },
              })
            )
          }
        }

        // Wait for all relationships to be created
        await Promise.all(relationshipPromises)

        // Return the complete product with all relationships
        return await tx.product.findUnique({
          where: { id: newProduct.id },
          include: {
            ProductCategory: true,
            ProductImage: true,
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
            ProductAddOn: {
              include: {
                AddOn: true,
              },
            },
          },
        })
      },
      {
        timeout: 45000, // FIX BUG #3: Increased from 15s to 45s for image processing
        maxWait: 5000, // Increased from 3s to 5s
      }
    )

    // Invalidate product and category caches after successful creation
    await cache.clearPattern('products:*')
    await cache.clearPattern('categories:*')

    // Transform product for frontend compatibility
    const transformedProduct = transformProductForFrontend(product)
    return createSuccessResponse(transformedProduct, 201, undefined, requestId)
  } catch (error) {
    // Handle transaction timeouts
    if ((error as any)?.name === 'TransactionTimeout') {
      return createErrorResponse(
        'Product creation timed out. Please try again.',
        408,
        { timeout: true },
        requestId
      )
    }

    return createDatabaseErrorResponse(error, requestId)
  }
}
