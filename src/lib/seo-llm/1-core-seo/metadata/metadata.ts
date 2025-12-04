import { Metadata } from 'next'
import { headers } from 'next/headers'

const SITE_NAME = 'Tax Genius Pro'
const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://taxgeniuspro.tax'
const DEFAULT_DESCRIPTION =
  'Professional tax preparation and management services. Expert tax filing, planning, and IRS resolution.'

export interface PageMetadata {
  title: string
  description?: string
  keywords?: string[]
  image?: string
  url?: string
  type?: 'website' | 'article' | 'product' | 'product.group'
  noindex?: boolean
  locale?: string
}

/**
 * Get the current locale from headers or use default
 * Note: This is a sync helper - for async contexts, pass locale directly
 */
function getLocaleFromHeaders(): string {
  // Return default locale - caller should pass locale explicitly
  // headers() is async in Next.js 15 and cannot be used synchronously
  return 'en'
}

/**
 * Generate Next.js metadata for SEO optimization
 */
export function generateMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = [],
  image,
  url,
  type = 'website',
  noindex = false,
  locale,
}: PageMetadata): Metadata {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`
  const fullUrl = url ? `${SITE_URL}${url}` : SITE_URL

  // Determine locale - use provided locale, or try to get from headers, or default to 'en'
  const currentLocale = locale || getLocaleFromHeaders()

  // Use locale-specific OG image if no custom image is provided
  const defaultOgImage = currentLocale === 'es' ? '/og-image-es.jpg' : '/og-image-en.jpg'
  const ogImage = image ? `${SITE_URL}${image}` : `${SITE_URL}${defaultOgImage}`

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(', '),
    ...(noindex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
    openGraph: {
      title: fullTitle,
      description,
      url: fullUrl,
      siteName: SITE_NAME,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: currentLocale === 'es' ? 'es_ES' : 'en_US',
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: fullUrl,
    },
  }
}

/**
 * Generate metadata for category pages
 */
export function generateCategoryMetadata(
  categoryName: string,
  categorySlug: string,
  description?: string,
  metaTitle?: string,
  keywords?: string[],
  imageUrl?: string
): Metadata {
  const title = metaTitle || `${categoryName} Printing Services`
  const desc =
    description ||
    `High-quality ${categoryName.toLowerCase()} printing. Fast turnaround, competitive prices. Order online today!`

  return generateMetadata({
    title,
    description: desc,
    keywords: keywords || [
      categoryName.toLowerCase(),
      `${categoryName.toLowerCase()} printing`,
      'online printing',
      'custom printing',
    ],
    image: imageUrl,
    url: `/category/${categorySlug}`,
    type: 'product.group',
  })
}

/**
 * Generate metadata for product pages
 */
export function generateProductMetadata(
  productName: string,
  productSlug: string,
  description?: string,
  price?: number,
  categoryName?: string,
  imageUrl?: string
): Metadata {
  const title = `${productName}${categoryName ? ` - ${categoryName}` : ''}`
  const desc =
    description ||
    `Order custom ${productName.toLowerCase()} online. High quality printing, fast delivery.`

  return generateMetadata({
    title,
    description: desc,
    keywords: [
      productName.toLowerCase(),
      `${productName.toLowerCase()} printing`,
      categoryName?.toLowerCase() || '',
      'custom printing',
      'online printing',
    ].filter(Boolean),
    image: imageUrl,
    url: `/products/${productSlug}`,
    type: 'product',
  })
}

/**
 * Generate title template for consistent page titles
 */
export function createTitleTemplate(template: string): string {
  return template.replace('%s', SITE_NAME)
}

/**
 * Truncate text to specified length (for meta descriptions)
 */
export function truncateText(text: string, maxLength: number = 160): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3).trim() + '...'
}

/**
 * Generate keywords array from category and product data
 */
export function generateKeywords(mainKeyword: string, additionalKeywords: string[] = []): string[] {
  const base = [
    mainKeyword,
    `${mainKeyword} printing`,
    `custom ${mainKeyword}`,
    `${mainKeyword} online`,
    'printing services',
    'online printing',
  ]

  return [...new Set([...base, ...additionalKeywords])]
}
