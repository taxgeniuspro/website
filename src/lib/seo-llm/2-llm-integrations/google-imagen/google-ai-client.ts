/**
 * Google AI Studio (Imagen 4) Image Generation Client
 *
 * Purpose: Generate product images using Google's Imagen 4 API
 * Model: imagen-4.0-generate-001 (Latest as of Oct 2025)
 *
 * Integration: Works seamlessly with existing MinIO upload system
 *
 * @see https://ai.google.dev/gemini-api/docs/imagen
 */

import { GoogleGenAI } from '@google/genai'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Configuration for Google AI image generation
 */
export interface ImageGenerationConfig {
  /** Number of images to generate (1-4) */
  numberOfImages?: 1 | 2 | 3 | 4

  /** Image aspect ratio */
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9'

  /** Image size quality */
  imageSize?: '1K' | '2K'

  /** Control person generation in images */
  personGeneration?: 'dont_allow' | 'allow_adult' | 'allow_all'
}

/**
 * Options for generating a single product image
 */
export interface GenerateImageOptions {
  /** Text prompt describing the desired image */
  prompt: string

  /** Optional negative prompt (things to avoid) */
  negativePrompt?: string

  /** Configuration options */
  config?: ImageGenerationConfig
}

/**
 * Result from image generation
 */
export interface ImageGenerationResult {
  /** Base64 encoded image data */
  imageBytes: string

  /** Buffer ready for upload */
  buffer: Buffer

  /** Original prompt used */
  prompt: string

  /** Timestamp of generation */
  generatedAt: Date
}

/**
 * Image type for product photography
 */
export type ImageType = 'hero' | 'gallery-1' | 'gallery-2' | 'gallery-3'

/**
 * City-specific image generation options
 */
export interface CityImageOptions {
  cityName: string
  imageType: ImageType
  customPrompt?: string
}

// ============================================================================
// GOOGLE AI CLIENT CLASS
// ============================================================================

export class GoogleAIImageGenerator {
  private client: GoogleGenAI
  private readonly model = 'imagen-4.0-generate-001'

  /**
   * Initialize Google AI client
   * @param apiKey - Google AI Studio API key (defaults to env var)
   */
  constructor(apiKey?: string) {
    const key = apiKey || process.env.GOOGLE_AI_STUDIO_API_KEY

    if (!key) {
      throw new Error(
        'Google AI Studio API key not found. ' +
          'Set GOOGLE_AI_STUDIO_API_KEY environment variable or pass apiKey to constructor.'
      )
    }

    this.client = new GoogleGenAI({ apiKey: key })
  }

  /**
   * Generate a single image from a prompt
   *
   * @param options - Image generation options
   * @returns Generated image data
   *
   * @example
   * const generator = new GoogleAIImageGenerator();
   * const result = await generator.generateImage({
   *   prompt: 'Professional product photography of a red apple',
   *   config: { aspectRatio: '1:1', imageSize: '2K' }
   * });
   * // result.buffer can be uploaded to MinIO
   */
  async generateImage(options: GenerateImageOptions): Promise<ImageGenerationResult> {
    const { prompt, config = {} } = options

    // Validate prompt
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty')
    }

    if (prompt.length > 1440) {
      // ~480 tokens * 3 chars/token
      throw new Error('Prompt exceeds maximum length of 480 tokens (~1440 characters)')
    }

    // Set default config for product photography
    const imageConfig: ImageGenerationConfig = {
      numberOfImages: 1,
      aspectRatio: '4:3', // Good for 4x6 postcards
      imageSize: '2K', // Ultra quality
      personGeneration: 'dont_allow', // No people in product photos
      ...config,
    }

    try {
      const response = await this.client.models.generateImages({
        model: this.model,
        prompt: prompt,
        config: imageConfig,
      })

      if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error('No images generated in response')
      }

      const imageBytes = response.generatedImages[0].image.imageBytes
      const buffer = Buffer.from(imageBytes, 'base64')

      return {
        imageBytes,
        buffer,
        prompt,
        generatedAt: new Date(),
      }
    } catch (error: any) {
      // Enhanced error handling
      if (error.status === 401 || error.status === 403) {
        throw new Error(`Authentication failed: ${error.message}. Check your API key.`)
      }

      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please wait and try again.')
      }

      if (error.message?.includes('timeout')) {
        throw new Error('Image generation timed out. Please try again.')
      }

      throw new Error(`Image generation failed: ${error.message || 'Unknown error'}`)
    }
  }

  /**
   * Generate multiple images from multiple prompts
   *
   * @param prompts - Array of prompts
   * @param config - Shared configuration for all images
   * @returns Array of generated images
   *
   * @example
   * const results = await generator.generateBatch([
   *   'Red apple on white background',
   *   'Green apple on wooden table'
   * ]);
   */
  async generateBatch(
    prompts: string[],
    config?: ImageGenerationConfig
  ): Promise<ImageGenerationResult[]> {
    const results: ImageGenerationResult[] = []

    for (const prompt of prompts) {
      const result = await this.generateImage({ prompt, config })
      results.push(result)

      // Rate limiting: Wait 2 seconds between generations
      if (prompts.indexOf(prompt) < prompts.length - 1) {
        await this.wait(2000)
      }
    }

    return results
  }

  /**
   * Generate a city-specific product image with optimized prompts
   *
   * @param options - City image generation options
   * @returns Generated image data
   *
   * @example
   * const result = await generator.generateCityImage({
   *   cityName: 'New York',
   *   imageType: 'hero'
   * });
   */
  async generateCityImage(options: CityImageOptions): Promise<ImageGenerationResult> {
    const { cityName, imageType, customPrompt } = options

    // Use custom prompt if provided, otherwise generate from template
    const prompt = customPrompt || this.buildCityPrompt(cityName, imageType)

    // City-specific configuration
    const config: ImageGenerationConfig = {
      numberOfImages: 1,
      aspectRatio: imageType === 'hero' ? '4:3' : '1:1',
      imageSize: '2K',
      personGeneration: 'dont_allow',
    }

    return this.generateImage({ prompt, config })
  }

  /**
   * Build optimized prompt for city postcard images
   *
   * @param cityName - Name of the city
   * @param imageType - Type of image to generate
   * @returns Optimized prompt
   */
  private buildCityPrompt(cityName: string, imageType: ImageType): string {
    // City landmark mapping (can be expanded)
    const cityLandmarks: Record<string, string> = {
      'New York': 'New York City skyline with Empire State Building',
      'Los Angeles': 'Los Angeles skyline with Hollywood sign in distance',
      Chicago: 'Chicago skyline with Willis Tower',
      'San Francisco': 'Golden Gate Bridge',
      Miami: 'Miami Beach with Art Deco buildings',
      // Add more as template evolves
    }

    const landmark = cityLandmarks[cityName] || `${cityName} iconic landmark`

    const promptTemplates = {
      hero: `professional product photography of a 4x6 postcard mockup featuring ${landmark}, studio lighting, clean white background, ultra realistic, high quality, 4k resolution, product shot, marketing photography, sharp focus`,

      'gallery-1': `close-up detail shot of a 4x6 ${cityName} postcard on premium 16pt cardstock, showing paper texture and quality, professional lighting, soft shadow, product photography, clean composition`,

      'gallery-2': `angled 45-degree view of ${cityName} postcard on rustic wooden desk, natural window lighting, coffee cup nearby, lifestyle product photography, warm tones, authentic, cozy atmosphere`,

      'gallery-3': `hand holding ${cityName} postcard with ${landmark} softly blurred in background, outdoor setting, golden hour lighting, natural feel, authentic moment, shallow depth of field`,
    }

    return promptTemplates[imageType] || promptTemplates['hero']
  }

  /**
   * Utility: Wait for specified milliseconds
   */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick function to generate a single image
 *
 * @param prompt - Image description
 * @param config - Optional configuration
 * @returns Generated image buffer
 *
 * @example
 * const buffer = await generateProductImage(
 *   'Professional photo of red skateboard'
 * );
 */
export async function generateProductImage(
  prompt: string,
  config?: ImageGenerationConfig
): Promise<Buffer> {
  const generator = new GoogleAIImageGenerator()
  const result = await generator.generateImage({ prompt, config })
  return result.buffer
}

/**
 * Generate a city postcard image
 *
 * @param cityName - Name of the city
 * @param imageType - Type of image (hero or gallery)
 * @returns Generated image buffer
 *
 * @example
 * const buffer = await generateCityPostcardImage('New York', 'hero');
 */
export async function generateCityPostcardImage(
  cityName: string,
  imageType: ImageType = 'hero'
): Promise<Buffer> {
  const generator = new GoogleAIImageGenerator()
  const result = await generator.generateCityImage({ cityName, imageType })
  return result.buffer
}

// ============================================================================
// EXPORTS
// ============================================================================

export default GoogleAIImageGenerator
