/**
 * SEO Brain - Winner Analyzer
 *
 * Analyzes top-performing city pages and extracts success patterns
 * for replication to underperformers
 */

import { prisma } from '@/lib/prisma'
import { ollamaClient } from './ollama-client'

export interface WinnerPattern {
  patternName: string
  contentStructure: {
    introLength: string
    benefitsCount: number
    faqCount: number
    localMentions: number
  }
  seoStructure: {
    titleFormat: string
    keywordDensity: string
    h2Count: number
  }
  conversionElements: {
    ctaPlacement: string[]
    priceDisplay: string
    urgencyTactic: string
  }
}

/**
 * Analyze top performers and extract patterns
 */
export async function analyzeWinners(params: { campaignId: string; topCount?: number }): Promise<{
  success: boolean
  pattern?: WinnerPattern
  sourceCities?: string[]
  avgScore?: number
}> {
  try {
    const { campaignId, topCount = 10 } = params

    // Get top performing city pages
    const topPages = await prisma.cityLandingPage.findMany({
      where: { landingPageSetId: campaignId },
      include: {
        _count: {
          select: { orders: true },
        },
      },
      orderBy: {
        revenue: 'desc',
      },
      take: topCount,
    })

    if (topPages.length === 0) {
      return { success: false }
    }

    // Calculate performance scores
    const pagesWithScores = topPages.map((page) => ({
      ...page,
      score: calculatePerformanceScore(page),
    }))

    const avgScore = pagesWithScores.reduce((sum, p) => sum + p.score, 0) / pagesWithScores.length

    // Prepare data for AI analysis
    const pagesData = pagesWithScores.map((page) => ({
      city: page.slug,
      score: page.score,
      views: page.views,
      conversions: page._count.orders,
      revenue: page.revenue.toNumber(),
      title: page.title,
      intro: page.aiIntro?.substring(0, 500), // First 500 chars
      benefitsCount: page.aiBenefits?.split('\n').length || 0,
      faqCount: Array.isArray(page.faqSchema) ? page.faqSchema.length : 0,
    }))

    // Ask AI to extract patterns
    const prompt = generatePatternExtractionPrompt(pagesData)
    const patternData = await ollamaClient.generateJSON<WinnerPattern>({
      prompt,
      temperature: 0.3, // Lower temperature for more consistent analysis
    })

    // Save pattern to database
    await prisma.cityWinnerPattern.create({
      data: {
        id: `pattern-${campaignId}-${Date.now()}`,
        productType: 'flyers', // TODO: Extract from campaign
        patternName: patternData.patternName,
        pattern: patternData as any,
        sourceCities: pagesData.map((p) => p.city),
        sourcePages: topPages.map((p) => p.id),
        avgPerformanceScore: Math.round(avgScore),
        minPerformanceScore: Math.round(Math.min(...pagesWithScores.map((p) => p.score))),
        timesReplicated: 0,
        timesSuccessful: 0,
        successRate: 0,
        confidence: 85, // Default confidence
        sampleSize: topPages.length,
      },
    })

    return {
      success: true,
      pattern: patternData,
      sourceCities: pagesData.map((p) => p.city),
      avgScore,
    }
  } catch (error) {
    console.error('[Winner Analyzer] Error:', error)
    return { success: false }
  }
}

/**
 * Calculate performance score for a page
 */
function calculatePerformanceScore(page: any): number {
  const conversions = page._count?.orders || 0
  const views = page.views || 0
  const revenue = page.revenue?.toNumber() || 0

  // Weighted score: conversions (50%) + views (30%) + revenue (20%)
  const conversionScore = Math.min(100, (conversions / 10) * 100)
  const viewScore = Math.min(100, (views / 500) * 100)
  const revenueScore = Math.min(100, (revenue / 1000) * 100)

  return conversionScore * 0.5 + viewScore * 0.3 + revenueScore * 0.2
}

/**
 * Generate prompt for pattern extraction
 */
function generatePatternExtractionPrompt(pagesData: any[]): string {
  return `You are an expert SEO analyst specializing in landing page optimization.

Analyze these top-performing city landing pages and extract the common success patterns.

TOP PERFORMING PAGES:
${JSON.stringify(pagesData, null, 2)}

Your task: Identify what makes these pages successful.

Look for patterns in:
1. **Content Structure** - Length, format, local references
2. **SEO Elements** - Title format, keyword usage, headings
3. **Conversion Elements** - CTA placement, urgency tactics, price display

OUTPUT FORMAT (JSON only, no explanation):
{
  "patternName": "high-conversion-local-focus",
  "contentStructure": {
    "introLength": "280-320 words",
    "benefitsCount": 8,
    "faqCount": 12,
    "localMentions": 4
  },
  "seoStructure": {
    "titleFormat": "[Quantity] [Product] in [City], [State] | [Turnaround] | $[Price]",
    "keywordDensity": "2.5%",
    "h2Count": 4
  },
  "conversionElements": {
    "ctaPlacement": ["after introduction", "after benefits", "end of FAQs"],
    "priceDisplay": "prominent in title and hero",
    "urgencyTactic": "turnaround time emphasis"
  }
}

Extract the pattern now (JSON only):`
}
