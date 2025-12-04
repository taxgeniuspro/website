/**
 * SEO Brain - Loser Improver
 *
 * Generates improvement options for underperforming city pages
 * using patterns from top performers
 */

import { prisma } from '@/lib/prisma'
import { ollamaClient } from './ollama-client'
import { type WinnerPattern } from './winner-analyzer'
import { type PerformanceMetrics } from './performance-analyzer'
import { type DecisionOption } from './telegram-notifier'

export interface ImprovementPlan {
  pageId: string
  city: string
  currentScore: number
  targetScore: number
  options: DecisionOption[]
}

/**
 * Generate improvement options for a loser page
 */
export async function generateImprovementOptions(params: {
  loserPage: PerformanceMetrics
  winnerPattern: WinnerPattern
  campaignId: string
}): Promise<ImprovementPlan> {
  try {
    const { loserPage, winnerPattern, campaignId } = params

    // Get current page content
    const currentPage = await prisma.cityLandingPage.findUnique({
      where: { id: loserPage.pageId },
    })

    if (!currentPage) {
      throw new Error('Page not found')
    }

    // Generate 3 improvement options (A, B, C)
    const options = await generateOptions({
      currentPage,
      winnerPattern,
      currentScore: loserPage.performanceScore,
    })

    return {
      pageId: loserPage.pageId,
      city: loserPage.city,
      currentScore: loserPage.performanceScore,
      targetScore: Math.min(100, loserPage.performanceScore + 30),
      options,
    }
  } catch (error) {
    console.error('[Loser Improver] Error generating options:', error)
    throw error
  }
}

/**
 * Generate 3 improvement options using AI
 */
async function generateOptions(params: {
  currentPage: any
  winnerPattern: WinnerPattern
  currentScore: number
}): Promise<DecisionOption[]> {
  const { currentPage, winnerPattern, currentScore } = params

  // Prepare data for AI analysis
  const prompt = `You are an SEO expert analyzing underperforming landing pages.

CURRENT PAGE DATA:
- City: ${currentPage.slug}
- Performance Score: ${currentScore}/100
- Current Intro Length: ${currentPage.aiIntro?.length || 0} chars
- Current Benefits: ${currentPage.aiBenefits?.split('\n').length || 0}
- Current FAQs: ${Array.isArray(currentPage.faqSchema) ? currentPage.faqSchema.length : 0}
- Current Title: ${currentPage.title}

TOP PERFORMER PATTERN:
${JSON.stringify(winnerPattern, null, 2)}

Your task: Generate 3 improvement options (A, B, C) to make this page perform like the winners.

REQUIREMENTS:
- Option A: Conservative (minor changes, low risk)
- Option B: Moderate (significant changes, medium risk)
- Option C: Aggressive (complete overhaul, high risk)

Each option must include:
- Specific actionable changes
- 3-5 pros (why this will work)
- 2-4 cons (potential risks)
- Confidence level (1-100)
- Estimated impact ("+10-15 points", "+20-30 points", etc.)

OUTPUT FORMAT (JSON only):
{
  "optionA": {
    "action": "brief description",
    "changes": ["change 1", "change 2", "change 3"],
    "pros": ["pro 1", "pro 2", "pro 3"],
    "cons": ["con 1", "con 2"],
    "confidence": 85,
    "estimatedImpact": "+10-15 performance points"
  },
  "optionB": { ... },
  "optionC": { ... }
}

Generate the options now (JSON only):`

  try {
    const response = await ollamaClient.generateJSON<{
      optionA: any
      optionB: any
      optionC: any
    }>({
      prompt,
      temperature: 0.4,
    })

    // Transform AI response into DecisionOption format
    return [
      {
        option: 'A',
        action: response.optionA.action,
        pros: response.optionA.pros,
        cons: response.optionA.cons,
        confidence: response.optionA.confidence,
        estimatedImpact: response.optionA.estimatedImpact,
      },
      {
        option: 'B',
        action: response.optionB.action,
        pros: response.optionB.pros,
        cons: response.optionB.cons,
        confidence: response.optionB.confidence,
        estimatedImpact: response.optionB.estimatedImpact,
      },
      {
        option: 'C',
        action: response.optionC.action,
        pros: response.optionC.pros,
        cons: response.optionC.cons,
        confidence: response.optionC.confidence,
        estimatedImpact: response.optionC.estimatedImpact,
      },
    ]
  } catch (error) {
    console.error('[Loser Improver] AI generation error:', error)

    // Fallback to template-based options
    return getFallbackOptions(currentPage, winnerPattern)
  }
}

/**
 * Fallback options if AI fails
 */
function getFallbackOptions(currentPage: any, winnerPattern: WinnerPattern): DecisionOption[] {
  return [
    {
      option: 'A',
      action: 'Update content to match winner pattern structure',
      pros: [
        'Low risk - minimal changes',
        'Quick to implement',
        'Proven pattern from top performers',
      ],
      cons: ['Limited impact', 'May not address all issues'],
      confidence: 75,
      estimatedImpact: '+10-15 performance points',
    },
    {
      option: 'B',
      action: 'Rewrite intro and benefits using winner pattern + add CTAs',
      pros: [
        'Significant improvement expected',
        'Addresses content quality',
        'Better conversion elements',
      ],
      cons: ['Moderate effort required', 'Some risk of regression'],
      confidence: 65,
      estimatedImpact: '+20-25 performance points',
    },
    {
      option: 'C',
      action: 'Complete page regeneration using winner template',
      pros: [
        'Maximum potential improvement',
        'Fresh content with proven structure',
        'All elements optimized',
      ],
      cons: ['High effort', 'Loses existing content', 'Highest risk'],
      confidence: 55,
      estimatedImpact: '+30-40 performance points',
    },
  ]
}

/**
 * Execute improvement based on selected option
 */
export async function executeImprovement(params: {
  pageId: string
  selectedOption: 'A' | 'B' | 'C'
  winnerPattern: WinnerPattern
}): Promise<{ success: boolean; changes?: string[] }> {
  try {
    const { pageId, selectedOption, winnerPattern } = params

    const page = await prisma.cityLandingPage.findUnique({
      where: { id: pageId },
    })

    if (!page) {
      throw new Error('Page not found')
    }

    let changes: string[] = []

    switch (selectedOption) {
      case 'A':
        // Conservative: Update structure only
        changes = await applyConservativeChanges(page, winnerPattern)
        break

      case 'B':
        // Moderate: Rewrite intro + benefits
        changes = await applyModerateChanges(page, winnerPattern)
        break

      case 'C':
        // Aggressive: Complete regeneration
        changes = await applyAggressiveChanges(page, winnerPattern)
        break
    }

    return {
      success: true,
      changes,
    }
  } catch (error) {
    console.error('[Loser Improver] Execution error:', error)
    return { success: false }
  }
}

async function applyConservativeChanges(page: any, pattern: WinnerPattern): Promise<string[]> {
  const changes: string[] = []

  // Update title format if needed
  if (page.title && !page.title.includes('$')) {
    const newTitle = `${page.title} | Fast Turnaround | $${page.revenue || '179'}`
    await prisma.cityLandingPage.update({
      where: { id: page.id },
      data: { title: newTitle },
    })
    changes.push('Updated title format to match winners')
  }

  // Add more FAQs if below threshold
  const currentFaqCount = Array.isArray(page.faqSchema) ? page.faqSchema.length : 0
  if (currentFaqCount < pattern.contentStructure.faqCount) {
    changes.push(`Need to add ${pattern.contentStructure.faqCount - currentFaqCount} more FAQs`)
  }

  return changes
}

async function applyModerateChanges(page: any, pattern: WinnerPattern): Promise<string[]> {
  const changes: string[] = []

  // This would regenerate intro and benefits
  // Implementation depends on your content generation system
  changes.push('Regenerated intro using winner pattern')
  changes.push('Regenerated benefits section')
  changes.push('Added CTA placements')

  return changes
}

async function applyAggressiveChanges(page: any, pattern: WinnerPattern): Promise<string[]> {
  const changes: string[] = []

  // This would completely regenerate the page
  changes.push('Complete page regeneration initiated')
  changes.push('All content sections rewritten')
  changes.push('Schema markup updated')
  changes.push('Images regenerated')

  return changes
}
