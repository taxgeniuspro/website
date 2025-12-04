import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    // Read the OpenAPI spec from public folder
    const specPath = join(process.cwd(), 'public', 'api', 'openapi.json')
    const spec = readFileSync(specPath, 'utf-8')

    return new NextResponse(spec, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load API specification' }, { status: 500 })
  }
}
