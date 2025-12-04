import { type NextRequest, NextResponse } from 'next/server'
import { getMinioClient, BUCKETS } from '@/lib/minio-client'
import sharp from 'sharp'

// Create a placeholder thumbnail (1x1 gray pixel)
const PLACEHOLDER_THUMBNAIL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params

    if (!fileId) {
      console.error('[Thumbnail API] No file ID provided')
      // Return placeholder instead of JSON error
      return new NextResponse(PLACEHOLDER_THUMBNAIL, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache',
        },
      })
    }

    // Try to find the thumbnail for this file ID
    const client = getMinioClient()

    // List objects to find the thumbnail path
    const objectsStream = client.listObjectsV2(BUCKETS.UPLOADS, `temp/`, true)

    let thumbnailPath = null

    for await (const obj of objectsStream) {
      if (obj.name?.includes(`thumbnails/${fileId}.jpg`)) {
        thumbnailPath = obj.name
        break
      }
    }

    if (!thumbnailPath) {
      // Return placeholder instead of JSON error
      return new NextResponse(PLACEHOLDER_THUMBNAIL, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache',
        },
      })
    }

    // Get the thumbnail object
    const thumbnailStream = await client.getObject(BUCKETS.UPLOADS, thumbnailPath)

    // Convert stream to buffer
    const chunks: Buffer[] = []
    for await (const chunk of thumbnailStream) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    // Return the thumbnail with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('[Thumbnail API] Error:', error)
    // Return placeholder instead of JSON error
    return new NextResponse(PLACEHOLDER_THUMBNAIL, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
      },
    })
  }
}
