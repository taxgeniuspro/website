import { readFile } from 'fs/promises'
import { join } from 'path'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const filePath = join(
      process.cwd(),
      'public',
      '.well-known',
      'apple-developer-merchantid-domain-association'
    )
    const fileContent = await readFile(filePath)

    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('Error serving Apple Pay domain association file:', error)
    return new NextResponse('File not found', { status: 404 })
  }
}
