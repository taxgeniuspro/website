import OpenAI from 'openai'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface AutoTranslateOptions {
  sourceLocale: string
  targetLocale: string
  context?: string
  model?: string
  temperature?: number
}

export interface TranslationResult {
  translatedText: string
  confidence: number
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export class AutoTranslationService {
  private static instance: AutoTranslationService

  public static getInstance(): AutoTranslationService {
    if (!AutoTranslationService.instance) {
      AutoTranslationService.instance = new AutoTranslationService()
    }
    return AutoTranslationService.instance
  }

  /**
   * Translate text using OpenAI
   */
  async translateWithOpenAI(
    text: string,
    options: AutoTranslateOptions
  ): Promise<TranslationResult> {
    const {
      sourceLocale,
      targetLocale,
      context,
      model = 'gpt-4o-mini',
      temperature = 0.3,
    } = options

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    // Build the translation prompt
    const systemPrompt = this.buildSystemPrompt(sourceLocale, targetLocale, context)
    const userPrompt = this.buildUserPrompt(text, sourceLocale, targetLocale)

    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from OpenAI')
      }

      const result = JSON.parse(response)

      return {
        translatedText: result.translation,
        confidence: result.confidence || 0.8,
        model,
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
      }
    } catch (error) {
      throw new Error(
        `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Translate a single translation key
   */
  async translateKey(
    key: string,
    namespace: string,
    sourceLocale: string,
    targetLocale: string,
    sourceText: string,
    context?: string,
    tenantId?: string
  ): Promise<string> {
    // Check if translation already exists
    const existing = await prisma.translation.findFirst({
      where: {
        tenantId,
        key,
        namespace,
        locale: targetLocale,
      },
    })

    if (existing) {
      return existing.id
    }

    // Translate using OpenAI
    const result = await this.translateWithOpenAI(sourceText, {
      sourceLocale,
      targetLocale,
      context: context || `Translation for ${namespace}.${key}`,
    })

    // Save translation to database
    const translation = await prisma.translation.create({
      data: {
        tenantId,
        key,
        namespace,
        locale: targetLocale,
        value: result.translatedText,
        context,
        source: 'AUTO_OPENAI',
        autoTranslated: true,
        isApproved: false,
        confidence: result.confidence,
        translationModel: result.model,
        originalText: sourceText,
      },
    })

    return translation.id
  }

  /**
   * Batch translate missing translations
   */
  async batchTranslateMissing(
    sourceLocale: string,
    targetLocale: string,
    tenantId?: string,
    namespace?: string
  ): Promise<{
    translated: number
    skipped: number
    errors: string[]
  }> {
    const results = {
      translated: 0,
      skipped: 0,
      errors: [] as string[],
    }

    try {
      // Find all translations in source locale
      const sourceTranslations = await prisma.translation.findMany({
        where: {
          tenantId,
          locale: sourceLocale,
          namespace: namespace || undefined,
          isApproved: true,
        },
      })

      // Find existing translations in target locale
      const existingTargetKeys = await prisma.translation.findMany({
        where: {
          tenantId,
          locale: targetLocale,
          namespace: namespace || undefined,
        },
        select: {
          key: true,
          namespace: true,
        },
      })

      const existingKeysSet = new Set(existingTargetKeys.map((t) => `${t.namespace}.${t.key}`))

      // Filter out already translated keys
      const missingTranslations = sourceTranslations.filter(
        (t) => !existingKeysSet.has(`${t.namespace}.${t.key}`)
      )

      // Translate each missing key
      for (const source of missingTranslations) {
        try {
          await this.translateKey(
            source.key,
            source.namespace,
            sourceLocale,
            targetLocale,
            source.value,
            source.context,
            tenantId
          )
          results.translated++
        } catch (error) {
          results.errors.push(
            `${source.namespace}.${source.key}: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }

        // Add delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      results.skipped = sourceTranslations.length - missingTranslations.length
    } catch (error) {
      results.errors.push(
        `Batch operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    return results
  }

  /**
   * Get translation statistics
   */
  async getTranslationStats(tenantId?: string) {
    const stats = await prisma.translation.groupBy({
      by: ['locale'],
      where: {
        tenantId,
      },
      _count: {
        id: true,
      },
    })

    const approvedStats = await prisma.translation.groupBy({
      by: ['locale'],
      where: {
        tenantId,
        isApproved: true,
      },
      _count: {
        id: true,
      },
    })

    const autoStats = await prisma.translation.groupBy({
      by: ['locale'],
      where: {
        tenantId,
        autoTranslated: true,
      },
      _count: {
        id: true,
      },
    })

    return {
      total: stats,
      approved: approvedStats,
      autoGenerated: autoStats,
    }
  }

  /**
   * Build system prompt for translation
   */
  private buildSystemPrompt(sourceLocale: string, targetLocale: string, context?: string): string {
    const languageNames = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      nl: 'Dutch',
      ru: 'Russian',
      ja: 'Japanese',
      ko: 'Korean',
      zh: 'Chinese',
      ar: 'Arabic',
    }

    const sourceLang = languageNames[sourceLocale as keyof typeof languageNames] || sourceLocale
    const targetLang = languageNames[targetLocale as keyof typeof languageNames] || targetLocale

    return `You are a professional translator specializing in web application localization.

Your task is to translate text from ${sourceLang} to ${targetLang} for a printing services website.

Guidelines:
1. Maintain the original meaning and tone
2. Use appropriate terminology for the printing industry
3. Keep the same level of formality
4. Preserve any placeholders ({{variable}}) exactly as they are
5. Consider cultural context and local conventions
6. Ensure the translation sounds natural to native speakers

${context ? `Additional context: ${context}` : ''}

Respond in JSON format with:
{
  "translation": "the translated text",
  "confidence": 0.95 // your confidence level from 0.0 to 1.0
}`
  }

  /**
   * Build user prompt for translation
   */
  private buildUserPrompt(text: string, sourceLocale: string, targetLocale: string): string {
    return `Translate the following text from ${sourceLocale} to ${targetLocale}:

"${text}"`
  }

  /**
   * Validate translation quality
   */
  async validateTranslation(
    originalText: string,
    translatedText: string,
    sourceLocale: string,
    targetLocale: string
  ): Promise<{
    isValid: boolean
    confidence: number
    issues: string[]
  }> {
    const issues: string[] = []
    let confidence = 1.0

    // Check for obvious issues
    if (translatedText.length === 0) {
      issues.push('Translation is empty')
      confidence = 0
    }

    if (translatedText === originalText && sourceLocale !== targetLocale) {
      issues.push('Translation identical to source')
      confidence *= 0.3
    }

    // Check for preserved placeholders
    const placeholderRegex = /\{\{[^}]+\}\}/g
    const originalPlaceholders = originalText.match(placeholderRegex) || []
    const translatedPlaceholders = translatedText.match(placeholderRegex) || []

    if (originalPlaceholders.length !== translatedPlaceholders.length) {
      issues.push('Placeholder count mismatch')
      confidence *= 0.7
    }

    // Check for significant length differences (potential issue)
    const lengthRatio = translatedText.length / originalText.length
    if (lengthRatio > 3 || lengthRatio < 0.3) {
      issues.push('Unusual length difference')
      confidence *= 0.8
    }

    return {
      isValid: issues.length === 0,
      confidence,
      issues,
    }
  }
}
