import { type NextRequest, NextResponse } from 'next/server'
import { getMinioClient, BUCKETS } from '@/lib/minio-client'

// Cleanup temporary files older than specified time
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, maxAge = 24 } = body // maxAge in hours, default 24 hours

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const client = getMinioClient()
    const cutoffTime = new Date(Date.now() - maxAge * 60 * 60 * 1000)

    let deletedFiles = 0
    const objectsToDelete: string[] = []

    // List all objects in the temp folder for this session
    const objectsStream = client.listObjectsV2(BUCKETS.UPLOADS, `temp/${sessionId}/`, true)

    for await (const obj of objectsStream) {
      if (obj.name && obj.lastModified && obj.lastModified < cutoffTime) {
        objectsToDelete.push(obj.name)
      }
    }

    // Delete objects in batches
    if (objectsToDelete.length > 0) {
      await client.removeObjects(BUCKETS.UPLOADS, objectsToDelete)
      deletedFiles = objectsToDelete.length
    }

    return NextResponse.json({
      success: true,
      sessionId,
      deletedFiles,
      cutoffTime: cutoffTime.toISOString(),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}

// Global cleanup for all expired temporary files
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const maxAge = parseInt(url.searchParams.get('maxAge') || '24') // hours

    const client = getMinioClient()
    const cutoffTime = new Date(Date.now() - maxAge * 60 * 60 * 1000)

    let deletedFiles = 0
    const objectsToDelete: string[] = []

    // List all objects in temp folder
    const objectsStream = client.listObjectsV2(BUCKETS.UPLOADS, 'temp/', true)

    for await (const obj of objectsStream) {
      if (obj.name && obj.lastModified && obj.lastModified < cutoffTime) {
        objectsToDelete.push(obj.name)
      }
    }

    // Delete in batches of 1000 (MinIO limit)
    const batchSize = 1000
    for (let i = 0; i < objectsToDelete.length; i += batchSize) {
      const batch = objectsToDelete.slice(i, i + batchSize)
      await client.removeObjects(BUCKETS.UPLOADS, batch)
      deletedFiles += batch.length
    }

    return NextResponse.json({
      success: true,
      deletedFiles,
      cutoffTime: cutoffTime.toISOString(),
      message: `Cleaned up ${deletedFiles} expired temporary files`,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Global cleanup failed' }, { status: 500 })
  }
}
