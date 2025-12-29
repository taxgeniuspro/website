/**
 * OpenAI DALL-E Image Generation Client
 *
 * Purpose: Generate product images using OpenAI's DALL-E API
 * Model: dall-e-3 (Latest as of Dec 2025)
 *
 * Integration: Works seamlessly with existing disk storage system
 *
 * @see https://platform.openai.com/docs/guides/images
 */

import OpenAI from 'openai';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Configuration for image generation
 */
export interface ImageGenerationConfig {
  /** Number of images to generate (DALL-E 3 only supports 1) */
  numberOfImages?: 1;

  /** Image aspect ratio (mapped to size) */
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

  /** Image quality */
  quality?: 'standard' | 'hd';

  /** Image style */
  style?: 'vivid' | 'natural';
}

/**
 * Options for generating a single product image
 */
export interface GenerateImageOptions {
  /** Text prompt describing the desired image */
  prompt: string;

  /** Optional negative prompt (things to avoid) - appended to prompt */
  negativePrompt?: string;

  /** Configuration options */
  config?: ImageGenerationConfig;
}

/**
 * Result from image generation
 */
export interface ImageGenerationResult {
  /** Base64 encoded image data */
  imageBytes: string;

  /** Buffer ready for upload */
  buffer: Buffer;

  /** Original prompt used */
  prompt: string;

  /** Timestamp of generation */
  generatedAt: Date;
}

/**
 * Image type for product photography
 */
export type ImageType = 'hero' | 'gallery-1' | 'gallery-2' | 'gallery-3';

/**
 * City-specific image generation options
 */
export interface CityImageOptions {
  cityName: string;
  imageType: ImageType;
  customPrompt?: string;
}

// ============================================================================
// ASPECT RATIO TO SIZE MAPPING
// ============================================================================

const aspectRatioToSize: Record<string, '1024x1024' | '1792x1024' | '1024x1792'> = {
  '1:1': '1024x1024',
  '4:3': '1792x1024', // Landscape
  '3:4': '1024x1792', // Portrait
  '16:9': '1792x1024', // Landscape
  '9:16': '1024x1792', // Portrait
};

// ============================================================================
// OPENAI IMAGE GENERATOR CLASS
// ============================================================================

export class GoogleAIImageGenerator {
  private client: OpenAI;
  private readonly model = 'dall-e-3';

  /**
   * Initialize OpenAI client
   * @param apiKey - OpenAI API key (defaults to env var)
   */
  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;

    if (!key) {
      throw new Error(
        'OpenAI API key not found. ' +
          'Set OPENAI_API_KEY environment variable or pass apiKey to constructor.'
      );
    }

    this.client = new OpenAI({ apiKey: key });
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
   *   config: { aspectRatio: '1:1', quality: 'hd' }
   * });
   * // result.buffer can be uploaded to disk storage
   */
  async generateImage(options: GenerateImageOptions): Promise<ImageGenerationResult> {
    const { prompt, negativePrompt, config = {} } = options;

    // Validate prompt
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    if (prompt.length > 4000) {
      throw new Error('Prompt exceeds maximum length of 4000 characters');
    }

    // Build full prompt with negative prompt if provided
    let fullPrompt = prompt;
    if (negativePrompt) {
      fullPrompt += `. Avoid: ${negativePrompt}`;
    }

    // Map aspect ratio to size
    const size = aspectRatioToSize[config.aspectRatio || '4:3'] || '1792x1024';

    try {
      const response = await this.client.images.generate({
        model: this.model,
        prompt: fullPrompt,
        n: 1,
        size,
        quality: config.quality || 'hd',
        style: config.style || 'natural',
        response_format: 'b64_json',
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No images generated in response');
      }

      const imageBytes = response.data[0].b64_json!;
      const buffer = Buffer.from(imageBytes, 'base64');

      return {
        imageBytes,
        buffer,
        prompt,
        generatedAt: new Date(),
      };
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      // Enhanced error handling
      if (err.status === 401 || err.status === 403) {
        throw new Error(`Authentication failed: ${err.message}. Check your API key.`);
      }

      if (err.status === 429) {
        throw new Error('Rate limit exceeded. Please wait and try again.');
      }

      if (err.message?.includes('timeout')) {
        throw new Error('Image generation timed out. Please try again.');
      }

      throw new Error(`Image generation failed: ${err.message || 'Unknown error'}`);
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
    const results: ImageGenerationResult[] = [];

    for (const prompt of prompts) {
      const result = await this.generateImage({ prompt, config });
      results.push(result);

      // Rate limiting: Wait 2 seconds between generations
      if (prompts.indexOf(prompt) < prompts.length - 1) {
        await this.wait(2000);
      }
    }

    return results;
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
    const { cityName, imageType, customPrompt } = options;

    // Use custom prompt if provided, otherwise generate from template
    const prompt = customPrompt || this.buildCityPrompt(cityName, imageType);

    // City-specific configuration
    const config: ImageGenerationConfig = {
      numberOfImages: 1,
      aspectRatio: imageType === 'hero' ? '4:3' : '1:1',
      quality: 'hd',
      style: 'natural',
    };

    return this.generateImage({ prompt, config });
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
    };

    const landmark = cityLandmarks[cityName] || `${cityName} iconic landmark`;

    const promptTemplates = {
      hero: `professional product photography of a 4x6 postcard mockup featuring ${landmark}, studio lighting, clean white background, ultra realistic, high quality, 4k resolution, product shot, marketing photography, sharp focus`,

      'gallery-1': `close-up detail shot of a 4x6 ${cityName} postcard on premium 16pt cardstock, showing paper texture and quality, professional lighting, soft shadow, product photography, clean composition`,

      'gallery-2': `angled 45-degree view of ${cityName} postcard on rustic wooden desk, natural window lighting, coffee cup nearby, lifestyle product photography, warm tones, authentic, cozy atmosphere`,

      'gallery-3': `hand holding ${cityName} postcard with ${landmark} softly blurred in background, outdoor setting, golden hour lighting, natural feel, authentic moment, shallow depth of field`,
    };

    return promptTemplates[imageType] || promptTemplates['hero'];
  }

  /**
   * Utility: Wait for specified milliseconds
   */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
  const generator = new GoogleAIImageGenerator();
  const result = await generator.generateImage({ prompt, config });
  return result.buffer;
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
  const generator = new GoogleAIImageGenerator();
  const result = await generator.generateCityImage({ cityName, imageType });
  return result.buffer;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default GoogleAIImageGenerator;
