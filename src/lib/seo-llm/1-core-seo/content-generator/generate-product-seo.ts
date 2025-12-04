/**
 * SEO Brain - Product Content Generation
 *
 * Generates SEO-optimized content for product pages using Ollama AI
 */

import { ollamaClient } from './ollama-client'
import { prisma } from '@/lib/prisma'

export interface ProductSEOOptions {
  productId: string
  productName: string
  productCategory?: string
  city?: string
  state?: string
  wordCount?: number
  temperature?: number
  forceRegenerate?: boolean
}

export interface ProductSEOResult {
  content: string
  wordCount: number
  generatedAt: Date
  model: string
  fromCache: boolean
}

/**
 * Generate SEO content for a product
 * Checks cache first, generates new content if needed
 */
export async function generateProductSEO(options: ProductSEOOptions): Promise<ProductSEOResult> {
  const {
    productId,
    productName,
    productCategory = '',
    city,
    state,
    wordCount = 150,
    temperature = 0.7,
    forceRegenerate = false,
  } = options

  // Check cache first (unless force regenerate)
  if (!forceRegenerate) {
    const cached = await prisma.productSEOContent.findFirst({
      where: {
        productId,
        city: city || null,
        state: state || null,
        approved: true,
      },
      orderBy: {
        generatedAt: 'desc',
      },
    })

    if (cached) {
      return {
        content: cached.content,
        wordCount: cached.wordCount,
        generatedAt: cached.generatedAt,
        model: cached.model,
        fromCache: true,
      }
    }
  }

  // Generate new content
  const locationContext = city && state ? ` in ${city}, ${state}` : ''
  const categoryContext = productCategory ? ` ${productCategory}` : ''

  const prompt = `Write a compelling ${wordCount}-word introduction for premium${categoryContext} printing services${locationContext}.

Product: ${productName}

Requirements:
- Write EXACTLY ${wordCount} words (target range: ${wordCount - 10} to ${wordCount + 10} words)
- Focus on the customer benefits and product value
- Include location-specific details${locationContext ? ' about the area' : ''}
- Use SEO-friendly language naturally
- Include a clear call-to-action
- Professional, engaging tone
- NO bullet points, just flowing paragraphs

IMPORTANT: Output ONLY the final content. No reasoning, no explanations, just the finished ${wordCount}-word introduction.`

  const startTime = Date.now()

  const content = await ollamaClient.generate({
    system:
      'You are a professional copywriter specializing in printing services. Output ONLY the final content, no reasoning or explanations.',
    prompt,
    temperature,
    maxTokens: wordCount * 2, // Safety margin
  })

  const generationTime = Date.now() - startTime
  const actualWordCount = content.trim().split(/\s+/).length

  // Save to database
  const saved = await prisma.productSEOContent.create({
    data: {
      productId,
      city: city || null,
      state: state || null,
      content: content.trim(),
      wordCount: actualWordCount,
      model: process.env.OLLAMA_MODEL || 'qwen2.5:32b',
      approved: false, // Require manual approval
    },
  })

  return {
    content: saved.content,
    wordCount: saved.wordCount,
    generatedAt: saved.generatedAt,
    model: saved.model,
    fromCache: false,
  }
}

/**
 * Generate SEO meta tags for a product
 */
export async function generateProductMetaTags(options: {
  productName: string
  productCategory?: string
  city?: string
  state?: string
}): Promise<{
  title: string
  description: string
  ogDescription: string
}> {
  const { productName, productCategory = '', city, state } = options

  const locationContext = city && state ? ` in ${city}, ${state}` : ''
  const categoryContext = productCategory ? ` ${productCategory}` : ''

  const prompt = `Generate SEO meta tags for${categoryContext} printing services${locationContext}.

Product: ${productName}

Generate in JSON format:
{
  "title": "SEO title (max 60 characters)",
  "description": "Meta description (max 160 characters)",
  "ogDescription": "Open Graph description (max 160 characters)"
}

Requirements:
- Title: Include product name and location
- Description: Compelling, benefit-focused, include CTA
- OG Description: Social media optimized version

IMPORTANT: Output ONLY valid JSON, no markdown formatting, no explanations.`

  const response = await ollamaClient.generate({
    system: 'You are an SEO expert. Output ONLY valid JSON, no markdown or explanations.',
    prompt,
    temperature: 0.6,
    maxTokens: 400,
  })

  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const metaTags = JSON.parse(jsonMatch[0])

    return {
      title: metaTags.title || `${productName} | GangRun Printing`,
      description:
        metaTags.description ||
        `Order premium ${productName}${locationContext}. Fast turnaround, professional quality.`,
      ogDescription: metaTags.ogDescription || metaTags.description || metaTags.title,
    }
  } catch (error) {
    console.error('[SEO Brain] Failed to parse meta tags:', error)
    // Fallback to defaults
    return {
      title: `${productName}${locationContext} | GangRun Printing`,
      description: `Order premium ${productName}${locationContext}. Fast turnaround, professional quality, competitive pricing.`,
      ogDescription: `Premium ${productName}${locationContext} from GangRun Printing`,
    }
  }
}

/**
 * Approve SEO content for publishing
 */
export async function approveProductSEO(seoContentId: string): Promise<void> {
  await prisma.productSEOContent.update({
    where: { id: seoContentId },
    data: {
      approved: true,
      publishedAt: new Date(),
    },
  })
}

/**
 * Get approved SEO content for a product
 */
export async function getApprovedProductSEO(
  productId: string,
  city?: string,
  state?: string
): Promise<string | null> {
  const seoContent = await prisma.productSEOContent.findFirst({
    where: {
      productId,
      city: city || null,
      state: state || null,
      approved: true,
    },
    orderBy: {
      publishedAt: 'desc',
    },
  })

  return seoContent?.content || null
}
