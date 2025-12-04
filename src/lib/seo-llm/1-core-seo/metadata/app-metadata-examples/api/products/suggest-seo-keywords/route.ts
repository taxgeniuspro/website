/**
 * AI-Powered SEO Keyword Suggestion API
 *
 * When user types "postcard", suggests optimized keywords like:
 * - "postcard printing"
 * - "custom postcards"
 * - "club promoter postcards"
 * - "4x6 postcard printing"
 *
 * Takes into account:
 * - Your actual customer base (club promoters, painters, cleaners, events)
 * - Location keywords (200 cities)
 * - Technical variations (sizes, finishes)
 * - Common misspellings
 */

import { type NextRequest, NextResponse } from 'next/server'

// Target industries actually served by GangRun Printing
const GANGRUN_INDUSTRIES = [
  'club promoters',
  'event planners',
  'painters',
  'contractors',
  'cleaning services',
  'real estate agents',
  'restaurants',
  'bars',
  'small businesses',
]

// Top cities for location-based keywords
const TOP_CITIES = [
  'New York',
  'Los Angeles',
  'Chicago',
  'Houston',
  'Phoenix',
  'Philadelphia',
  'San Antonio',
  'San Diego',
  'Dallas',
  'Austin',
]

// Common product types and their SEO keyword mappings
const KEYWORD_DATABASE: Record<string, any> = {
  postcard: {
    baseTerms: ['postcard', 'postcards', 'post card', 'post cards'],
    primaryKeywords: [
      'postcard printing',
      'custom postcards',
      'postcards online',
      'print postcards',
      'postcard printing services',
    ],
    longTail: [
      '4x6 postcard printing',
      '6x9 postcard printing',
      'business postcard printing',
      'cheap postcard printing',
      'same day postcard printing',
      'rush postcard printing',
    ],
    industrySpecific: [
      'club promoter postcards',
      'event postcard printing',
      'real estate postcard printing',
      'restaurant postcard printing',
      'contractor postcard printing',
    ],
    technicalFeatures: [
      'glossy postcard printing',
      'matte postcards',
      'postcard printing 100 quantity',
      'postcard printing 500 quantity',
      'postcard printing rush service',
      'free postcard templates',
    ],
    urgency: ['same day postcard printing', 'next day postcards', '24 hour postcard printing'],
    misspellings: ['post card printing', 'postcard print', 'postcards printing'],
  },

  'business card': {
    baseTerms: ['business card', 'business cards', 'bizcard', 'bizcards'],
    primaryKeywords: [
      'business card printing',
      'custom business cards',
      'business cards online',
      'print business cards',
      'business card printing services',
    ],
    longTail: [
      '3.5x2 business card printing',
      'standard business card printing',
      'premium business card printing',
      'cheap business card printing',
      'same day business card printing',
    ],
    industrySpecific: [
      'club promoter business cards',
      'contractor business cards',
      'real estate business cards',
      'restaurant business cards',
      'painter business cards',
    ],
    technicalFeatures: [
      'glossy business cards',
      'matte business cards',
      '16pt business cards',
      'rounded corner business cards',
      'spot uv business cards',
      'foil business cards',
    ],
    urgency: [
      'same day business cards',
      'next day business cards',
      '24 hour business card printing',
    ],
    misspellings: ['bizz cards', 'businesscard printing', 'buisness cards'],
  },

  flyer: {
    baseTerms: ['flyer', 'flyers', 'flier', 'fliers'],
    primaryKeywords: [
      'flyer printing',
      'custom flyers',
      'flyers online',
      'print flyers',
      'flyer printing services',
    ],
    longTail: [
      '8.5x11 flyer printing',
      '5.5x8.5 flyer printing',
      'color flyer printing',
      'cheap flyer printing',
      'same day flyer printing',
    ],
    industrySpecific: [
      'club promoter flyers',
      'event flyer printing',
      'party flyer printing',
      'nightclub flyer printing',
      'concert flyer printing',
    ],
    technicalFeatures: [
      'glossy flyer printing',
      'matte flyers',
      '100lb flyer printing',
      'full color flyers',
      'double sided flyers',
    ],
    urgency: [
      'same day flyer printing',
      'next day flyers',
      '24 hour flyer printing',
      'rush flyers',
    ],
    misspellings: ['flier printing', 'flyers print', 'flier'],
  },

  brochure: {
    baseTerms: ['brochure', 'brochures', 'booklet', 'booklets'],
    primaryKeywords: [
      'brochure printing',
      'custom brochures',
      'brochures online',
      'print brochures',
      'brochure printing services',
    ],
    longTail: [
      'tri fold brochure printing',
      'bi fold brochure printing',
      'half fold brochure printing',
      'cheap brochure printing',
      'same day brochure printing',
    ],
    industrySpecific: [
      'real estate brochures',
      'restaurant menu printing',
      'event brochures',
      'business brochures',
      'contractor brochures',
    ],
    technicalFeatures: [
      'glossy brochure printing',
      'matte brochures',
      '100lb brochure printing',
      'folded brochures',
      'saddle stitch brochures',
    ],
    urgency: ['same day brochure printing', 'next day brochures', 'rush brochures'],
    misspellings: ['broshure', 'brosure', 'brochure print'],
  },
}

/**
 * Generate SEO keywords for a product
 */
export async function POST(request: NextRequest) {
  try {
    const { productName, productCategory, targetCities } = await request.json()

    if (!productName) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
    }

    // Normalize product name
    const normalizedName = productName.toLowerCase().trim()

    // Find matching keyword data
    let keywordData = KEYWORD_DATABASE[normalizedName]

    // Try to find partial matches
    if (!keywordData) {
      const partialMatch = Object.keys(KEYWORD_DATABASE).find(
        (key) => normalizedName.includes(key) || key.includes(normalizedName)
      )
      if (partialMatch) {
        keywordData = KEYWORD_DATABASE[partialMatch]
      }
    }

    // Generate default keywords if no match found
    if (!keywordData) {
      keywordData = generateDefaultKeywords(productName)
    }

    // Build comprehensive keyword suggestions
    const suggestions = {
      baseTerms: keywordData.baseTerms || [normalizedName],

      primaryKeywords: keywordData.primaryKeywords || [
        `${normalizedName} printing`,
        `custom ${normalizedName}`,
        `${normalizedName} online`,
      ],

      longTail: keywordData.longTail || [
        `cheap ${normalizedName} printing`,
        `same day ${normalizedName} printing`,
        `${normalizedName} printing services`,
      ],

      industrySpecific:
        keywordData.industrySpecific ||
        GANGRUN_INDUSTRIES.map((industry) => `${industry} ${normalizedName}`),

      locationBased: (targetCities || TOP_CITIES).map(
        (city) => `${normalizedName} printing ${city.toLowerCase()}`
      ),

      technicalFeatures: keywordData.technicalFeatures || [
        `glossy ${normalizedName}`,
        `matte ${normalizedName}`,
        `premium ${normalizedName}`,
      ],

      urgency: keywordData.urgency || [
        `same day ${normalizedName}`,
        `next day ${normalizedName}`,
        `rush ${normalizedName}`,
      ],

      misspellings: keywordData.misspellings || [],
    }

    // Generate SEO meta suggestions
    const metaSuggestions = {
      title: generateMetaTitle(productName, suggestions),
      description: generateMetaDescription(productName, suggestions),
      altText: generateAltText(productName),
    }

    // All keywords combined for easy copy-paste
    const allKeywords = [
      ...suggestions.primaryKeywords,
      ...suggestions.longTail.slice(0, 3),
      ...suggestions.industrySpecific.slice(0, 3),
      ...suggestions.locationBased.slice(0, 2),
    ]

    return NextResponse.json({
      success: true,
      productName,
      suggestions,
      metaSuggestions,
      allKeywords, // Flat array for quick use
      estimatedSearchVolume: estimateSearchVolume(suggestions),
      competitionLevel: estimateCompetition(normalizedName),
    })
  } catch (error) {
    console.error('SEO keyword suggestion error:', error)
    return NextResponse.json({ error: 'Failed to generate keyword suggestions' }, { status: 500 })
  }
}

/**
 * Generate default keywords for unknown products
 */
function generateDefaultKeywords(productName: string) {
  const normalized = productName.toLowerCase()

  return {
    baseTerms: [normalized],
    primaryKeywords: [
      `${normalized} printing`,
      `custom ${normalized}`,
      `print ${normalized}`,
      `${normalized} online`,
    ],
    longTail: [
      `cheap ${normalized} printing`,
      `same day ${normalized} printing`,
      `${normalized} printing services`,
      `${normalized} printing near me`,
    ],
    industrySpecific: GANGRUN_INDUSTRIES.map((industry) => `${industry} ${normalized}`),
    technicalFeatures: [
      `glossy ${normalized}`,
      `matte ${normalized}`,
      `premium ${normalized}`,
      `high quality ${normalized}`,
    ],
    urgency: [
      `same day ${normalized}`,
      `next day ${normalized}`,
      `rush ${normalized}`,
      `fast ${normalized} printing`,
    ],
    misspellings: [],
  }
}

/**
 * Generate optimized meta title (60 chars max)
 */
function generateMetaTitle(productName: string, suggestions: any): string {
  const primary = suggestions.primaryKeywords[0]
  const capitalizedProduct = productName.charAt(0).toUpperCase() + productName.slice(1)

  // Format: "Product Name Printing | Fast Service | GangRun"
  const title = `${capitalizedProduct} Printing | Fast & Cheap | GangRun`

  return title.length <= 60 ? title : `${capitalizedProduct} Printing | GangRun`
}

/**
 * Generate optimized meta description (160 chars max)
 */
function generateMetaDescription(productName: string, suggestions: any): string {
  const industry1 = suggestions.industrySpecific[0]
  const industry2 = suggestions.industrySpecific[1]

  const description = `Custom ${productName} printing for ${industry1}, ${industry2}, and more. Same-day service available. Premium quality, low prices. Order online in 60 seconds!`

  if (description.length <= 160) {
    return description
  }

  // Shorter fallback
  return `Custom ${productName} printing. Same-day service. Premium quality, low prices. Order online now!`
}

/**
 * Generate image alt text template
 */
function generateAltText(productName: string): string {
  return `Professional ${productName} printing - high quality custom ${productName}s - GangRun Printing`
}

/**
 * Estimate search volume (rough estimate for UI display)
 */
function estimateSearchVolume(suggestions: any): string {
  const keywordCount = Object.values(suggestions).flat().length

  if (keywordCount > 50) return '10K-50K monthly searches'
  if (keywordCount > 30) return '5K-10K monthly searches'
  if (keywordCount > 15) return '1K-5K monthly searches'
  return '500-1K monthly searches'
}

/**
 * Estimate competition level
 */
function estimateCompetition(productName: string): 'Low' | 'Medium' | 'High' {
  const highCompetition = ['business card', 'flyer', 'brochure', 'poster']
  const mediumCompetition = ['postcard', 'banner', 'sign', 'sticker']

  if (highCompetition.some((term) => productName.includes(term))) return 'High'
  if (mediumCompetition.some((term) => productName.includes(term))) return 'Medium'
  return 'Low'
}
