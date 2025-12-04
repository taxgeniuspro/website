// Health check endpoint for verifying chunk loading
// Helps diagnose chunk loading issues in production

import { type NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    // Get build ID from Next.js build manifest
    const buildManifestPath = path.join(process.cwd(), '.next', 'BUILD_ID')
    let buildId = 'unknown'

    if (fs.existsSync(buildManifestPath)) {
      buildId = fs.readFileSync(buildManifestPath, 'utf8').trim()
    }

    // Check if static chunks directory exists
    const chunksDir = path.join(process.cwd(), '.next', 'static', 'chunks')
    let chunkCount = 0
    let chunkFiles: string[] = []

    if (fs.existsSync(chunksDir)) {
      chunkFiles = fs.readdirSync(chunksDir).slice(0, 10) // Get first 10 chunks for sample
      chunkCount = chunkFiles.length
    }

    // Check standalone directory (for Docker deployments)
    const standaloneExists = fs.existsSync(path.join(process.cwd(), '.next', 'standalone'))

    return NextResponse.json({
      status: 'healthy',
      buildId,
      chunkCount,
      sampleChunks: chunkFiles,
      standaloneMode: standaloneExists,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      deployment: {
        port: process.env.PORT || '3000',
        hostname: process.env.HOSTNAME || 'unknown',
      },
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
