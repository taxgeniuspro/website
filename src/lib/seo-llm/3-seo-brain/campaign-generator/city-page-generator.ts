/**
 * SEO Brain - City Page Generator
 *
 * Generates complete city landing pages with:
 * 1. Main product image (Google AI)
 * 2. City-specific hero image (Google AI)
 * 3. 500-word unique content (Ollama)
 * 4. 10 benefits (Ollama)
 * 5. 15 FAQs (Ollama)
 * 6. Complete schema markup
 * 7. SEO metadata
 */

import { prisma } from '@/lib/prisma'
import { generateCompleteCityContent } from './city-content-prompts'
import type { CityData } from './city-data-types'

// Import existing Google AI image generation
// @ts-ignore - Will use existing implementation
import { generateProductImage } from '@/lib/seo-llm/2-llm-integrations/google-imagen/google-ai-client'

export interface ProductCampaignSpec {
  productName: string
  quantity: number
  size: string
  material: string
  turnaround: string
  price: number
  onlineOnly: boolean
  keywords: string[]
  industries?: string[]
}

export interface CityPageGenerationResult {
  success: boolean
  cityLandingPageId?: string
  city: string
  state: string
  url?: string
  error?: string
}

/**
 * Generate 200 city landing pages for a product
 */
export async function generate200CityPages(
  campaignId: string,
  productSpec: ProductCampaignSpec,
  ollamaClient: any
): Promise<{
  success: boolean
  generated: number
  failed: number
  results: CityPageGenerationResult[]
}> {
  // Get top 200 US cities
  const cities = await getTop200USCities()

  const results: CityPageGenerationResult[] = []
  let generated = 0
  let failed = 0

  // Step 1: Generate main product image (ONE TIME)
  const mainProductImage = await generateMainProductImage(productSpec)

  if (!mainProductImage.success) {
    console.error('[SEO Brain] Failed to generate main product image')
    return { success: false, generated: 0, failed: 200, results: [] }
  }

  // Step 2: Generate city pages in batches of 10
  const batchSize = 10
  for (let i = 0; i < cities.length; i += batchSize) {
    const batch = cities.slice(i, i + batchSize)

    // Process batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map((city) =>
        generateSingleCityPage({
          city,
          campaignId,
          productSpec,
          mainProductImageUrl: mainProductImage.url!,
          ollamaClient,
        })
      )
    )

    // Collect results
    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value.success) {
        generated++
        results.push(result.value)
      } else {
        failed++
        results.push({
          success: false,
          city: 'Unknown',
          state: 'Unknown',
          error: result.status === 'rejected' ? result.reason : 'Generation failed',
        })
      }
    }

    // Progress update

    // Small delay between batches to avoid overwhelming Ollama
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  // Update campaign status
  await prisma.productCampaignQueue.update({
    where: { id: campaignId },
    data: {
      citiesGenerated: generated,
      generationCompletedAt: new Date(),
      status: generated === 200 ? 'OPTIMIZING' : 'GENERATING',
    },
  })

  return {
    success: generated > 0,
    generated,
    failed,
    results,
  }
}

/**
 * Generate main product image (used across all cities)
 */
async function generateMainProductImage(productSpec: ProductCampaignSpec): Promise<{
  success: boolean
  url?: string
  error?: string
}> {
  try {
    // Extract product type
    const productType = productSpec.productName.toLowerCase().includes('flyer')
      ? 'flyers'
      : productSpec.productName.toLowerCase().includes('business card')
        ? 'business cards'
        : productSpec.productName.toLowerCase().includes('postcard')
          ? 'postcards'
          : productSpec.productName.toLowerCase().includes('brochure')
            ? 'brochures'
            : 'printed materials'

    // Create professional product photography prompt
    const prompt = `Professional product photography of ${productSpec.size} ${productType} in ${productSpec.material}, displayed fanned out on clean white surface, studio lighting with soft shadows, high-end marketing photography, ultra sharp focus, premium paper texture visible, 4k resolution, minimalist composition`

    // Generate image using existing Google AI integration
    const result = await generateProductImage({
      prompt,
      aspectRatio: '4:3',
      productName: productSpec.productName,
    })

    if (result.success && result.imageUrl) {
      return {
        success: true,
        url: result.imageUrl,
      }
    } else {
      return {
        success: false,
        error: result.error || 'Image generation failed',
      }
    }
  } catch (error) {
    console.error('[SEO Brain] Error generating main product image:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate a single city landing page
 */
async function generateSingleCityPage(params: {
  city: CityData
  campaignId: string
  productSpec: ProductCampaignSpec
  mainProductImageUrl: string
  ollamaClient: any
}): Promise<CityPageGenerationResult> {
  const { city, campaignId, productSpec, mainProductImageUrl, ollamaClient } = params

  try {
    // Step 1: Generate city-specific content (500 words + 10 benefits + 15 FAQs)
    const content = await generateCompleteCityContent({
      city,
      productName: productSpec.productName,
      productSpec: {
        quantity: productSpec.quantity,
        size: productSpec.size,
        material: productSpec.material,
        turnaround: productSpec.turnaround,
        price: productSpec.price,
      },
      ollamaClient,
    })

    // Step 2: Generate city-specific hero image
    const cityHeroImage = await generateProductImage({
      prompt: content.imagePrompt,
      aspectRatio: '4:3',
      productName: `${productSpec.productName}-${city.slug}`,
    })

    // Step 3: Generate SEO metadata
    const metadata = generateSEOMetadata({
      city,
      productSpec,
    })

    // Step 4: Create URL slug
    const slug = `${productSpec.productName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')}-${city.slug}`

    // Step 5: Create CityLandingPage record
    const cityPage = await prisma.cityLandingPage.create({
      data: {
        id: `city-${campaignId}-${city.slug}`,
        landingPageSetId: campaignId,
        productId: campaignId, // Use campaign ID as product reference
        cityId: city.id || city.slug,
        slug,

        // SEO Content
        title: metadata.title,
        metaDesc: metadata.description,
        h1: metadata.h1,

        // AI-Generated Content (Premium 500-word)
        aiIntro: content.introduction,
        aiBenefits: content.benefits.join('\n'),
        content: content.introduction, // Full content

        // FAQs with schema markup
        faqSchema: content.faqs,

        // Schema markup
        schemaMarkup: generateSchemaMarkup({
          city,
          productSpec,
          faqs: content.faqs,
          slug,
        }),

        // Images
        // Note: You'll need to add these fields to the schema or use metadata
        // mainProductImage: mainProductImageUrl,
        // cityHeroImage: cityHeroImage.imageUrl,

        // Status
        status: 'published',
        published: true,
        publishedAt: new Date(),

        // Initialize metrics
        views: 0,
        clicks: 0,
        orders: 0,
        revenue: 0,
      },
    })

    return {
      success: true,
      cityLandingPageId: cityPage.id,
      city: city.name,
      state: city.state,
      url: `/print/${slug}`,
    }
  } catch (error) {
    console.error(`[SEO Brain]   ❌ Failed: ${city.name}, ${city.state}`, error)
    return {
      success: false,
      city: city.name,
      state: city.state,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate SEO metadata for city page
 */
function generateSEOMetadata(params: { city: CityData; productSpec: ProductCampaignSpec }): {
  title: string
  description: string
  h1: string
  keywords: string[]
} {
  const { city, productSpec } = params

  const title = `${productSpec.quantity} ${productSpec.size} ${productSpec.productName} in ${city.name}, ${city.state} | ${productSpec.turnaround} | $${productSpec.price}`

  const description = `Order ${productSpec.quantity} ${productSpec.size} ${productSpec.productName} in ${city.name}. ${productSpec.material}, ${productSpec.turnaround} turnaround. Online special: $${productSpec.price}. Free shipping to all ${city.state} locations.`

  const h1 = `${productSpec.productName} in ${city.name}, ${city.state}`

  const keywords = [
    `${productSpec.productName.toLowerCase()} ${city.name.toLowerCase()}`,
    `${productSpec.productName.toLowerCase()} printing ${city.name.toLowerCase()}`,
    `${productSpec.size} ${productSpec.productName.toLowerCase()}`,
    `${productSpec.turnaround} ${productSpec.productName.toLowerCase()}`,
    `cheap ${productSpec.productName.toLowerCase()} ${city.name.toLowerCase()}`,
    `fast ${productSpec.productName.toLowerCase()} ${city.state.toLowerCase()}`,
    ...productSpec.keywords,
  ]

  return { title, description, h1, keywords }
}

/**
 * Generate complete schema.org markup
 */
function generateSchemaMarkup(params: {
  city: CityData
  productSpec: ProductCampaignSpec
  faqs: Array<{ question: string; answer: string }>
  slug: string
}): any {
  const { city, productSpec, faqs, slug } = params

  return {
    '@context': 'https://schema.org',
    '@graph': [
      // Product schema
      {
        '@type': 'Product',
        name: `${productSpec.productName} - ${city.name}, ${city.state}`,
        description: `${productSpec.quantity} ${productSpec.size} ${productSpec.productName} in ${productSpec.material}`,
        offers: {
          '@type': 'Offer',
          price: productSpec.price,
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: `https://gangrunprinting.com/print/${slug}`,
          areaServed: {
            '@type': 'City',
            name: city.name,
            containedIn: {
              '@type': 'State',
              name: city.state,
            },
          },
        },
      },
      // Local Business schema
      {
        '@type': 'LocalBusiness',
        name: 'GangRun Printing',
        description: `Professional printing services in ${city.name}, ${city.state}`,
        areaServed: {
          '@type': 'City',
          name: city.name,
          addressRegion: city.state,
        },
      },
      // FAQ schema
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    ],
  }
}

/**
 * Get top 200 US cities
 * This should pull from your existing city database or JSON file
 */
async function getTop200USCities(): Promise<CityData[]> {
  // TODO: Implement based on your existing city data structure
  // For now, return placeholder
  // This should match your existing 200 cities data

  const cities = await prisma.city.findMany({
    take: 200,
    orderBy: {
      population: 'desc',
    },
  })

  return cities.map((city) => ({
    id: city.id,
    name: city.name,
    state: city.state,
    slug: city.slug,
    population: city.population,
    zipCodes: [], // Add if available
    neighborhoods: [], // Add if available
    venues: [], // Add if available
    industries: [], // Add if available
    famousFor: [], // Add if available
  }))
}
