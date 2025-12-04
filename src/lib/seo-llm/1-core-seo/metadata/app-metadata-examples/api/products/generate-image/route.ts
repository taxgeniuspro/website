/**
 * AI Image Generation API Route
 *
 * Generates product images using Google AI Imagen 4
 * Stores versions in a "drafts" folder for review
 */

import { type NextRequest, NextResponse } from 'next/server'
import { GoogleAIImageGenerator } from '@/lib/seo-llm/2-llm-integrations/google-imagen/google-ai-client'
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || '',
    secretAccessKey: process.env.MINIO_SECRET_KEY || '',
  },
  forcePathStyle: true,
})

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'gangrun-products'
const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL || 'http://localhost:9000'

interface GenerateImageRequest {
  prompt: string
  productName?: string
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9'
  imageSize?: '1K' | '2K'
}

/**
 * POST /api/products/generate-image
 *
 * Body:
 * {
 *   "prompt": "Professional photo of red business cards",
 *   "productName": "Business Cards - Red",
 *   "aspectRatio": "4:3",
 *   "imageSize": "2K"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateImageRequest = await request.json()
    const { prompt, productName, aspectRatio = '4:3', imageSize = '2K' } = body

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Initialize Google AI generator
    const generator = new GoogleAIImageGenerator()

    // Generate the image
    const result = await generator.generateImage({
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio,
        imageSize,
        personGeneration: 'dont_allow',
      },
    })

    // Create unique filename with timestamp
    const timestamp = Date.now()
    const sanitizedName = (productName || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 50)

    const filename = `drafts/${sanitizedName}-${timestamp}.png`

    // Upload to MinIO in "drafts" folder
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename,
        Body: result.buffer,
        ContentType: 'image/png',
        Metadata: {
          prompt: prompt.substring(0, 500), // Store prompt in metadata
          generatedAt: result.generatedAt.toISOString(),
          aspectRatio,
          imageSize,
        },
      })
    )

    // Construct public URL
    const imageUrl = `${MINIO_PUBLIC_URL}/${BUCKET_NAME}/${filename}`

    // Get count of all draft versions for this product
    const drafts = await listDraftVersions(sanitizedName)

    return NextResponse.json({
      success: true,
      data: {
        url: imageUrl,
        filename,
        prompt,
        generatedAt: result.generatedAt,
        aspectRatio,
        imageSize,
        draftVersions: drafts.length,
      },
    })
  } catch (error: any) {
    console.error('Image generation error:', error)

    // Handle specific errors
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'AI service not configured. Check API key.' },
        { status: 500 }
      )
    }

    if (error.message?.includes('Rate limit')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment and try again.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/products/generate-image?productName=business-cards
 *
 * Lists all draft versions for a product
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productName = searchParams.get('productName')

    if (!productName) {
      return NextResponse.json(
        { error: 'productName query parameter is required' },
        { status: 400 }
      )
    }

    const sanitizedName = productName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 50)

    const drafts = await listDraftVersions(sanitizedName)

    return NextResponse.json({
      success: true,
      data: {
        productName,
        drafts,
        count: drafts.length,
      },
    })
  } catch (error: any) {
    console.error('Error listing drafts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list draft versions' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/products/generate-image
 *
 * Delete a specific draft version or all drafts for a product
 *
 * Body:
 * {
 *   "filename": "drafts/business-cards-123456.png"  // Delete specific
 *   OR
 *   "productName": "business-cards",                // Delete all drafts
 *   "deleteAll": true
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename, productName, deleteAll } = body

    if (deleteAll && productName) {
      // Delete all drafts for this product
      const sanitizedName = productName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .substring(0, 50)

      const drafts = await listDraftVersions(sanitizedName)

      // Delete each draft
      const { DeleteObjectsCommand } = await import('@aws-sdk/client-s3')
      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET_NAME,
          Delete: {
            Objects: drafts.map((draft) => ({ Key: draft.filename })),
          },
        })
      )

      return NextResponse.json({
        success: true,
        message: `Deleted ${drafts.length} draft versions`,
        deletedCount: drafts.length,
      })
    } else if (filename) {
      // Delete specific file
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3')
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: filename,
        })
      )

      return NextResponse.json({
        success: true,
        message: 'Draft deleted successfully',
      })
    } else {
      return NextResponse.json(
        { error: 'Either filename or (productName + deleteAll) is required' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error deleting draft:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete draft' }, { status: 500 })
  }
}

/**
 * Helper: List all draft versions for a product name prefix
 */
async function listDraftVersions(productNamePrefix: string) {
  const response = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `drafts/${productNamePrefix}`,
    })
  )

  const drafts = (response.Contents || []).map((item) => ({
    filename: item.Key || '',
    url: `${MINIO_PUBLIC_URL}/${BUCKET_NAME}/${item.Key}`,
    size: item.Size || 0,
    lastModified: item.LastModified || new Date(),
  }))

  // Sort by newest first
  return drafts.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
}
