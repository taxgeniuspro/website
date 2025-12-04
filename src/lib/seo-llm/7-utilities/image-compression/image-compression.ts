/**
 * Image Compression Utility
 *
 * Purpose: Compress and resize images before API calls to ensure they never exceed size limits
 * Use case: Prevents "image exceeds 5 MB maximum" errors from APIs
 *
 * Features:
 * - Automatic resizing for large images (max 1920px width/height)
 * - Progressive JPEG/PNG quality reduction
 * - Base64 size validation
 * - Retry logic with more aggressive compression
 */

import sharp from 'sharp'

// ============================================================================
// CONSTANTS
// ============================================================================

/** API-specific size limits */
export const API_LIMITS = {
  ANTHROPIC: 5 * 1024 * 1024, // 5 MB for Claude API
  GOOGLE_GEMINI: 20 * 1024 * 1024, // 20 MB total request for Gemini Vision API
  GOOGLE_IMAGEN: 20 * 1024 * 1024, // 20 MB for Imagen API (safe limit)
  OPENAI: 20 * 1024 * 1024, // 20 MB for GPT-4 Vision
  GENERAL: 10 * 1024 * 1024, // 10 MB general purpose
} as const

/** Maximum base64 size in bytes (default: 10 MB) */
export const MAX_BASE64_SIZE = API_LIMITS.GENERAL

/** Maximum image dimension (width or height) */
export const MAX_DIMENSION = 1920

/** Initial quality for JPEG/PNG compression */
export const INITIAL_QUALITY = 80

/** Minimum quality threshold (don't go below this) */
export const MIN_QUALITY = 30

// ============================================================================
// TYPES
// ============================================================================

export interface CompressionOptions {
  /** Maximum dimension (width or height) - default 1920px */
  maxDimension?: number

  /** Initial quality (1-100) - default 80 */
  initialQuality?: number

  /** Minimum quality threshold - default 30 */
  minQuality?: number

  /** Maximum base64 size in bytes - default 10 MB */
  maxBase64Size?: number

  /** Enable aggressive compression mode */
  aggressive?: boolean

  /** Target API (uses predefined size limits) - overrides maxBase64Size */
  targetAPI?: 'anthropic' | 'google-gemini' | 'google-imagen' | 'openai' | 'general'
}

export interface CompressionResult {
  /** Compressed image buffer */
  buffer: Buffer

  /** Base64 encoded string */
  base64: string

  /** Final size in bytes */
  sizeBytes: number

  /** Size in MB (formatted) */
  sizeMB: string

  /** Quality used for final compression */
  finalQuality: number

  /** Dimensions of final image */
  dimensions: {
    width: number
    height: number
  }

  /** Whether compression was needed */
  wasCompressed: boolean
}

// ============================================================================
// MAIN COMPRESSION FUNCTION
// ============================================================================

/**
 * Compress an image to ensure it never exceeds size limits
 *
 * @param input - Image buffer, file path, or base64 string
 * @param options - Compression options
 * @returns Compressed image data ready for API calls
 *
 * @example
 * const result = await compressImageForAPI(imageBuffer);
 * console.log(`Compressed to ${result.sizeMB}`);
 * // Use result.base64 in API call
 *
 * @throws Error if image cannot be compressed below size limit
 */
export async function compressImageForAPI(
  input: Buffer | string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  // Determine size limit based on target API (if specified)
  let sizeLimit = options.maxBase64Size || MAX_BASE64_SIZE

  if (options.targetAPI) {
    switch (options.targetAPI) {
      case 'anthropic':
        sizeLimit = API_LIMITS.ANTHROPIC
        break
      case 'google-gemini':
        sizeLimit = API_LIMITS.GOOGLE_GEMINI
        break
      case 'google-imagen':
        sizeLimit = API_LIMITS.GOOGLE_IMAGEN
        break
      case 'openai':
        sizeLimit = API_LIMITS.OPENAI
        break
      case 'general':
        sizeLimit = API_LIMITS.GENERAL
        break
    }
  }

  const {
    maxDimension = MAX_DIMENSION,
    initialQuality = INITIAL_QUALITY,
    minQuality = MIN_QUALITY,
    maxBase64Size = sizeLimit,
    aggressive = false,
  } = options

  // Convert input to buffer if it's a base64 string or file path
  let buffer: Buffer
  if (typeof input === 'string') {
    if (input.startsWith('data:')) {
      // Base64 data URI
      const base64Data = input.split(',')[1]
      buffer = Buffer.from(base64Data, 'base64')
    } else if (input.startsWith('/') || input.match(/^[A-Za-z]:\\/)) {
      // File path
      const fs = await import('fs/promises')
      buffer = await fs.readFile(input)
    } else {
      // Plain base64 string
      buffer = Buffer.from(input, 'base64')
    }
  } else {
    buffer = input
  }

  // Get original metadata
  const image = sharp(buffer)
  const metadata = await image.metadata()
  const originalWidth = metadata.width || 0
  const originalHeight = metadata.height || 0

  /*
    `📊 Original image: ${originalWidth}x${originalHeight}, ${(buffer.length / 1024 / 1024).toFixed(2)} MB`
  )
  */

  // Check if resizing is needed
  const needsResize = originalWidth > maxDimension || originalHeight > maxDimension

  // Calculate new dimensions while maintaining aspect ratio
  let targetWidth = originalWidth
  let targetHeight = originalHeight

  if (needsResize) {
    const aspectRatio = originalWidth / originalHeight
    if (originalWidth > originalHeight) {
      targetWidth = maxDimension
      targetHeight = Math.round(maxDimension / aspectRatio)
    } else {
      targetHeight = maxDimension
      targetWidth = Math.round(maxDimension * aspectRatio)
    }
  }

  // Determine format and compression strategy
  const format = metadata.format || 'jpeg'
  const isJPEG = format === 'jpeg' || format === 'jpg'
  const isPNG = format === 'png'

  // Try progressive quality reduction until size is acceptable
  let quality = aggressive ? Math.floor(initialQuality * 0.7) : initialQuality
  let compressedBuffer: Buffer | null = null
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts && quality >= minQuality) {
    attempts++

    let processedImage = sharp(buffer)

    // Resize if needed
    if (needsResize) {
      processedImage = processedImage.resize(targetWidth, targetHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
    }

    // Apply format-specific compression
    if (isJPEG) {
      processedImage = processedImage.jpeg({
        quality,
        progressive: true,
        mozjpeg: true, // Use mozjpeg for better compression
      })
    } else if (isPNG) {
      processedImage = processedImage.png({
        quality,
        compressionLevel: 9,
        progressive: true,
      })
    } else {
      // Convert other formats to JPEG for better compression
      processedImage = processedImage.jpeg({
        quality,
        progressive: true,
        mozjpeg: true,
      })
    }

    compressedBuffer = await processedImage.toBuffer()
    const base64 = compressedBuffer.toString('base64')
    const base64Size = Buffer.byteLength(base64, 'utf8')

    /*
      `🔄 Attempt ${attempts}: Quality ${quality}%, Size: ${(base64Size / 1024 / 1024).toFixed(2)} MB`
    )
    */

    if (base64Size <= maxBase64Size) {
      // Success! Size is acceptable
      const finalMetadata = await sharp(compressedBuffer).metadata()

      return {
        buffer: compressedBuffer,
        base64,
        sizeBytes: base64Size,
        sizeMB: (base64Size / 1024 / 1024).toFixed(2),
        finalQuality: quality,
        dimensions: {
          width: finalMetadata.width || targetWidth,
          height: finalMetadata.height || targetHeight,
        },
        wasCompressed: quality < initialQuality || needsResize,
      }
    }

    // Reduce quality for next attempt
    quality -= 10
  }

  // If we get here, we couldn't compress enough
  throw new Error(
    `Unable to compress image below ${(maxBase64Size / 1024 / 1024).toFixed(2)} MB. ` +
      `Final size: ${compressedBuffer ? (compressedBuffer.length / 1024 / 1024).toFixed(2) : 'unknown'} MB. ` +
      `Try using a smaller source image or increasing maxBase64Size.`
  )
}

/**
 * Quick validation: Check if a base64 string exceeds size limit
 *
 * @param base64 - Base64 encoded string
 * @param maxSize - Maximum size in bytes (default 5 MB)
 * @returns true if size is acceptable
 */
export function validateBase64Size(base64: string, maxSize = MAX_BASE64_SIZE): boolean {
  const sizeBytes = Buffer.byteLength(base64, 'utf8')
  return sizeBytes <= maxSize
}

/**
 * Get the size of a base64 string in bytes
 *
 * @param base64 - Base64 encoded string
 * @returns Size in bytes
 */
export function getBase64Size(base64: string): number {
  return Buffer.byteLength(base64, 'utf8')
}

/**
 * Format bytes to human-readable size
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "2.45 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// ============================================================================
// RETRY WRAPPER WITH AGGRESSIVE COMPRESSION
// ============================================================================

/**
 * Compress with automatic retry using more aggressive settings
 *
 * @param input - Image buffer or path
 * @param options - Compression options
 * @returns Compressed image data
 *
 * @example
 * try {
 *   const result = await compressWithRetry(largeImageBuffer);
 *   // Send result.base64 to API
 * } catch (error) {
 *   console.error('Could not compress image:', error);
 * }
 */
export async function compressWithRetry(
  input: Buffer | string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  try {
    // First attempt: Normal compression
    return await compressImageForAPI(input, options)
  } catch (error) {
    // Second attempt: Aggressive compression
    return await compressImageForAPI(input, {
      ...options,
      aggressive: true,
      initialQuality: 60,
      minQuality: 20,
    })
  }
}
