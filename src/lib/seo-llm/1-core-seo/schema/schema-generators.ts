/**
 * Schema Markup Generators for SEO and AI Search Optimization
 *
 * Generates JSON-LD structured data for:
 * - Product Schema (pricing, availability, ratings)
 * - FAQPage Schema (from seoFaqs field)
 * - LocalBusiness Schema (city-specific context)
 * - Organization Schema (brand identity)
 *
 * Used by: Product detail pages for ChatGPT Shopping, Google Rich Results, AI Overviews
 */

interface City {
  id: string
  name: string
  stateCode: string
}

interface ProductForSchema {
  id: string
  name: string
  slug: string
  description: string | null
  shortDescription: string | null
  basePrice: number
  ProductImage?: Array<{ Image?: { url: string } }>
  City?: City | null
  seoFaqs?: Array<{ question: string; answer: string }> | null
}

export function generateProductSchema(
  product: ProductForSchema,
  siteUrl: string = 'https://gangrunprinting.com'
) {
  const imageUrl = product.ProductImage?.[0]?.Image?.url || `${siteUrl}/default-product.jpg`

  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description:
      product.shortDescription ||
      product.description ||
      `Order ${product.name} from GangRun Printing`,
    image: imageUrl.startsWith('http') ? imageUrl : `${siteUrl}${imageUrl}`,
    sku: product.slug,
    brand: {
      '@type': 'Brand',
      name: 'GangRun Printing',
    },
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: product.basePrice.toString(),
      highPrice: (product.basePrice * 10).toString(), // Estimate based on quantity
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${siteUrl}/products/${product.slug}`,
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0',
          currency: 'USD',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'US',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          businessDays: {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            opens: '00:00',
            closes: '23:59',
          },
          cutoffTime: '17:00:00',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 5,
            maxValue: 10,
            unitCode: 'DAY',
          },
        },
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      bestRating: '5',
      worstRating: '1',
      ratingCount: '247',
    },
    ...(product.City
      ? {
          areaServed: {
            '@type': 'City',
            name: product.City.name,
            address: {
              '@type': 'PostalAddress',
              addressLocality: product.City.name,
              addressRegion: product.City.stateCode,
              addressCountry: 'US',
            },
          },
        }
      : {}),
  }
}

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  if (!faqs || faqs.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

export function generateLocalBusinessSchema(
  product: ProductForSchema,
  siteUrl: string = 'https://gangrunprinting.com'
) {
  if (!product.City) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${siteUrl}/#organization`,
    name: 'GangRun Printing',
    description: `Professional printing services serving ${product.City.name}, ${product.City.stateCode}`,
    url: siteUrl,
    telephone: '1-877-426-4786',
    email: 'support@gangrunprinting.com',
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Chicago',
      addressRegion: 'IL',
      addressCountry: 'US',
    },
    areaServed: {
      '@type': 'City',
      name: product.City.name,
      address: {
        '@type': 'PostalAddress',
        addressRegion: product.City.stateCode,
        addressCountry: 'US',
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '247',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '18:00',
      },
    ],
  }
}

export function generateOrganizationSchema(siteUrl: string = 'https://gangrunprinting.com') {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'GangRun Printing',
    url: siteUrl,
    logo: `${siteUrl}/gangrunprinting_logo_new_1448921366__42384-200x200.png`,
    description:
      'Professional printing services for businesses nationwide. High-quality prints, fast turnaround, and exceptional service.',
    email: 'support@gangrunprinting.com',
    telephone: '1-877-426-4786',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Chicago',
      addressRegion: 'IL',
      addressCountry: 'US',
    },
    sameAs: [
      'https://www.facebook.com/gangrunprinting',
      'https://twitter.com/gangrunprinting',
      'https://www.instagram.com/gangrunprinting',
      'https://www.linkedin.com/company/gangrun-printing',
      'https://wa.me/18774264786', // WhatsApp business
      'sms:+18774264786', // SMS for mobile sharing
    ],
  }
}

/**
 * Generate BreadcrumbList Schema
 */
export function generateBreadcrumbSchema(
  product: ProductForSchema,
  siteUrl: string = 'https://gangrunprinting.com'
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Products',
        item: `${siteUrl}/products`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.name,
        item: `${siteUrl}/products/${product.slug}`,
      },
    ],
  }
}

/**
 * Generate HowTo Schema for ordering process
 */
export function generateHowToSchema(
  productName: string,
  siteUrl: string = 'https://gangrunprinting.com'
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to Order ${productName}`,
    description: 'Simple 4-step process to order professional printing from GangRun Printing',
    totalTime: 'PT10M',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Choose Your Options',
        text: 'Select size, quantity, paper stock, and turnaround time. Get instant pricing with our calculator.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Upload Your Design',
        text: 'Upload print-ready files or use our free templates. We review files within 24 hours.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Approve Your Proof',
        text: "Receive digital proof via email. Approve online or request changes. We don't print until you approve.",
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: 'We Print & Ship',
        text: 'Professional printing with quality checks. Free shipping over $50. Track delivery in real-time.',
      },
    ],
  }
}

/**
 * Generate Review Schema for individual testimonials
 */
export function generateReviewSchema(
  testimonials: Array<{
    quote: string
    author: string
    location: string
    rating: number
    date?: string
  }>,
  productName: string
) {
  if (!testimonials || testimonials.length === 0) return []

  return testimonials.map((testimonial) => ({
    '@type': 'Review',
    reviewRating: {
      '@type': 'Rating',
      ratingValue: testimonial.rating.toString(),
      bestRating: '5',
      worstRating: '1',
    },
    author: {
      '@type': 'Person',
      name: testimonial.author,
    },
    reviewBody: testimonial.quote,
    datePublished: testimonial.date || new Date().toISOString().split('T')[0],
    itemReviewed: {
      '@type': 'Product',
      name: productName,
    },
  }))
}

/**
 * Generate all schemas for a product page
 */
export function generateAllProductSchemas(
  product: ProductForSchema,
  siteUrl: string = 'https://gangrunprinting.com'
) {
  const schemas = [
    generateProductSchema(product, siteUrl),
    generateOrganizationSchema(siteUrl),
    generateBreadcrumbSchema(product, siteUrl),
    generateHowToSchema(product.name, siteUrl),
  ]

  const faqSchema = product.seoFaqs ? generateFAQSchema(product.seoFaqs) : null
  if (faqSchema) schemas.push(faqSchema)

  const localBusinessSchema = generateLocalBusinessSchema(product, siteUrl)
  if (localBusinessSchema) schemas.push(localBusinessSchema)

  return schemas
}
