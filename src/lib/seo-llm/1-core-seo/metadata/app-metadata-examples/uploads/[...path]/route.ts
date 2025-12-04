import { type NextRequest, NextResponse } from 'next/server'
import { getMinioClient } from '@/lib/minio'

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = params.path.join('/')

    if (!path) {
      return new NextResponse('Path required', { status: 400 })
    }

    const bucketName = 'gangrun-uploads'

    const client = getMinioClient()
    const stream = await client.getObject(bucketName, path)

    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    const contentType = getContentType(path)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': 'inline',
      },
    })
  } catch (error) {
    return new NextResponse('File not found', { status: 404 })
  }
}

function getContentType(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase()

  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
  }

  return mimeTypes[extension || ''] || 'application/octet-stream'
}
