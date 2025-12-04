/**
 * Test script to generate a single tax service page for one city
 *
 * Usage: npx tsx scripts/test-generate-single-city.ts
 */

import { PrismaClient } from '@prisma/client'
import axios from 'axios'
import {
  generateTaxServiceIntroPrompt,
  generateTaxServiceBenefitsPrompt,
  generateTaxServiceFAQsPrompt,
  generateTaxServiceTitle,
  generateTaxServiceH1,
  generateTaxServiceMetaDescription,
  type CityData,
  type TaxServiceSpec,
} from '../src/lib/seo-llm/3-seo-brain/campaign-generator/tax-service-prompts'

const prisma = new PrismaClient()

// Ollama API helper
async function callOllama(prompt: string): Promise<string> {
  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:14b'

  try {
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
    }, {
      timeout: 120000, // 2 minute timeout
    })

    return response.data.response
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Ollama API error: ${error.message}`)
    }
    throw error
  }
}

async function generateCityPage() {
  console.log('🚀 Starting test generation for single city page...\n')

  try {
    // 1. Get Miami from database
    console.log('📍 Fetching Miami from database...')
    const city = await prisma.city.findFirst({
      where: { name: 'Miami', state: 'Florida' },
    })

    if (!city) {
      console.error('❌ Miami not found in database!')
      console.log('Available cities:', await prisma.city.count())
      return
    }

    console.log(`✅ Found: ${city.name}, ${city.state} (Population: ${city.population.toLocaleString()})`)
    console.log(`   Slug: ${city.slug}\n`)

    // 2. Define tax service
    const taxService: TaxServiceSpec = {
      serviceName: 'Personal Tax Preparation',
      serviceType: 'personal',
      startingPrice: 199,
      averageRefund: 3200,
      turnaround: 'Same-day filing available',
      specialties: ['W-2 employees', 'Self-employed', 'Freelancers', 'Small business owners'],
    }

    // Prepare city data
    const cityData: CityData = {
      name: city.name,
      state: city.state,
      stateCode: city.stateCode,
      population: city.population,
      hasStateTax: false, // Florida has no state income tax
      stateTaxRate: 0,
      neighborhoods: ['South Beach', 'Downtown Miami', 'Coral Gables', 'Wynwood', 'Brickell'],
      industries: ['Tourism', 'Finance', 'Real Estate', 'Healthcare', 'International Trade'],
      landmarks: ['South Beach', 'Vizcaya Museum', 'Bayside Marketplace'],
      zipCodes: ['33101', '33109', '33125', '33130', '33132'],
      irsOffice: '51 SW 1st Ave, Miami, FL 33130',
    }

    // 3. Generate page title and meta
    console.log('📝 Generating SEO metadata...')
    const title = generateTaxServiceTitle({ city: cityData, service: taxService })
    const h1 = generateTaxServiceH1({ city: cityData, service: taxService })
    const metaDesc = generateTaxServiceMetaDescription({ city: cityData, service: taxService })

    console.log(`   Title: ${title}`)
    console.log(`   H1: ${h1}`)
    console.log(`   Meta: ${metaDesc}\n`)

    // 4. Generate 500-word introduction
    console.log('✍️  Generating 500-word introduction with Ollama...')
    console.log('   (This may take 30-60 seconds...)')
    const introPrompt = generateTaxServiceIntroPrompt({ city: cityData, service: taxService })
    const introduction = await callOllama(introPrompt)
    console.log(`✅ Introduction generated (${introduction.split(' ').length} words)\n`)

    // 5. Generate 10 benefits
    console.log('📋 Generating 10 benefits with Ollama...')
    const benefitsPrompt = generateTaxServiceBenefitsPrompt({ city: cityData, service: taxService })
    const benefitsResponse = await callOllama(benefitsPrompt)
    console.log('✅ Benefits generated\n')

    // 6. Generate 15 FAQs
    console.log('❓ Generating 15 FAQs with Ollama...')
    const faqsPrompt = generateTaxServiceFAQsPrompt({ city: cityData, service: taxService })
    const faqsResponse = await callOllama(faqsPrompt)
    console.log('✅ FAQs generated\n')

    // 7. Save to database
    console.log('💾 Saving to database...')
    const slug = `personal-tax-preparation-miami-fl`

    const savedPage = await prisma.seoLandingPage.upsert({
      where: { slug },
      create: {
        cityId: city.id,
        serviceType: 'personal-tax',
        slug,
        title,
        metaDesc,
        h1,
        keywords: [
          'tax preparation Miami',
          'tax services Miami',
          'Miami tax filing',
          'Florida tax preparation',
          'personal tax Miami',
        ],
        aiIntro: introduction,
        aiBenefits: benefitsResponse,
        faqSchema: faqsResponse,
        schemaMarkup: {
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: taxService.serviceName,
          description: metaDesc,
          provider: {
            '@type': 'Organization',
            name: 'Tax Genius Pro',
          },
          areaServed: {
            '@type': 'City',
            name: city.name,
            addressRegion: city.stateCode,
          },
          offers: {
            '@type': 'Offer',
            price: taxService.startingPrice,
            priceCurrency: 'USD',
          },
        },
        status: 'published',
        published: true,
        publishedAt: new Date(),
      },
      update: {
        title,
        metaDesc,
        h1,
        aiIntro: introduction,
        aiBenefits: benefitsResponse,
        faqSchema: faqsResponse,
        updatedAt: new Date(),
      },
    })

    console.log(`✅ Saved to database with ID: ${savedPage.id}`)
    console.log(`   URL: /services/tax-prep/${slug}\n`)

    // 8. Display preview
    console.log('═══════════════════════════════════════════════════════════')
    console.log('📄 GENERATED CONTENT PREVIEW')
    console.log('═══════════════════════════════════════════════════════════\n')
    console.log(`TITLE: ${title}\n`)
    console.log(`H1: ${h1}\n`)
    console.log(`META DESCRIPTION:\n${metaDesc}\n`)
    console.log('─────────────────────────────────────────────────────────── ')
    console.log('INTRODUCTION (first 500 characters):\n')
    console.log(introduction.substring(0, 500) + '...\n')
    console.log('═══════════════════════════════════════════════════════════\n')

    console.log('✅ TEST COMPLETED SUCCESSFULLY!')
    console.log('\n📊 Next steps:')
    console.log('   1. Review the generated content in the database')
    console.log('   2. Create a Next.js route to display this page')
    console.log('   3. Run a campaign to generate all 200 cities')
    console.log(`   4. View page at: /services/tax-prep/${slug}`)

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
generateCityPage()
  .then(() => {
    console.log('\n✅ Test completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
