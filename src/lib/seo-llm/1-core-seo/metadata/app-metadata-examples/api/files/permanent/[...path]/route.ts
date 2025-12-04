import { type NextRequest, NextResponse } from 'next/server'
import { getMinioClient, BUCKETS } from '@/lib/minio-client'
import { validateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger-safe'

/**
 * GET /api/files/permanent/[...path]
 * Serve permanent files from MinIO with proper access control
 * Supports both direct file access and thumbnail access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const fullPath = path.join('/')

    // Validate authentication for file access
    const { user } = await validateRequest()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse the path to extract file ID and determine file type
    let fileId: string
    let isThumbail = false

    if (path[0] === 'thumbnails') {
      // Thumbnail access: /api/files/permanent/thumbnails/{fileId}.jpg
      isThumbail = true
      fileId = path[1]?.replace(/\.[^/.]+$/, '') || '' // Remove extension
    } else {
      // Direct file access: /api/files/permanent/{fileId}.{ext}
      fileId = path[0]?.replace(/\.[^/.]+$/, '') || '' // Remove extension
    }

    if (!fileId) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    // Find the OrderFile record to verify access permissions
    const orderFile = await prisma.orderFile.findFirst({
      where: {
        OR: [{ fileUrl: { contains: fileId } }, { thumbnailUrl: { contains: fileId } }],
      },
      include: {
        Order: {
          select: {
            id: true,
            userId: true,
            email: true,
          },
        },
      },
    })

    if (!orderFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Check access permissions
    const hasAccess =
      user.role === 'ADMIN' || // Admins can access all files
      orderFile.Order.userId === user.id || // User owns the order
      (orderFile.Order.email === user.email && !orderFile.Order.userId) // Guest order with matching email

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get file from MinIO
    try {
      const client = await getMinioClient()

      // Reconstruct the MinIO path from the OrderFile metadata or URL
      let minioPath: string

      if (isThumbail && orderFile.thumbnailUrl) {
        // Extract path from thumbnail URL
        minioPath = orderFile.thumbnailUrl.replace('/api/files/permanent/', '')
      } else {
        // Extract path from file URL
        minioPath = orderFile.fileUrl.replace('/api/files/permanent/', '')
      }

      // For files stored with the new migration system, reconstruct the full path
      if (!minioPath.includes('/')) {
        // Legacy format - need to search for the file
        const year = new Date(orderFile.createdAt).getFullYear()
        const month = String(new Date(orderFile.createdAt).getMonth() + 1).padStart(2, '0')
        const fileType = orderFile.fileType.toLowerCase()

        if (isThumbail) {
          minioPath = `files/${year}/${month}/${orderFile.orderId}/${fileType}/thumbnails/${fileId}.jpg`
        } else {
          // Try common extensions
          const extensions = ['.pdf', '.jpg', '.png', '.ai', '.psd']
          for (const ext of extensions) {
            try {
              const testPath = `files/${year}/${month}/${orderFile.orderId}/${fileType}/${fileId}${ext}`
              await client.statObject(BUCKETS.UPLOADS, testPath)
              minioPath = testPath
              break
            } catch {
              continue
            }
          }
        }
      }

      // Get file metadata and stream
      const stat = await client.statObject(BUCKETS.UPLOADS, minioPath)
      const stream = await client.getObject(BUCKETS.UPLOADS, minioPath)

      // Set appropriate headers
      const response = new NextResponse(stream as any)
      response.headers.set(
        'Content-Type',
        stat.metaData?.['content-type'] || 'application/octet-stream'
      )
      response.headers.set('Content-Length', stat.size.toString())

      // Set cache headers for better performance
      response.headers.set('Cache-Control', 'private, max-age=3600') // 1 hour cache
      response.headers.set('ETag', stat.etag || '')

      // Set content disposition for downloads
      const filename = orderFile.filename || `file-${fileId}`
      response.headers.set('Content-Disposition', `inline; filename="${filename}"`)

      logger.info('Permanent file served', {
        fileId,
        orderId: orderFile.orderId,
        userId: user.id,
        isThumbail,
      })

      return response
    } catch (minioError) {
      logger.error('Failed to retrieve file from MinIO', {
        fileId,
        minioError: minioError instanceof Error ? minioError.message : String(minioError),
      })

      return NextResponse.json({ error: 'File temporarily unavailable' }, { status: 503 })
    }
  } catch (error) {
    logger.error('Error serving permanent file', {
      path: params,
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * HEAD /api/files/permanent/[...path]
 * Get file metadata without downloading the content
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Reuse the GET logic but return only headers
  const response = await GET(request, { params })

  if (response.status === 200) {
    // Return headers only
    return new NextResponse(null, {
      status: 200,
      headers: response.headers,
    })
  }

  return response
}
