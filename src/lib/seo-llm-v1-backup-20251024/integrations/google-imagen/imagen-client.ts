import { logger } from '@/lib/logger';
/**
 * Google AI Studio (Imagen 4) Image Generation Client
 *
 * Purpose: Generate tax service and city images using Google's Imagen 4 API
 * Model: imagen-4.0-generate-001
 *
 * @see https://ai.google.dev/gemini-api/docs/imagen
 */

// Import will be available after: npm install @google/genai
// import { GoogleGenAI } from '@google/genai';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Configuration for Google AI image generation
 */
export interface ImageGenerationConfig {
  /** Number of images to generate (1-4) */
  numberOfImages?: 1 | 2 | 3 | 4;

  /** Image aspect ratio */
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

  /** Image size quality */
  imageSize?: '1K' | '2K';

  /** Control person generation in images */
  personGeneration?: 'dont_allow' | 'allow_adult' | 'allow_all';
}

/**
 * Options for generating a single product image
 */
export interface GenerateImageOptions {
  /** Text prompt describing the desired image */
  prompt: string;

  /** Optional negative prompt (things to avoid) */
  negativePrompt?: string;

  /** Configuration options */
  config?: ImageGenerationConfig;
}

/**
 * Result from image generation
 */
export interface ImageGenerationResult {
  success: boolean;
  /** Base64 encoded image data */
  imageBytes?: string;

  /** Buffer ready for upload */
  buffer?: Buffer;

  /** Original prompt used */
  prompt: string;

  /** Timestamp of generation */
  generatedAt: Date;

  /** Error message if failed */
  error?: string;

  /** Image URL (if uploaded to storage) */
  imageUrl?: string;
}

/**
 * Image type for tax service imagery
 */
export type TaxImageType = 'hero' | 'office' | 'team' | 'consultation';

/**
 * City-specific image generation options
 */
export interface CityImageOptions {
  cityName: string;
  serviceType: string; // 'personal-tax', 'business-tax', 'irs-resolution'
  imageType: TaxImageType;
  customPrompt?: string;
}

// ============================================================================
// GOOGLE AI CLIENT CLASS
// ============================================================================

export class GoogleAIImageGenerator {
  private apiKey: string;
  private readonly model = 'imagen-4.0-generate-001';

  /**
   * Initialize Google AI client
   * @param apiKey - Google AI Studio API key (defaults to env var)
   */
  constructor(apiKey?: string) {
    const key = apiKey || process.env.GOOGLE_AI_STUDIO_API_KEY;

    if (!key) {
      throw new Error(
        'Google AI Studio API key not found. ' +
          'Set GOOGLE_AI_STUDIO_API_KEY environment variable or pass apiKey to constructor.'
      );
    }

    this.apiKey = key;
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
   *   prompt: 'Professional tax office in New York City',
   *   config: { aspectRatio: '16:9', imageSize: '2K' }
   * });
   */
  async generateImage(options: GenerateImageOptions): Promise<ImageGenerationResult> {
    const { prompt, config = {} } = options;

    // Validate prompt
    if (!prompt || prompt.trim().length === 0) {
      return {
        success: false,
        prompt,
        generatedAt: new Date(),
        error: 'Prompt cannot be empty',
      };
    }

    if (prompt.length > 1440) {
      return {
        success: false,
        prompt,
        generatedAt: new Date(),
        error: 'Prompt exceeds maximum length of 480 tokens (~1440 characters)',
      };
    }

    // Set default config for tax service imagery
    const imageConfig: ImageGenerationConfig = {
      numberOfImages: 1,
      aspectRatio: '16:9', // Good for hero images
      imageSize: '2K', // Ultra quality
      personGeneration: 'allow_adult', // Tax professionals
      ...config,
    };

    try {
      // NOTE: Requires @google/genai package
      // Uncomment when package is installed:
      /*
      const { GoogleGenAI } = require('@google/genai');
      const client = new GoogleGenAI({ apiKey: this.apiKey });

      const response = await client.models.generateImages({
        model: this.model,
        prompt: prompt,
        config: imageConfig,
      });

      if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error('No images generated in response');
      }

      const imageBytes = response.generatedImages[0].image.imageBytes;
      const buffer = Buffer.from(imageBytes, 'base64');

      return {
        success: true,
        imageBytes,
        buffer,
        prompt,
        generatedAt: new Date(),
      };
      */

      // Placeholder until Google AI package is installed
      return {
        success: false,
        prompt,
        generatedAt: new Date(),
        error: 'Google AI package not installed. Run: npm install @google/genai',
      };
    } catch (error: any) {
      logger.error('[Google AI] Image generation error:', error);

      // Enhanced error handling
      if (error.status === 401 || error.status === 403) {
        return {
          success: false,
          prompt,
          generatedAt: new Date(),
          error: `Authentication failed: ${error.message}. Check your API key.`,
        };
      }

      if (error.status === 429) {
        return {
          success: false,
          prompt,
          generatedAt: new Date(),
          error: 'Rate limit exceeded. Please wait and try again.',
        };
      }

      return {
        success: false,
        prompt,
        generatedAt: new Date(),
        error: `Image generation failed: ${error.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Generate a city-specific tax service image with optimized prompts
   *
   * @param options - City image generation options
   * @returns Generated image data
   *
   * @example
   * const result = await generator.generateCityImage({
   *   cityName: 'New York',
   *   serviceType: 'personal-tax',
   *   imageType: 'hero'
   * });
   */
  async generateCityImage(options: CityImageOptions): Promise<ImageGenerationResult> {
    const { cityName, serviceType, imageType, customPrompt } = options;

    // Use custom prompt if provided, otherwise generate from template
    const prompt = customPrompt || this.buildCityPrompt(cityName, serviceType, imageType);

    // City-specific configuration
    const config: ImageGenerationConfig = {
      numberOfImages: 1,
      aspectRatio: imageType === 'hero' ? '16:9' : '4:3',
      imageSize: '2K',
      personGeneration:
        imageType === 'team' || imageType === 'consultation' ? 'allow_adult' : 'dont_allow',
    };

    return this.generateImage({ prompt, config });
  }

  /**
   * Build optimized prompt for tax service images
   *
   * @param cityName - Name of the city
   * @param serviceType - Type of tax service
   * @param imageType - Type of image to generate
   * @returns Optimized prompt
   */
  private buildCityPrompt(cityName: string, serviceType: string, imageType: TaxImageType): string {
    const serviceDescriptions: Record<string, string> = {
      'personal-tax': 'individual tax preparation services',
      'business-tax': 'business tax accounting services',
      'irs-resolution': 'IRS tax problem resolution',
      'tax-planning': 'strategic tax planning consultation',
    };

    const serviceDesc = serviceDescriptions[serviceType] || 'professional tax services';

    const promptTemplates: Record<TaxImageType, string> = {
      hero: `Professional modern tax office exterior with ${cityName} skyline in background, glass windows showing consultation rooms inside, clean professional signage for ${serviceDesc}, welcoming entrance, afternoon golden hour lighting, ultra realistic, architectural photography, 4k quality, professional business photography`,

      office: `Interior of modern professional tax office in ${cityName}, clean organized desk with laptop and tax documents, comfortable consultation area, professional decor, natural window lighting, plants, certificates on wall, warm professional atmosphere, business interior photography, 4k resolution`,

      team: `Professional tax preparers and accountants in modern ${cityName} office, diverse team of professionals in business casual attire, collaborative meeting around conference table with laptops and tax documents, modern office interior, natural lighting, professional business photography, authentic team photo, 4k quality`,

      consultation: `Tax professional meeting with client in modern ${cityName} office, one-on-one consultation, professional attire, reviewing tax documents on laptop, comfortable professional setting, natural lighting, trust and expertise atmosphere, professional business photography, 4k resolution`,
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
 * Quick function to generate a tax service image
 *
 * @param prompt - Image description
 * @param config - Optional configuration
 * @returns Generated image result
 *
 * @example
 * const result = await generateTaxServiceImage(
 *   'Modern tax office in downtown Chicago'
 * );
 */
export async function generateTaxServiceImage(
  prompt: string,
  config?: ImageGenerationConfig
): Promise<ImageGenerationResult> {
  const generator = new GoogleAIImageGenerator();
  return generator.generateImage({ prompt, config });
}

/**
 * Generate a city tax service image
 *
 * @param cityName - Name of the city
 * @param serviceType - Type of tax service
 * @param imageType - Type of image (hero or office)
 * @returns Generated image result
 *
 * @example
 * const result = await generateCityTaxImage('New York', 'personal-tax', 'hero');
 */
export async function generateCityTaxImage(
  cityName: string,
  serviceType: string,
  imageType: TaxImageType = 'hero'
): Promise<ImageGenerationResult> {
  const generator = new GoogleAIImageGenerator();
  return generator.generateCityImage({ cityName, serviceType, imageType });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default GoogleAIImageGenerator;
