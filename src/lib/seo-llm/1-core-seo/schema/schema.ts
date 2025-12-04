/**
 * SEO Schema.org Helper Functions
 * Generates JSON-LD structured data for SEO and LLM optimization
 */

export interface BreadcrumbItem {
  name: string
  url: string
}

export interface Product {
  id: string
  name: string
  description?: string
  imageUrl?: string
  price: number
  sku?: string
  category?: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  imageUrl?: string
  productCount?: number
}

/**
 * Generate BreadcrumbList schema
 * @see https://schema.org/BreadcrumbList
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * Generate CollectionPage schema for category pages
 * @see https://schema.org/CollectionPage
 */
export function generateCategorySchema(category: Category, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category.name,
    description: category.description || `Browse ${category.name} products`,
    url: `${baseUrl}/category/${category.slug}`,
    ...(category.imageUrl && { image: category.imageUrl }),
    ...(category.productCount && {
      numberOfItems: category.productCount,
    }),
  }
}

/**
 * Generate Product schema
 * @see https://schema.org/Product
 */
export function generateProductSchema(product: Product, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    ...(product.description && { description: product.description }),
    ...(product.imageUrl && { image: product.imageUrl }),
    ...(product.sku && { sku: product.sku }),
    offers: {
      '@type': 'Offer',
      price: product.price.toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${baseUrl}/products/${product.id}`,
    },
  }
}

/**
 * Generate Organization schema for homepage
 * @see https://schema.org/Organization
 */
export function generateOrganizationSchema(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'GangRun Printing',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: 'Professional printing services for business cards, flyers, brochures, and more',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'US',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      email: 'support@gangrunprinting.com',
    },
    sameAs: [
      // Add social media URLs here when available
    ],
  }
}

/**
 * Generate WebSite schema with search action
 * @see https://schema.org/WebSite
 */
export function generateWebSiteSchema(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'GangRun Printing',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/products?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * Generate combined schema for a page (multiple schemas)
 */
export function generateCombinedSchema(...schemas: Array<Record<string, unknown>>) {
  if (schemas.length === 1) {
    return schemas[0]
  }

  return {
    '@context': 'https://schema.org',
    '@graph': schemas,
  }
}

/**
 * Convert schema object to JSON-LD script tag content
 */
export function schemaToJsonLd(schema: Record<string, unknown>) {
  return JSON.stringify(schema, null, 0)
}
