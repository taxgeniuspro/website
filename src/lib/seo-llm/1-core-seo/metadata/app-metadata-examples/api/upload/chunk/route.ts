import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, readdir, readFile, unlink } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

// CRITICAL: Keep-alive headers for chunked uploads (from CLAUDE.md)
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Temporary directory for storing chunks
const CHUNKS_DIR = path.join(process.cwd(), 'tmp', 'chunks')

// Ensure chunks directory exists
async function ensureChunksDir() {
  if (!existsSync(CHUNKS_DIR)) {
    await mkdir(CHUNKS_DIR, { recursive: true })
  }
}

// Get session directory path
function getSessionDir(sessionId: string): string {
  return path.join(CHUNKS_DIR, sessionId)
}

// Get chunk file path
function getChunkPath(sessionId: string, chunkIndex: number): string {
  return path.join(getSessionDir(sessionId), `chunk_${chunkIndex}`)
}

// Save chunk to temporary storage
async function saveChunk(
  sessionId: string,
  chunkIndex: number,
  chunkData: Buffer
): Promise<void> {
  const sessionDir = getSessionDir(sessionId)

  // Ensure session directory exists
  if (!existsSync(sessionDir)) {
    await mkdir(sessionDir, { recursive: true })
  }

  // Save chunk
  const chunkPath = getChunkPath(sessionId, chunkIndex)
  await writeFile(chunkPath, chunkData)

  console.log(`Saved chunk ${chunkIndex} to ${chunkPath} (${chunkData.length} bytes)`)
}

// Check if all chunks are uploaded
async function areAllChunksUploaded(sessionId: string, totalChunks: number): Promise<boolean> {
  const sessionDir = getSessionDir(sessionId)

  if (!existsSync(sessionDir)) {
    return false
  }

  const files = await readdir(sessionDir)
  const chunkFiles = files.filter((f) => f.startsWith('chunk_'))

  return chunkFiles.length === totalChunks
}

// Merge all chunks into final file
async function mergeChunks(
  sessionId: string,
  totalChunks: number,
  fileName: string
): Promise<Buffer> {
  console.log(`Merging ${totalChunks} chunks for session ${sessionId}`)

  const chunks: Buffer[] = []

  // Read all chunks in order
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = getChunkPath(sessionId, i)

    if (!existsSync(chunkPath)) {
      throw new Error(`Missing chunk ${i} for session ${sessionId}`)
    }

    const chunkData = await readFile(chunkPath)
    chunks.push(chunkData)
    console.log(`Read chunk ${i}: ${chunkData.length} bytes`)
  }

  // Concatenate all chunks
  const finalBuffer = Buffer.concat(chunks)
  console.log(`Merged ${chunks.length} chunks into ${finalBuffer.length} bytes`)

  return finalBuffer
}

// Clean up session directory
async function cleanupSession(sessionId: string): Promise<void> {
  const sessionDir = getSessionDir(sessionId)

  if (!existsSync(sessionDir)) {
    return
  }

  try {
    const files = await readdir(sessionDir)

    // Delete all chunk files
    for (const file of files) {
      await unlink(path.join(sessionDir, file))
    }

    // Remove session directory (using fs.rmdir via promises doesn't work well, use unlink on parent)
    await unlink(sessionDir).catch(() => {
      // Ignore error if directory still has files
    })

    console.log(`Cleaned up session ${sessionId}`)
  } catch (error) {
    console.error(`Error cleaning up session ${sessionId}:`, error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure chunks directory exists
    await ensureChunksDir()

    // Parse form data
    const formData = await request.formData()
    const chunk = formData.get('chunk') as Blob
    const chunkIndex = parseInt(formData.get('chunkIndex') as string)
    const totalChunks = parseInt(formData.get('totalChunks') as string)
    const sessionId = formData.get('sessionId') as string
    const fileName = formData.get('fileName') as string
    const fileSize = parseInt(formData.get('fileSize') as string)
    const mimeType = formData.get('mimeType') as string
    const isLastChunk = formData.get('isLastChunk') === 'true'

    // Validate required fields
    if (!chunk || isNaN(chunkIndex) || isNaN(totalChunks) || !sessionId || !fileName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log(
      `Received chunk ${chunkIndex + 1}/${totalChunks} for session ${sessionId} (${chunk.size} bytes)`
    )

    // Convert blob to buffer
    const arrayBuffer = await chunk.arrayBuffer()
    const chunkBuffer = Buffer.from(arrayBuffer)

    // Save chunk
    await saveChunk(sessionId, chunkIndex, chunkBuffer)

    // If this is the last chunk, verify all chunks and merge
    if (isLastChunk) {
      console.log(`Last chunk received for session ${sessionId}, checking completion...`)

      const allChunksUploaded = await areAllChunksUploaded(sessionId, totalChunks)

      if (!allChunksUploaded) {
        return NextResponse.json(
          {
            error: 'Not all chunks have been uploaded yet',
            received: chunkIndex + 1,
            total: totalChunks,
          },
          { status: 400 }
        )
      }

      // All chunks uploaded, merge them
      try {
        const mergedFile = await mergeChunks(sessionId, totalChunks, fileName)

        // Verify file size matches expected
        if (fileSize && mergedFile.length !== fileSize) {
          console.error(
            `File size mismatch: expected ${fileSize}, got ${mergedFile.length} bytes`
          )
          await cleanupSession(sessionId)
          return NextResponse.json(
            {
              error: `File size mismatch: expected ${fileSize} bytes, got ${mergedFile.length} bytes`,
            },
            { status: 400 }
          )
        }

        console.log(`Successfully merged file: ${fileName} (${mergedFile.length} bytes)`)

        // Return the merged file data (base64 encoded)
        const base64Data = mergedFile.toString('base64')

        // Clean up chunks
        await cleanupSession(sessionId)

        return NextResponse.json({
          success: true,
          message: 'All chunks uploaded and merged successfully',
          sessionId,
          fileName,
          fileSize: mergedFile.length,
          mimeType,
          data: base64Data, // Send merged file data
          totalChunks,
        })
      } catch (error) {
        console.error('Error merging chunks:', error)
        await cleanupSession(sessionId)
        return NextResponse.json(
          { error: 'Failed to merge chunks' },
          { status: 500 }
        )
      }
    }

    // Not the last chunk, just confirm receipt
    return NextResponse.json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded`,
      sessionId,
      chunkIndex,
      totalChunks,
    })
  } catch (error) {
    console.error('Error processing chunk upload:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process chunk',
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check upload status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const sessionDir = getSessionDir(sessionId)

    if (!existsSync(sessionDir)) {
      return NextResponse.json({
        exists: false,
        uploadedChunks: [],
      })
    }

    const files = await readdir(sessionDir)
    const chunkFiles = files.filter((f) => f.startsWith('chunk_'))
    const uploadedChunks = chunkFiles
      .map((f) => {
        const match = f.match(/chunk_(\d+)/)
        return match ? parseInt(match[1]) : null
      })
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b)

    return NextResponse.json({
      exists: true,
      uploadedChunks,
      totalUploaded: uploadedChunks.length,
    })
  } catch (error) {
    console.error('Error checking upload status:', error)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}

// DELETE endpoint to clean up abandoned uploads
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    await cleanupSession(sessionId)

    return NextResponse.json({
      success: true,
      message: 'Session cleaned up',
    })
  } catch (error) {
    console.error('Error cleaning up session:', error)
    return NextResponse.json({ error: 'Failed to cleanup' }, { status: 500 })
  }
}
