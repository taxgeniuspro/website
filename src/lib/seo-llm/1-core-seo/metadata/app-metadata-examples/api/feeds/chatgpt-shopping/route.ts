/**
 * ChatGPT Shopping Feed API Endpoint
 *
 * Serves product feed in JSON format for ChatGPT Shopping / Agentic Commerce Protocol
 *
 * Endpoint: https://gangrunprinting.com/api/feeds/chatgpt-shopping
 * Format: JSON
 * Update Frequency: Every 15 minutes (via cron regeneration)
 *
 * This endpoint dynamically generates the feed on-demand for testing.
 * In production, it reads from a pre-generated static file for performance.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ChatGPT Product Feed Item Interface
interface ChatGPTProductFeedItem {
  id: string
  title: string
  description: string
  link: string
  price: string
  availability: 'in_stock' | 'out_of_stock' | 'preorder'
  image_link: string
  enable_search: boolean
  enable_checkout: boolean
  gtin?: string
  brand?: string
  product_category?: string
  sale_price?: string
  inventory_quantity?: number
  seller_name?: string
  condition?: 'new' | 'refurbished' | 'used'
  additional_image_links?: string[]
  product_type?: string
  google_product_category?: string
}

/**
 * GET /api/feeds/chatgpt-shopping
 *
 * Returns ChatGPT-compatible product feed
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '1000', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Fetch active products
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        // Exclude test products
        NOT: {
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { slug: { contains: 'test', mode: 'insensitive' } },
          ],
        },
      },
      include: {
        ProductCategory: true,
        ProductImage: {
          include: {
            Image: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Transform to ChatGPT feed format
    const feedItems: ChatGPTProductFeedItem[] = products.map((product) => {
      // Calculate base price (simplified)
      const basePrice = product.basePrice || 29.99

      // Get primary image
      const primaryImage = product.ProductImage.find((img) => img.isPrimary)
      const imageUrl = primaryImage?.Image?.url
        ? `https://gangrunprinting.com${primaryImage.Image.url}`
        : 'https://gangrunprinting.com/images/product-placeholder.jpg'

      // Get additional images
      const additionalImages = product.ProductImage.filter(
        (img) => !img.isPrimary && img.Image?.url
      )
        .slice(0, 9)
        .map((img) => `https://gangrunprinting.com${img.Image.url}`)

      // Build description
      const description =
        product.description ||
        product.shortDescription ||
        `High-quality ${product.name} from GangRun Printing. Professional printing services with fast turnaround times and competitive pricing.`

      const feedItem: ChatGPTProductFeedItem = {
        // Required fields
        id: product.id,
        title: product.name.substring(0, 150),
        description: description.substring(0, 5000), // Max 5000 chars
        link: `https://gangrunprinting.com/products/${product.slug}`,
        price: `${basePrice.toFixed(2)} USD`,
        availability: 'in_stock',
        image_link: imageUrl,
        enable_search: true,
        enable_checkout: false, // Enable when Instant Checkout is implemented

        // Recommended fields
        brand: 'GangRun Printing',
        product_category: product.ProductCategory?.name || 'Printing Services',
        seller_name: 'GangRun Printing',
        condition: 'new',
        product_type: product.ProductCategory?.name || 'Custom Printing',
        google_product_category: 'Business & Industrial > Printing & Graphic Design',
      }

      // Add additional images if available
      if (additionalImages.length > 0) {
        feedItem.additional_image_links = additionalImages
      }

      // Add sale price from metadata if available
      if (product.metadata && typeof product.metadata === 'object') {
        const metadata = product.metadata as any
        if (metadata.salePrice) {
          feedItem.sale_price = `${metadata.salePrice} USD`
        }
      }

      return feedItem
    })

    // Return JSON feed with proper headers
    return NextResponse.json(feedItems, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=900, s-maxage=900', // Cache for 15 minutes
        'X-Feed-Generated': new Date().toISOString(),
        'X-Total-Products': feedItems.length.toString(),
      },
    })
  } catch (error) {
    console.error('[ChatGPT Feed API] Error generating feed:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate product feed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * HEAD /api/feeds/chatgpt-shopping
 *
 * Returns metadata about the feed
 */
export async function HEAD(request: Request) {
  try {
    const productCount = await prisma.product.count({
      where: { isActive: true },
    })

    return new Response(null, {
      headers: {
        'X-Total-Products': productCount.toString(),
        'X-Feed-Format': 'JSON',
        'X-Feed-Version': '1.0',
        'X-Last-Updated': new Date().toISOString(),
        'Cache-Control': 'public, max-age=900',
      },
    })
  } catch (error) {
    return new Response(null, { status: 500 })
  }
}
