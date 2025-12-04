import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import {
  uploadFile,
  getPresignedUploadUrl,
  BUCKETS,
  initializeBuckets,
  isMinioAvailable,
} from '@/lib/minio-client'
import { randomUUID } from 'crypto'

// Bucket initialization will happen at runtime when needed

export async function POST(request: NextRequest) {
  try {
    // Initialize buckets on first request if MinIO is available
    if (isMinioAvailable()) {
      await initializeBuckets().catch(console.error)
    }

    // Get user session if available (but don't require it for customer uploads)
    const { user, session } = await validateRequest()

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const orderId = formData.get('orderId') as string
    const fileType = formData.get('fileType') as string // 'design' | 'proof' | 'reference'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/svg+xml',
      'application/postscript', // AI files
      'application/x-photoshop', // PSD files
      'application/vnd.adobe.photoshop',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const uniqueFilename = `${randomUUID()}.${fileExt}`
    const objectPath = orderId
      ? `orders/${orderId}/${fileType}/${uniqueFilename}`
      : `uploads/${session?.user?.email || 'anonymous'}/${uniqueFilename}`

    // Convert File to Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to MinIO
    const uploadResult = await uploadFile(BUCKETS.UPLOADS, objectPath, buffer, {
      'original-name': file.name,
      'content-type': file.type,
      'uploaded-by': session?.user?.email || 'anonymous',
      'upload-date': new Date().toISOString(),
    })

    // If associated with an order, create file record in database
    if (orderId) {
      const fileRecord = await prisma.file.create({
        data: {
          orderId,
          filename: file.name,
          fileUrl: objectPath,
          fileSize: file.size,
          mimeType: file.type,
          uploadedBy: session?.user?.email || 'anonymous',
        },
      })

      return NextResponse.json({
        success: true,
        file: fileRecord,
        path: objectPath,
      })
    }

    // Generate file ID and URLs for response
    const fileId = randomUUID()
    const baseUrl = process.env.MINIO_PUBLIC_ENDPOINT || `http://localhost:9002`
    const fileUrl = `${baseUrl}/${BUCKETS.UPLOADS}/${objectPath}`
    const thumbnailUrl = file.type.startsWith('image/') ? fileUrl : null

    return NextResponse.json({
      success: true,
      fileId,
      url: fileUrl,
      thumbnailUrl,
      fileName: file.name,
      size: file.size,
      mimeType: file.type,
      path: objectPath,
    })
  } catch (error) {
    console.error('Upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')
    const filename = searchParams.get('filename')

    if (action === 'presigned' && filename) {
      // Generate presigned URL for direct upload
      const objectPath = `uploads/${session?.user?.email || 'anonymous'}/${filename}`
      const url = await getPresignedUploadUrl(BUCKETS.UPLOADS, objectPath)

      return NextResponse.json({
        url,
        path: objectPath,
      })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
  }
}
