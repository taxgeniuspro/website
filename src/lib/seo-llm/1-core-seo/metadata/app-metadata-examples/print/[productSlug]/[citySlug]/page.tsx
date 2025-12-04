import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CityLandingPageContent } from '@/components/landing-pages/CityLandingPageContent'

interface PageProps {
  params: {
    productSlug: string
    citySlug: string
  }
}

/**
 * Generate metadata for city landing pages
 * Critical for Google SEO - title, description, robots
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const cityLandingPage = await prisma.cityLandingPage.findUnique({
    where: { slug: `${params.productSlug}-${params.citySlug}` },
    include: {
      City: true,
      LandingPageSet: true,
    },
  })

  if (!cityLandingPage) {
    return {
      title: 'Page Not Found | GangRun Printing',
      description: 'The page you are looking for could not be found.',
    }
  }

  const robotsValue =
    cityLandingPage.LandingPageSet?.robotsIndex && cityLandingPage.LandingPageSet?.robotsFollow
      ? 'index, follow'
      : cityLandingPage.LandingPageSet?.robotsIndex
        ? 'index, nofollow'
        : 'noindex, nofollow'

  return {
    title: cityLandingPage.title,
    description: cityLandingPage.metaDesc,
    robots: robotsValue,
    openGraph: {
      title: cityLandingPage.title,
      description: cityLandingPage.metaDesc,
      type: 'website',
      locale: 'en_US',
      siteName: 'GangRun Printing',
    },
    twitter: {
      card: 'summary_large_image',
      title: cityLandingPage.title,
      description: cityLandingPage.metaDesc,
    },
    alternates: {
      canonical:
        cityLandingPage.LandingPageSet?.canonicalUrl ||
        `https://gangrunprinting.com/${params.productSlug}/${params.citySlug}`,
    },
  }
}

/**
 * City Landing Page - Server Component
 * Fetches data server-side for optimal SEO and performance
 */
export default async function CityLandingPage({ params }: PageProps) {
  // Fetch city landing page with all relations
  const cityLandingPage = await prisma.cityLandingPage.findUnique({
    where: { slug: `${params.productSlug}-${params.citySlug}` },
    include: {
      City: true,
      LandingPageSet: {
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
          QuantityGroup: {
            include: {
              QuantityGroupItem: {
                include: {
                  Quantity: true,
                },
                orderBy: {
                  sortOrder: 'asc',
                },
              },
            },
          },
          SizeGroup: {
            include: {
              SizeGroupItem: {
                include: {
                  Size: true,
                },
                orderBy: {
                  sortOrder: 'asc',
                },
              },
            },
          },
          AddOnSet: {
            include: {
              AddOnSetItem: {
                include: {
                  AddOn: true,
                },
                orderBy: {
                  sortOrder: 'asc',
                },
              },
            },
          },
          TurnaroundTimeSet: {
            include: {
              TurnaroundTimeSetItem: {
                include: {
                  TurnaroundTime: true,
                },
                orderBy: {
                  sortOrder: 'asc',
                },
              },
            },
          },
        },
      },
    },
  })

  // 404 if not found or not published
  if (!cityLandingPage || !cityLandingPage.published) {
    notFound()
  }

  // Track view (increment organicViews)
  // Note: In production, use Redis or queue to avoid blocking render
  await prisma.cityLandingPage
    .update({
      where: { id: cityLandingPage.id },
      data: {
        organicViews: {
          increment: 1,
        },
      },
    })
    .catch((err) => {
      // Don't block page render if analytics update fails
      console.error('Failed to track view:', err)
    })

  // Generate schema markup (7 types for maximum SEO)
  const schemaMarkup = generateSchemaMarkup(cityLandingPage)

  return (
    <>
      {/* Schema Markup - Critical for Google Rich Results */}
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
        type="application/ld+json"
      />

      {/* Main Content */}
      <CityLandingPageContent
        city={cityLandingPage.City}
        cityLandingPage={cityLandingPage}
        landingPageSet={cityLandingPage.LandingPageSet!}
      />
    </>
  )
}

/**
 * Generate comprehensive schema markup for SEO
 * 7 schema types for maximum Google visibility
 */
function generateSchemaMarkup(cityLandingPage: any) {
  const city = cityLandingPage.City
  const landingPageSet = cityLandingPage.LandingPageSet

  return {
    '@context': 'https://schema.org',
    '@graph': [
      // 1. Organization
      {
        '@type': 'Organization',
        '@id': 'https://gangrunprinting.com/#organization',
        name: 'GangRun Printing',
        url: 'https://gangrunprinting.com',
        logo: {
          '@type': 'ImageObject',
          url: 'https://gangrunprinting.com/logo.png',
        },
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+1-555-PRINT-NOW',
          contactType: 'Customer Service',
          areaServed: 'US',
        },
      },

      // 2. LocalBusiness
      {
        '@type': 'LocalBusiness',
        '@id': `https://gangrunprinting.com/${cityLandingPage.slug}#localbusiness`,
        name: `GangRun Printing - ${city.name}, ${city.stateCode}`,
        image: 'https://gangrunprinting.com/images/storefront.jpg',
        address: {
          '@type': 'PostalAddress',
          addressLocality: city.name,
          addressRegion: city.stateCode,
          addressCountry: 'US',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: city.latitude,
          longitude: city.longitude,
        },
        url: `https://gangrunprinting.com/${cityLandingPage.slug}`,
        telephone: '+1-555-PRINT-NOW',
        priceRange: '$$',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          reviewCount: '127',
        },
      },

      // 3. Product
      {
        '@type': 'Product',
        '@id': `https://gangrunprinting.com/${cityLandingPage.slug}#product`,
        name: cityLandingPage.h1,
        description: cityLandingPage.metaDesc,
        brand: {
          '@type': 'Brand',
          name: 'GangRun Printing',
        },
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'USD',
          lowPrice: '29.99',
          highPrice: '499.99',
          offerCount: '50',
          availability: 'https://schema.org/InStock',
          url: `https://gangrunprinting.com/${cityLandingPage.slug}`,
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          reviewCount: '127',
        },
      },

      // 4. FAQPage
      {
        '@type': 'FAQPage',
        '@id': `https://gangrunprinting.com/${cityLandingPage.slug}#faq`,
        mainEntity: (cityLandingPage.faqSchema || []).map((faq: any) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },

      // 5. BreadcrumbList
      {
        '@type': 'BreadcrumbList',
        '@id': `https://gangrunprinting.com/${cityLandingPage.slug}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://gangrunprinting.com',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: landingPageSet?.name || 'Products',
            item: `https://gangrunprinting.com/${cityLandingPage.slug.split('-')[0]}`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: `${city.name}, ${city.stateCode}`,
            item: `https://gangrunprinting.com/${cityLandingPage.slug}`,
          },
        ],
      },

      // 6. WebPage
      {
        '@type': 'WebPage',
        '@id': `https://gangrunprinting.com/${cityLandingPage.slug}#webpage`,
        url: `https://gangrunprinting.com/${cityLandingPage.slug}`,
        name: cityLandingPage.title,
        description: cityLandingPage.metaDesc,
        isPartOf: {
          '@id': 'https://gangrunprinting.com/#website',
        },
        breadcrumb: {
          '@id': `https://gangrunprinting.com/${cityLandingPage.slug}#breadcrumb`,
        },
      },

      // 7. HowTo (Ordering Process)
      {
        '@type': 'HowTo',
        name: `How to Order ${cityLandingPage.h1}`,
        description: `Step-by-step guide to ordering professional printing services in ${city.name}, ${city.stateCode}`,
        step: [
          {
            '@type': 'HowToStep',
            position: 1,
            name: 'Choose Your Options',
            text: 'Select paper stock, quantity, size, and turnaround time',
          },
          {
            '@type': 'HowToStep',
            position: 2,
            name: 'Upload Your Design',
            text: 'Upload your print-ready files or use our design services',
          },
          {
            '@type': 'HowToStep',
            position: 3,
            name: 'Review and Checkout',
            text: 'Review your order details and complete secure payment',
          },
          {
            '@type': 'HowToStep',
            position: 4,
            name: 'Fast Delivery',
            text: `Receive your order delivered to ${city.name}, ${city.stateCode}`,
          },
        ],
      },
    ],
  }
}

/**
 * Static generation for top cities (improves performance)
 * Can pre-generate top 50 cities at build time
 * Gracefully handles DB unavailability during Docker build
 *
 * NOTE: Disabled for Docker builds to avoid DB connection errors
 * Pages will be generated on-demand at runtime (ISR)
 */
export async function generateStaticParams() {
  // Skip static generation during Docker builds (no DB available)
  // Pages will be generated on-demand at runtime using ISR
  if (process.env.DOCKER_BUILD === 'true' || !process.env.DATABASE_URL?.includes('localhost')) {
    return []
  }

  try {
    // Only pre-generate top 50 cities at build time
    // Others will be generated on-demand (ISR)
    const topCityPages = await prisma.cityLandingPage.findMany({
      where: {
        published: true,
        City: {
          rank: {
            lte: 50,
          },
        },
      },
      select: {
        slug: true,
      },
      take: 50,
    })

    return topCityPages.map((page) => {
      const parts = page.slug.split('-')
      const citySlug = parts.slice(-2).join('-') // last 2 parts: "new-york" or "los-angeles"
      const productSlug = parts.slice(0, -2).join('-') // everything before city

      return {
        productSlug,
        citySlug,
      }
    })
  } catch (error) {
    // DB not available during build - return empty array
    // Pages will be generated on-demand at runtime (ISR)
    console.warn('Database unavailable during build, skipping static generation:', error)
    return []
  }
}

// ISR: Revalidate every 24 hours
export const revalidate = 86400
