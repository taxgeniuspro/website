import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { uploadProductImage } from '@/lib/minio-products'
import {
  createSuccessResponse,
  createErrorResponse,
  createAuthErrorResponse,
  createUploadErrorResponse,
  createTimeoutErrorResponse,
  generateRequestId,
} from '@/lib/api-response'
import { MAX_FILE_SIZE } from '@/lib/constants'
import { randomUUID } from 'crypto'

// Configure route segment for optimized uploads
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export const runtime = 'nodejs'
export const revalidate = 0

// GET /api/images - List all images
// Optional query params:
//   - productId: Filter images by product
//   - limit: Number of images to return
//   - offset: Pagination offset
//   - includeUsage: Include usage count in products
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const includeUsage = searchParams.get('includeUsage') === 'true'

    const where: Record<string, unknown> = {}
    if (productId) {
      where.productImages = {
        some: {
          productId: productId,
        },
      }
    }

    const include: Record<string, unknown> = {}
    if (includeUsage) {
      include._count = {
        select: {
          ProductImage: true,
        },
      }
      include.productImages = {
        include: {
          Product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }
    }

    const images = await prisma.image.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await prisma.image.count({ where })

    return NextResponse.json({
      images,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
  }
}

// POST /api/images - Upload and create a new image
export async function POST(request: NextRequest) {
  const headers = new Headers()
  headers.set('Connection', 'keep-alive')
  headers.set('Keep-Alive', 'timeout=60')

  const requestId = generateRequestId()

  try {
    // Check content length header first
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      return createUploadErrorResponse(
        'File size exceeds 10MB limit. Please compress the image or use a smaller file.',
        MAX_FILE_SIZE,
        requestId
      )
    }

    // Validate user session
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return createAuthErrorResponse('Admin access required', requestId)
    }

    // Parse form data with timeout
    let formData
    try {
      if (request.signal?.aborted) {
        return createErrorResponse('Request aborted', 499, undefined, requestId)
      }

      const formDataPromise = request.formData()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Form data parsing timeout')), 30000)
      )

      formData = (await Promise.race([formDataPromise, timeoutPromise])) as FormData
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        return createTimeoutErrorResponse('Form data parsing', 15000, requestId)
      }

      return createUploadErrorResponse(
        'File upload failed. The file may be too large (max 10MB) or corrupted.',
        MAX_FILE_SIZE,
        requestId
      )
    }

    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const tags = formData.get('tags') as string
    const category = (formData.get('category') as string) || 'general'

    if (!file) {
      return createErrorResponse('No file provided', 400, undefined, requestId)
    }

    if (!name) {
      return createErrorResponse('Image name is required', 400, undefined, requestId)
    }

    // Additional file validation
    if (file.size > MAX_FILE_SIZE) {
      return createUploadErrorResponse(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 10MB limit. Please compress the image.`,
        MAX_FILE_SIZE,
        requestId
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return createErrorResponse(
        'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.',
        400,
        { allowedTypes },
        requestId
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload image to MinIO (without product context)
    let uploadedImages
    try {
      uploadedImages = await uploadProductImage(
        buffer,
        file.name,
        file.type,
        name, // Use provided name as product name
        category, // Use category
        1, // Image index
        false // Not primary by default
      )
    } catch (uploadError) {
      if (uploadError instanceof Error) {
        if (uploadError.message.includes('MinIO') || uploadError.message.includes('storage')) {
          return NextResponse.json(
            { error: 'Storage service error. Please try again in a few moments.' },
            { status: 503 }
          )
        }
        if (uploadError.message.includes('Sharp') || uploadError.message.includes('processing')) {
          return NextResponse.json(
            { error: 'Image processing failed. Please ensure the file is a valid image.' },
            { status: 422 }
          )
        }
      }
      throw uploadError
    }

    // Save to database as standalone image
    const image = await prisma.image.create({
      data: {
        id: randomUUID(),
        name,
        description: description || null,
        url: uploadedImages.optimized || uploadedImages.large,
        thumbnailUrl: uploadedImages.thumbnail,
        largeUrl: uploadedImages.large,
        mediumUrl: uploadedImages.medium,
        webpUrl: uploadedImages.webp,
        avifUrl: uploadedImages.avif || null,
        blurDataUrl: uploadedImages.blurDataUrl,
        alt: uploadedImages.metadata.altText || name,
        width: uploadedImages.metadata.width,
        height: uploadedImages.metadata.height,
        fileSize: uploadedImages.metadata.size,
        mimeType: 'image/jpeg', // All processed images are JPEG
        category,
        tags: tags
          ? tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        metadata: {
          originalSize: uploadedImages.metadata.originalSize,
          compressedSize: uploadedImages.metadata.size,
          compressionRatio: uploadedImages.metadata.compressionRatio,
          profileUsed: uploadedImages.metadata.profileUsed,
        },
        updatedAt: new Date(),
      },
    })

    const responseData = {
      id: image.id,
      name: image.name,
      description: image.description,
      url: image.url,
      thumbnailUrl: image.thumbnailUrl,
      largeUrl: image.largeUrl,
      mediumUrl: image.mediumUrl,
      webpUrl: image.webpUrl,
      avifUrl: image.avifUrl,
      blurDataUrl: image.blurDataUrl,
      alt: image.alt,
      width: image.width,
      height: image.height,
      category: image.category,
      tags: image.tags,
      metadata: image.metadata,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    }

    return createSuccessResponse(responseData, 201, undefined, requestId)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('MinIO') || error.message.includes('storage')) {
        return createErrorResponse(
          'Storage service unavailable. Please try again later.',
          503,
          { storageError: true },
          requestId
        )
      } else if (error.message.includes('timeout')) {
        return createTimeoutErrorResponse('Image processing', undefined, requestId)
      } else if (error.message.includes('exceeds 10MB')) {
        return createUploadErrorResponse(error.message, MAX_FILE_SIZE, requestId)
      }
    }

    return createErrorResponse('Failed to upload image', 500, { uploadError: true }, requestId)
  }
}
