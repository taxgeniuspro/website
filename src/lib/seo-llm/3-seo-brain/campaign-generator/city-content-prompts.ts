/**
 * SEO Brain - City-Specific Content Generation Prompts
 *
 * Premium Quality (500-word content with 15 FAQs)
 * Uses Ollama for text generation
 * Uses Google Imagen 4 for city hero images
 */

import type { CityData } from './city-data-types'

/**
 * Generate city-specific introduction (500 words)
 */
export function generateCityIntroPrompt(params: {
  city: CityData
  productName: string
  productSpec: {
    quantity: number
    size: string
    material: string
    turnaround: string
    price: number
  }
}): string {
  const { city, productName, productSpec } = params

  return `You are an expert local marketing copywriter for a printing company.

Write a compelling 500-word introduction for this product page targeting customers in ${city.name}, ${city.state}.

PRODUCT DETAILS:
- Product: ${productName}
- Quantity: ${productSpec.quantity}
- Size: ${productSpec.size}
- Material: ${productSpec.material}
- Turnaround: ${productSpec.turnaround}
- Price: $${productSpec.price}
- Online Special Only

CITY CONTEXT:
- City: ${city.name}, ${city.state}
- Population: ${city.population?.toLocaleString() || 'Major metro area'}
- Known for: ${city.famousFor?.join(', ') || 'vibrant local economy'}
- Major industries: ${city.industries?.join(', ') || 'diverse businesses'}
- Popular neighborhoods: ${city.neighborhoods?.slice(0, 3).join(', ') || 'downtown area'}
- Local venues: ${city.venues?.slice(0, 5).join(', ') || 'various locations'}

WRITING REQUIREMENTS:
1. **Length:** Exactly 500 words (strict requirement)
2. **Local References:** Mention at least 5 specific ${city.name} locations, neighborhoods, or landmarks
3. **Target Audience:** Directly address local businesses (nightclub promoters, event planners, contractors, real estate agents, restaurants)
4. **Use Cases:** Provide 3-4 specific local examples (e.g., "Perfect for promoting your event at [specific venue]")
5. **Urgency:** Emphasize fast ${productSpec.turnaround} turnaround and online-only pricing
6. **Natural Keywords:** Include these naturally: "${productName.toLowerCase()}", "${productName.toLowerCase()} ${city.name.toLowerCase()}", "printing ${city.name.toLowerCase()}", "fast printing", "${productSpec.turnaround} printing"
7. **Tone:** Professional but friendly, local expert voice
8. **NO Generic Content:** Every sentence must feel specific to ${city.name}

STRUCTURE:
Paragraph 1 (100 words): Hook with local relevance, introduce product
Paragraph 2 (150 words): Detail product specs and why perfect for ${city.name} businesses
Paragraph 3 (150 words): Specific use cases with local venue/neighborhood mentions
Paragraph 4 (100 words): Pricing, turnaround time, call-to-action

OUTPUT FORMAT (Plain text, no markdown):
[Your 500-word introduction here]

EXAMPLE OPENING (Do NOT copy, just style reference):
"In the heart of ${city.name}'s bustling ${city.neighborhoods?.[0] || 'downtown'} district, businesses need marketing materials that match the city's energy. Whether you're promoting the latest event at ${city.venues?.[0] || 'a local venue'} or expanding your ${city.industries?.[0] || 'business'} presence across ${city.neighborhoods?.[1] || 'the metro area'}, our ${productName} delivers the quality and speed ${city.name} demands..."

Write now (500 words, ${city.name}-specific):`
}

/**
 * Generate city-specific benefits (10 benefits)
 */
export function generateCityBenefitsPrompt(params: {
  city: CityData
  productName: string
  productSpec: any
}): string {
  const { city, productName, productSpec } = params

  return `Generate 10 compelling benefits for ${productName} specifically for customers in ${city.name}, ${city.state}.

PRODUCT: ${productName} - ${productSpec.quantity} qty, ${productSpec.size}, ${productSpec.material}, ${productSpec.turnaround}, $${productSpec.price}

CITY: ${city.name}, ${city.state} (${city.population?.toLocaleString()} population)
INDUSTRIES: ${city.industries?.join(', ')}
VENUES: ${city.venues?.join(', ')}

REQUIREMENTS:
- Each benefit must reference ${city.name} specifically
- Mix practical benefits with local advantages
- Mention specific industries/venues when relevant
- Keep each benefit to 20-30 words
- Use active, compelling language

OUTPUT FORMAT (JSON):
{
  "benefits": [
    "Fast ${productSpec.turnaround} delivery anywhere in ${city.name}, from ${city.neighborhoods?.[0] || 'downtown'} to ${city.neighborhoods?.[1] || 'the suburbs'}",
    "Perfect for ${city.industries?.[0]} professionals who need quality prints for ${city.venues?.[0]} events",
    "[8 more benefits...]"
  ]
}

Generate all 10 benefits now (JSON only):`
}

/**
 * Generate city-specific FAQs (15 questions & answers)
 */
export function generateCityFAQsPrompt(params: {
  city: CityData
  productName: string
  productSpec: any
}): string {
  const { city, productName, productSpec } = params

  return `Generate 15 frequently asked questions and detailed answers for ${productName} in ${city.name}, ${city.state}.

PRODUCT: ${productName}
SPECS: ${productSpec.quantity} qty, ${productSpec.size}, ${productSpec.material}
TURNAROUND: ${productSpec.turnaround}
PRICE: $${productSpec.price}

CITY CONTEXT:
- Location: ${city.name}, ${city.state}
- Population: ${city.population?.toLocaleString()}
- ZIP Codes: ${city.zipCodes?.join(', ') || 'metro area'}

FAQ CATEGORIES (3-4 questions each):
1. **Delivery & Shipping** - Specific to ${city.name} locations
2. **Turnaround Time** - When can ${city.name} businesses expect delivery
3. **Customization** - Design options for ${city.name} target audiences
4. **Pricing** - Why this price, bulk options, ${city.name} specials
5. **Quality & Materials** - Paper stock details, durability

REQUIREMENTS:
- Questions must sound like real ${city.name} customer questions
- Answers must be 60-100 words, detailed and helpful
- Reference ${city.name} neighborhoods, landmarks, or delivery zones
- Include specific examples for ${city.name} businesses
- Use natural language, not robotic
- Include schema.org markup compatibility

OUTPUT FORMAT (JSON):
{
  "faqs": [
    {
      "question": "How quickly can I get ${productName} delivered in ${city.name}?",
      "answer": "We offer ${productSpec.turnaround} turnaround for ${city.name} customers. Orders placed by noon ship same day via USPS Priority to all ${city.name} ZIP codes including ${city.zipCodes?.[0]}, ${city.zipCodes?.[1]}, and ${city.zipCodes?.[2]}. Most ${city.neighborhoods?.[0] || 'downtown'} locations receive delivery within 2-3 business days. For urgent needs, we also offer express shipping to anywhere in ${city.state}..."
    },
    {
      "question": "[Next question]",
      "answer": "[Detailed answer...]"
    }
  ]
}

Generate all 15 FAQs now (JSON only):`
}

/**
 * Generate Google AI image prompt for city hero image
 */
export function generateCityHeroImagePrompt(params: {
  city: CityData
  productName: string
  productSpec: any
}): string {
  const { city, productName, productSpec } = params

  // Extract product type (flyers, business cards, etc.)
  const productType = productName.toLowerCase().includes('flyer')
    ? 'flyers'
    : productName.toLowerCase().includes('business card')
      ? 'business cards'
      : productName.toLowerCase().includes('postcard')
        ? 'postcards'
        : productName.toLowerCase().includes('brochure')
          ? 'brochures'
          : 'printed materials'

  // Get city's most iconic landmark/characteristic
  const cityCharacteristic = getCityCharacteristic(city)

  return `Professional product photography of ${productSpec.size} ${productType}, ${cityCharacteristic}, studio lighting with soft shadows, high-end marketing photography, ultra sharp focus, premium paper texture visible, 4k resolution, sophisticated composition`
}

/**
 * Get city's most iconic characteristic for image generation
 */
function getCityCharacteristic(city: CityData): string {
  const cityImageStyles: Record<string, string> = {
    // Major cities with iconic visuals
    'New York':
      'displayed on modern marble desk with Manhattan skyline visible through window in background',
    'Los Angeles':
      'on sleek glass table with palm trees and golden California sunset in soft-focus background',
    Chicago: 'on industrial concrete surface with Chicago skyline reflected in window behind',
    Miami: 'on white marble surface with Art Deco architectural elements and tropical plants',
    'San Francisco': 'on wooden desk with Golden Gate Bridge visible through office window',
    'Las Vegas': 'on black granite surface with neon lights softly glowing in background',
    Seattle: 'on rustic wooden table with Space Needle visible through rainy window',
    Boston: 'on classic mahogany desk with historic brownstone architecture in background',
    Austin: 'on reclaimed wood surface with Texas Hill Country landscape visible',
    Nashville: 'on vintage wooden surface with music city aesthetic and warm lighting',
    Denver: 'on modern desk with Rocky Mountains visible through large window',
    Portland: 'on sustainable bamboo surface with Pacific Northwest forest scene',
    Phoenix: 'on desert-inspired stone surface with Arizona sunset colors',
    Dallas: 'on sleek modern desk with Texas skyline in background',
    Houston: 'on contemporary surface with Space City modern architecture',
    Atlanta: 'on polished surface with Southern modern aesthetic',
    Philadelphia: 'on classic desk with historic architecture visible',
    Washington: 'on elegant marble surface with monuments in soft background',
  }

  // Check if city has specific style
  const cityName = city.name.split(',')[0] // Remove state if present
  if (cityImageStyles[cityName]) {
    return cityImageStyles[cityName]
  }

  // Default based on city characteristics
  if (city.famousFor?.some((f) => f.toLowerCase().includes('beach'))) {
    return 'on white surface with coastal/beach aesthetic and natural lighting'
  }
  if (city.famousFor?.some((f) => f.toLowerCase().includes('mountain'))) {
    return 'on wooden surface with mountain landscape visible in background'
  }
  if (city.famousFor?.some((f) => f.toLowerCase().includes('tech'))) {
    return 'on minimalist modern desk with tech startup aesthetic'
  }

  // Generic but professional
  return `fanned out on clean white surface with ${city.state} map subtly visible in background`
}

/**
 * Generate complete city page content (all-in-one)
 */
export async function generateCompleteCityContent(params: {
  city: CityData
  productName: string
  productSpec: any
  ollamaClient: any
}): Promise<{
  introduction: string
  benefits: string[]
  faqs: Array<{ question: string; answer: string }>
  imagePrompt: string
}> {
  const { city, productName, productSpec, ollamaClient } = params

  // Generate introduction (500 words)
  const introPrompt = generateCityIntroPrompt({ city, productName, productSpec })
  const introResponse = await ollamaClient.generate(introPrompt)
  const introduction = introResponse.trim()

  // Generate benefits (10 items)
  const benefitsPrompt = generateCityBenefitsPrompt({ city, productName, productSpec })
  const benefitsResponse = await ollamaClient.generate(benefitsPrompt)
  const benefitsData = JSON.parse(benefitsResponse)
  const benefits = benefitsData.benefits

  // Generate FAQs (15 items)
  const faqsPrompt = generateCityFAQsPrompt({ city, productName, productSpec })
  const faqsResponse = await ollamaClient.generate(faqsPrompt)
  const faqsData = JSON.parse(faqsResponse)
  const faqs = faqsData.faqs

  // Generate image prompt
  const imagePrompt = generateCityHeroImagePrompt({ city, productName, productSpec })

  return {
    introduction,
    benefits,
    faqs,
    imagePrompt,
  }
}
