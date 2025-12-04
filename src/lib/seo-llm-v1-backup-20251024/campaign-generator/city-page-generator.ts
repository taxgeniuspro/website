/**
 * SEO Brain - City Page Generator for TaxGeniusPro
 *
 * Generates 200 city landing pages with:
 * 1. Unique 400-word content per city
 * 2. 10 benefits
 * 3. 15 FAQs
 * 4. Complete schema markup
 * 5. SEO metadata
 * 6. Optional: AI-generated images
 */

import { prisma } from '@/lib/prisma';
import {
  generateCompleteCityContent,
  type CityData,
  type TaxServiceSpec,
} from './city-content-prompts';
import { OllamaClient } from '../integrations/ollama/ollama-client';
import {
  generateCityTaxImage,
  type ImageGenerationResult,
} from '../integrations/google-imagen/imagen-client';
import { logger } from '@/lib/logger';

export interface TaxCampaignSpec {
  serviceType: string; // 'personal-tax', 'business-tax', 'irs-resolution', 'tax-planning'
  serviceName: string; // "Personal Tax Filing", "Business Tax Services"
  description: string;
  price?: number;
  features: string[];
  keywords: string[];
}

export interface CityPageGenerationResult {
  success: boolean;
  seoLandingPageId?: string;
  city: string;
  state: string;
  slug?: string;
  error?: string;
}

/**
 * Generate 200 city landing pages for a tax service
 */
export async function generate200CityPages(
  campaignId: string,
  taxCampaignSpec: TaxCampaignSpec,
  ollamaClient: OllamaClient,
  options?: {
    generateImages?: boolean;
    batchSize?: number;
  }
): Promise<{
  success: boolean;
  generated: number;
  failed: number;
  results: CityPageGenerationResult[];
}> {
  const { generateImages = false, batchSize = 10 } = options || {};

  // Get top 200 US cities
  const cities = await getTop200USCities();

  const results: CityPageGenerationResult[] = [];
  let generated = 0;
  let failed = 0;

  logger.info(`[SEO Brain] Starting campaign ${campaignId} for ${cities.length} cities...`);

  // Process cities in batches
  for (let i = 0; i < cities.length; i += batchSize) {
    const batch = cities.slice(i, i + batchSize);

    logger.info(
      `[SEO Brain] Processing batch ${Math.floor(i / batchSize) + 1} (cities ${i + 1}-${Math.min(i + batchSize, cities.length)})...`
    );

    // Process batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map((city) =>
        generateSingleCityPage({
          city,
          campaignId,
          taxCampaignSpec,
          ollamaClient,
          generateImages,
        })
      )
    );

    // Collect results
    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value.success) {
        generated++;
        results.push(result.value);
      } else {
        failed++;
        results.push({
          success: false,
          city: 'Unknown',
          state: 'Unknown',
          error: result.status === 'rejected' ? result.reason : 'Generation failed',
        });
      }
    }

    // Progress update
    logger.info(`[SEO Brain] Progress: ${generated}/${cities.length} completed, ${failed} failed`);

    // Small delay between batches to avoid overwhelming Ollama
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Update campaign status
  await prisma.productCampaignQueue.update({
    where: { id: campaignId },
    data: {
      citiesGenerated: generated,
      generationCompletedAt: new Date(),
      status: generated === cities.length ? 'COMPLETE' : 'OPTIMIZING',
    },
  });

  logger.info(
    `[SEO Brain] Campaign ${campaignId} complete: ${generated} generated, ${failed} failed`
  );

  return {
    success: generated > 0,
    generated,
    failed,
    results,
  };
}

/**
 * Generate a single city landing page
 */
async function generateSingleCityPage(params: {
  city: CityData;
  campaignId: string;
  taxCampaignSpec: TaxCampaignSpec;
  ollamaClient: OllamaClient;
  generateImages: boolean;
}): Promise<CityPageGenerationResult> {
  const { city, campaignId, taxCampaignSpec, ollamaClient, generateImages } = params;

  try {
    logger.info(`[SEO Brain]   Generating: ${city.name}, ${city.state}...`);

    // Step 1: Generate city-specific content
    const content = await generateCompleteCityContent({
      city,
      serviceType: taxCampaignSpec.serviceType,
      taxServiceSpec: {
        name: taxCampaignSpec.serviceName,
        description: taxCampaignSpec.description,
        price: taxCampaignSpec.price,
        features: taxCampaignSpec.features,
      },
      ollamaClient,
    });

    // Step 2: Generate city-specific hero image (optional)
    let imageGenerationResult: ImageGenerationResult | null = null;
    if (generateImages) {
      try {
        imageGenerationResult = await generateCityTaxImage(
          city.name,
          taxCampaignSpec.serviceType,
          'hero'
        );
      } catch (error) {
        logger.error(
          `[SEO Brain]   Image generation failed for ${city.name}, continuing without image`
        );
      }
    }

    // Step 3: Generate SEO metadata
    const metadata = generateSEOMetadata({
      city,
      taxCampaignSpec,
    });

    // Step 4: Create URL slug
    const slug = `${taxCampaignSpec.serviceType}-${city.slug}`;

    // Step 5: Generate complete schema markup
    const schemaMarkup = generateSchemaMarkup({
      city,
      taxCampaignSpec,
      faqs: content.faqs,
      slug,
    });

    // Step 6: Create SeoLandingPage record
    const seoPage = await prisma.seoLandingPage.create({
      data: {
        cityId: city.id,
        serviceType: taxCampaignSpec.serviceType,
        slug,

        // SEO Content
        title: metadata.title,
        metaDesc: metadata.description,
        h1: metadata.h1,
        keywords: metadata.keywords,

        // AI-Generated Content
        aiIntro: content.introduction,
        aiBenefits: content.benefits.join('\n\n'),
        aiCaseStudy: null, // Optional for later

        // Structured Content
        faqSchema: content.faqs,
        schemaMarkup: schemaMarkup,

        // Status
        status: 'draft',
        published: false,
        approved: false,

        // Generation Metadata
        generatedBy: 'system',
        generationModel: process.env.OLLAMA_MODEL || 'qwen2.5:32b',
        generatedAt: new Date(),

        // Initialize metrics
        views: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
      },
    });

    logger.info(`[SEO Brain]   ✓ Success: ${city.name}, ${city.state}`);

    return {
      success: true,
      seoLandingPageId: seoPage.id,
      city: city.name,
      state: city.state,
      slug,
    };
  } catch (error) {
    logger.error(`[SEO Brain]   ❌ Failed: ${city.name}, ${city.state}`, error);
    return {
      success: false,
      city: city.name,
      state: city.state,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate SEO metadata for city page
 */
function generateSEOMetadata(params: { city: CityData; taxCampaignSpec: TaxCampaignSpec }): {
  title: string;
  description: string;
  h1: string;
  keywords: string[];
} {
  const { city, taxCampaignSpec } = params;

  const serviceNames: Record<string, string> = {
    'personal-tax': 'Personal Tax Filing',
    'business-tax': 'Business Tax Services',
    'irs-resolution': 'IRS Tax Resolution',
    'tax-planning': 'Tax Planning Services',
  };

  const serviceName = serviceNames[taxCampaignSpec.serviceType] || taxCampaignSpec.serviceName;

  const title = `${serviceName} in ${city.name}, ${city.stateCode} | TaxGeniusPro`;

  const description = `Expert ${serviceName.toLowerCase()} for ${city.name} residents and businesses. Maximum refund guarantee, IRS audit protection, year-round support. Get your free consultation today.`;

  const h1 = `${serviceName} in ${city.name}, ${city.state}`;

  const keywords = [
    `${taxCampaignSpec.serviceType.replace('-', ' ')} ${city.name}`,
    `tax preparation ${city.name}`,
    `tax services ${city.name} ${city.stateCode}`,
    `${city.name} tax preparer`,
    `${city.state} tax services`,
    ...taxCampaignSpec.keywords,
  ];

  return { title, description, h1, keywords };
}

/**
 * Generate complete schema.org markup
 */
function generateSchemaMarkup(params: {
  city: CityData;
  taxCampaignSpec: TaxCampaignSpec;
  faqs: Array<{ question: string; answer: string }>;
  slug: string;
}): any {
  const { city, taxCampaignSpec, faqs, slug } = params;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      // LocalBusiness schema
      {
        '@type': 'LocalBusiness',
        '@id': `https://taxgeniuspro.tax/${slug}#business`,
        name: 'TaxGeniusPro',
        description: `Professional tax services in ${city.name}, ${city.state}`,
        url: `https://taxgeniuspro.tax/${slug}`,
        telephone: '+1-404-627-1015',
        address: {
          '@type': 'PostalAddress',
          addressLocality: city.name,
          addressRegion: city.stateCode,
          addressCountry: 'US',
        },
        areaServed: {
          '@type': 'City',
          name: city.name,
          containedIn: {
            '@type': 'State',
            name: city.state,
          },
        },
      },
      // ProfessionalService schema
      {
        '@type': 'ProfessionalService',
        '@id': `https://taxgeniuspro.tax/${slug}#service`,
        name: taxCampaignSpec.serviceName,
        description: taxCampaignSpec.description,
        provider: {
          '@id': `https://taxgeniuspro.tax/${slug}#business`,
        },
        areaServed: {
          '@type': 'City',
          name: city.name,
          addressRegion: city.stateCode,
        },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Tax Services',
          itemListElement: taxCampaignSpec.features.map((feature, index) => ({
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: feature,
            },
          })),
        },
      },
      // FAQPage schema
      {
        '@type': 'FAQPage',
        '@id': `https://taxgeniuspro.tax/${slug}#faq`,
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
  };
}

/**
 * Get top 200 US cities from database
 */
async function getTop200USCities(): Promise<CityData[]> {
  const cities = await prisma.city.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      rank: 'asc',
    },
    take: 200,
  });

  return cities.map((city) => ({
    id: city.id,
    name: city.name,
    state: city.state,
    stateCode: city.stateCode,
    population: city.population,
    slug: city.slug,
  }));
}

export default generate200CityPages;
