import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ProductDetailClient from '@/components/product/product-detail-client'
// import { ComponentErrorBoundary } from '@/components/error-boundary'
import { type Metadata } from 'next'
import { generateAllProductSchemas } from '@/lib/schema-generators'
import { type PrismaProductImage } from '@/types/product'
import {
  getApprovedProductSEO,
  generateProductMetaTags,
} from '@/lib/seo-brain/generate-product-seo'
import { Breadcrumbs, BreadcrumbSchema } from '@/components/customer/breadcrumbs'

// Force dynamic rendering to prevent chunk loading issues
export const dynamic = 'force-dynamic'
export const revalidate = 0

// This is a SERVER COMPONENT - no 'use client' directive
// It fetches data on the server and avoids all JSON parsing issues

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params

  try {
    // Look up by slug or SKU
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ slug: slug }, { sku: slug }],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        shortDescription: true,
        seoMetaTitle: true,
        seoMetaDescription: true,
        ProductCategory: {
          select: {
            name: true,
          },
        },
        City: {
          select: {
            name: true,
            stateCode: true,
          },
        },
      },
    })

    if (!product) {
      return {
        title: 'Product Not Found | GangRun Printing',
        description: 'The product you are looking for could not be found.',
      }
    }

    // Try to use AI-generated meta tags if available
    try {
      const metaTags = await generateProductMetaTags({
        productName: product.name,
        productCategory: product.ProductCategory?.name,
        city: product.City?.name,
        state: product.City?.stateCode,
      })

      return {
        title: product.seoMetaTitle || metaTags.title,
        description: product.seoMetaDescription || metaTags.description,
        openGraph: {
          title: product.seoMetaTitle || metaTags.title,
          description: metaTags.ogDescription,
        },
      }
    } catch (aiError) {
      // Fallback to manual meta tags if AI generation fails
      console.warn('[SEO Brain] Failed to generate meta tags, using fallback:', aiError)
      return {
        title: product.seoMetaTitle || `${product.name} | GangRun Printing`,
        description:
          product.seoMetaDescription ||
          product.shortDescription ||
          product.description ||
          `Order ${product.name} from GangRun Printing`,
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Products | GangRun Printing',
      description: 'Browse our printing products',
    }
  }
}

// Validate slug format
function isValidSlug(slug: string): boolean {
  // Basic slug validation: alphanumeric with hyphens and underscores
  // Prevent excessively long slugs that might be attacks
  const slugRegex = /^[a-z0-9-_]{1,100}$/
  return slugRegex.test(slug)
}

async function getProduct(slug: string) {
  // Validate slug format to prevent potential issues
  if (!isValidSlug(slug)) {
    return null
  }

  try {
    // Try to find by slug first, then by SKU (for backward compatibility)
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ slug: slug }, { sku: slug }],
        isActive: true,
      },
      include: {
        ProductCategory: true,
        City: true, // Include city data for location-specific products
        ProductImage: {
          include: {
            Image: true,
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
      },
    })

    if (!product) {
      // Product not found for this slug
    } else {
      // Product successfully found
    }

    return product
  } catch (error) {
    // Error fetching product from database
    return null
  }
}

// Helper function to fetch product configuration - calls the API endpoint via HTTP
async function getProductConfiguration(productId: string) {
  try {
    // Use fetch to call the API endpoint
    // In Docker, use internal port; works in both dev and production
    const apiUrl = `http://localhost:3002/api/products/${productId}/configuration`

    const response = await fetch(apiUrl, {
      cache: 'no-store', // Don't cache during SSR
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('[ProductPage] API returned error status:', response.status)
      return null
    }

    const configuration = await response.json()

    return configuration
  } catch (error) {
    console.error('[ProductPage] Error fetching configuration:', error)
    return null
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  // Await params to fix Next.js 15 warning
  const { slug } = await params

  // Validate slug before processing
  if (!slug || typeof slug !== 'string') {
    notFound()
  }

  // Fetch product data on the server
  const product = await getProduct(slug)

  if (!product) {
    notFound()
  }

  // TEMPORARY FIX (Oct 18, 2025): Server-side fetch doesn't work in Docker (localhost:3002 unreachable)
  // Reverting to client-side fetch - component has robust fallback with 10s timeout
  // See: docs/CRITICAL-REACT-HYDRATION-FIX-2025-10-18.md
  const configuration = null

  // Try to get AI-generated SEO content (with timeout/fallback)
  let seoContent: string | null = null
  try {
    seoContent = await getApprovedProductSEO(
      product.id,
      product.City?.name,
      product.City?.stateCode
    )
  } catch (error) {
    console.warn('[ProductPage] Failed to fetch SEO content:', error)
  }

  // Transform the product data to match client component expectations
  // Add defensive checks for all nested data
  const transformedProduct = {
    ...product,
    id: product.id, // Explicitly include ID
    ProductCategory: product.ProductCategory || { id: '', name: 'Uncategorized' },
    // Transform ProductImage to flatten the nested Image data
    ProductImage: (product.ProductImage || []).map((pi) => ({
      id: pi.Image?.id || pi.id,
      url: pi.Image?.url || '',
      thumbnailUrl: pi.Image?.thumbnailUrl || pi.Image?.url || '',
      largeUrl: pi.Image?.largeUrl,
      mediumUrl: pi.Image?.mediumUrl,
      webpUrl: pi.Image?.webpUrl,
      blurDataUrl: pi.Image?.blurDataUrl,
      alt: pi.Image?.alt || `${product.name} product image`,
      isPrimary: pi.isPrimary || false,
      sortOrder: pi.sortOrder || 0,
      width: pi.Image?.width,
      height: pi.Image?.height,
      fileSize: pi.Image?.fileSize,
      mimeType: pi.Image?.mimeType,
    })),
    // Ensure all required fields have safe defaults
    basePrice: product.basePrice ?? 0,
    setupFee: product.setupFee ?? 0,
    productionTime: product.productionTime ?? 5,
    // Use AI-generated SEO content if available, otherwise fallback to database description
    description: seoContent || product.description || '',
    shortDescription: product.shortDescription || '',
  }

  // Serialize configuration to ensure it's JSON-compatible for client hydration
  const serializedConfiguration = configuration ? JSON.parse(JSON.stringify(configuration)) : null

  // Generate JSON-LD structured data for SEO and AI
  const schemas = generateAllProductSchemas(transformedProduct as any)

  // Build breadcrumbs
  const breadcrumbs = product.ProductCategory
    ? [
        {
          label: product.ProductCategory.name,
          href: `/category/${product.ProductCategory.slug}`,
        },
        { label: product.name, href: `/products/${product.slug}` },
      ]
    : [{ label: product.name, href: `/products/${product.slug}` }]

  // Pass the server-fetched data to the client component with error boundary
  return (
    <>
      {/* JSON-LD Schema Markup for SEO and AI Search */}
      {schemas.map((schema, index) => (
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          key={index}
          type="application/ld+json"
        />
      ))}

      {/* Breadcrumb Schema */}
      <BreadcrumbSchema items={breadcrumbs} />

      <div className="container mx-auto px-4 py-4">
        {/* Breadcrumbs Navigation */}
        <Breadcrumbs className="mb-6" items={breadcrumbs} />

        {/* Error boundary temporarily disabled for build */}
        <ProductDetailClient
          configuration={serializedConfiguration}
          product={transformedProduct as any}
        />
      </div>
    </>
  )
}
