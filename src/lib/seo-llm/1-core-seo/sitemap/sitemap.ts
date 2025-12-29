import { MetadataRoute } from 'next'
import { db } from '@/lib/db'

// TypeScript interfaces (replaces Prisma types)
interface ProductCategory {
  slug: string
  updatedAt: string
}

interface Product {
  slug: string
  updatedAt: string
}

interface City {
  slug: string
  updatedAt: string
  Product: Array<{ slug: string }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://gangrunprinting.com'

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/quote`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/help-center`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/locations`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/faq/business-cards`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/faq/flyers`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/track`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/upload`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ]

  // Get all active product categories
  const { data: categoriesData } = await db
    .from('product_categories')
    .select('slug, updatedAt')
    .eq('isActive', true)
    .eq('isHidden', false)

  const categories = (categoriesData || []) as ProductCategory[]

  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${baseUrl}/category/${category.slug}`,
    lastModified: new Date(category.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Get all active products
  const { data: productsData } = await db
    .from('products')
    .select('slug, updatedAt')
    .eq('isActive', true)

  const products = (productsData || []) as Product[]

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: new Date(product.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Get all city pages (if you have city-specific pages)
  const cityPages: MetadataRoute.Sitemap = []
  try {
    // Get cities and their active products
    const { data: citiesData } = await db
      .from('cities')
      .select('slug, updatedAt')
      .eq('isActive', true)

    const cities = (citiesData || []) as Array<{ slug: string; updatedAt: string }>

    // Get active products for city pages
    const { data: activeProductsData } = await db
      .from('products')
      .select('slug')
      .eq('isActive', true)

    const activeProducts = (activeProductsData || []) as Array<{ slug: string }>

    // Create city pages for each product-city combination
    cities.forEach((city) => {
      activeProducts.forEach((product) => {
        cityPages.push({
          url: `${baseUrl}/print/${product.slug}/${city.slug}`,
          lastModified: new Date(city.updatedAt),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })
      })
    })
  } catch {
    // City table might not exist or have no data
  }

  return [...staticPages, ...categoryPages, ...productPages, ...cityPages]
}
