import { MAX_FILE_SIZE as FILE_SIZE_LIMIT, TAX_RATE, DEFAULT_WAREHOUSE_ZIP } from '@/lib/constants'
import { type NextRequest, NextResponse } from 'next/server'
import { uploadFile, BUCKETS, initializeBuckets, isMinioAvailable } from '@/lib/minio-client'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import path from 'path'
import { validateFileAdvanced } from '@/lib/security/advanced-file-validator'
import {
  checkFileUploadRateLimit,
  formatFileRateLimitError,
} from '@/lib/security/file-rate-limiter'
import { validateRequest } from '@/lib/auth'
import { logger } from '@/lib/logger-safe'

// Configuration
const MAX_FILE_SIZE = FILE_SIZE_LIMIT || 10 * 1024 * 1024 // 10MB per file
const MAX_TOTAL_SIZE = 50 * 1024 * 1024 // 50MB total per session
const MAX_FILES = 10 // Maximum 10 files per upload

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/svg+xml',
  'image/webp',
  'application/postscript', // AI files
  'application/x-photoshop', // PSD files
  'application/vnd.adobe.photoshop',
  'application/vnd.adobe.illustrator',
]

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// Generate session ID from request
function getSessionId(request: NextRequest): string {
  // Try to get session from cookie or header, fallback to IP-based
  const sessionHeader = request.headers.get('x-session-id')
  if (sessionHeader) return sessionHeader

  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'
  return `session_${ip.replace(/\./g, '_')}_${Date.now()}`
}

// Validate file type using MIME type and file signature
async function validateFileType(file: File): Promise<boolean> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return false
  }

  // Additional validation for common file signatures
  const buffer = Buffer.from(await file.arrayBuffer())
  const signature = buffer.subarray(0, 8).toString('hex')

  // PDF signature
  if (file.type === 'application/pdf' && !signature.startsWith('255044462d')) {
    return false
  }

  // JPEG signature
  if (
    (file.type === 'image/jpeg' || file.type === 'image/jpg') &&
    !signature.startsWith('ffd8ff')
  ) {
    return false
  }

  // PNG signature
  if (file.type === 'image/png' && !signature.startsWith('89504e47')) {
    return false
  }

  return true
}

// Generate thumbnail for image files
async function generateThumbnail(buffer: Buffer, mimeType: string): Promise<Buffer | null> {
  if (!IMAGE_TYPES.includes(mimeType)) {
    return null
  }

  try {
    return await sharp(buffer)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer()
  } catch (error) {
    return null
  }
}

// Clean filename for security
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100) // Limit length
}

export async function POST(request: NextRequest) {
  try {
    // Initialize MinIO if available
    if (isMinioAvailable()) {
      await initializeBuckets().catch(console.error)
    }

    // Get authentication info for rate limiting
    const { user } = await validateRequest()
    const sessionId = getSessionId(request)

    // Check rate limits before processing files
    const rateLimitResult = checkFileUploadRateLimit(
      request.headers,
      user?.id,
      sessionId,
      undefined, // We'll check individual files below
      1,
      user?.role === 'ADMIN'
    )

    if (!rateLimitResult.allowed) {
      const errorMessage = formatFileRateLimitError(rateLimitResult)
      logger.warn('File upload rate limit exceeded', {
        userId: user?.id,
        sessionId,
        reason: rateLimitResult.reason,
        blocked: rateLimitResult.blocked,
      })

      return NextResponse.json(
        { error: errorMessage },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Remaining-Files': rateLimitResult.remaining.files.toString(),
            'X-RateLimit-Remaining-Size': rateLimitResult.remaining.size.toString(),
          },
        }
      )
    }

    const formData = await request.formData()

    // Get all files from form data
    const files: File[] = []
    let totalSize = 0

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file') && value instanceof File) {
        files.push(value)
        totalSize += value.size
      }
    }

    // Validation
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        {
          error: `Maximum ${MAX_FILES} files allowed`,
        },
        { status: 400 }
      )
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        {
          error: `Total file size exceeds ${MAX_TOTAL_SIZE / 1024 / 1024}MB limit`,
        },
        { status: 400 }
      )
    }

    // Enhanced validation for each file
    for (const file of files) {
      // Convert file to buffer for advanced validation
      const buffer = await file.arrayBuffer()

      // Perform comprehensive validation including security checks
      const validationResult = await validateFileAdvanced(file.name, file.size, file.type, buffer)

      if (!validationResult.valid) {
        logger.warn('File validation failed', {
          filename: file.name,
          fileSize: file.size,
          mimeType: file.type,
          error: validationResult.error,
          threatLevel: validationResult.threatLevel,
          warnings: validationResult.warnings,
          userId: user?.id,
          sessionId,
        })

        return NextResponse.json(
          {
            error: `File "${file.name}": ${validationResult.error}`,
            securityDetails:
              validationResult.threatLevel === 'high'
                ? {
                    threatLevel: validationResult.threatLevel,
                    warnings: validationResult.warnings,
                  }
                : undefined,
          },
          { status: 400 }
        )
      }

      // Log security warnings for medium/high threat files
      if (validationResult.threatLevel && validationResult.threatLevel !== 'low') {
        logger.warn('File uploaded with security warnings', {
          filename: file.name,
          threatLevel: validationResult.threatLevel,
          warnings: validationResult.warnings,
          scanResults: validationResult.scanResults,
          userId: user?.id,
          sessionId,
        })
      }

      // Check basic file type (fallback validation)
      if (!(await validateFileType(file))) {
        return NextResponse.json(
          {
            error: `File "${file.name}" has invalid file type`,
          },
          { status: 400 }
        )
      }
    }

    // Process each file
    const uploadResults = []
    const uploadTimestamp = new Date().toISOString()

    for (const file of files) {
      const fileId = randomUUID()
      const fileExt = path.extname(file.name) || '.bin'
      const sanitizedName = sanitizeFilename(file.name)

      // Create paths
      const originalPath = `temp/${sessionId}/files/${fileId}${fileExt}`
      const thumbnailPath = `temp/${sessionId}/thumbnails/${fileId}.jpg`

      // Convert file to buffer
      const buffer = Buffer.from(await file.arrayBuffer())

      // Upload original file
      await uploadFile(BUCKETS.UPLOADS, originalPath, buffer, {
        'original-name': sanitizedName,
        'content-type': file.type,
        'session-id': sessionId,
        'upload-date': uploadTimestamp,
        'file-id': fileId,
        'temp-upload': 'true',
      })

      // Generate and upload thumbnail if it's an image
      let thumbnailUrl = null
      const thumbnail = await generateThumbnail(buffer, file.type)
      if (thumbnail) {
        await uploadFile(BUCKETS.UPLOADS, thumbnailPath, thumbnail, {
          'original-file': fileId,
          'content-type': 'image/jpeg',
          'session-id': sessionId,
          'upload-date': uploadTimestamp,
          'temp-upload': 'true',
        })
        thumbnailUrl = `/api/upload/temporary/thumbnail/${fileId}`
      }

      uploadResults.push({
        fileId,
        originalName: sanitizedName,
        size: file.size,
        mimeType: file.type,
        path: originalPath,
        thumbnailUrl,
        uploadedAt: uploadTimestamp,
        isImage: IMAGE_TYPES.includes(file.type),
      })
    }

    // Return success with all uploaded files
    return NextResponse.json({
      success: true,
      sessionId,
      files: uploadResults,
      totalFiles: files.length,
      totalSize,
      uploadedAt: uploadTimestamp,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to upload files. Please try again.',
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(): Promise<unknown> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-session-id',
    },
  })
}
