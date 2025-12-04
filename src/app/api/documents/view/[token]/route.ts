import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/documents/view/[token]
 * Verifies signed JWT token and serves the document
 *
 * This endpoint:
 * 1. Verifies the JWT token is valid and not expired
 * 2. Checks the document exists
 * 3. Returns the document for viewing/download
 *
 * Security:
 * - Token expires in 15 minutes
 * - Token contains documentId, userId, and fileUrl
 * - No authentication required (token IS the authentication)
 */
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const token = params.token;

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET || process.env.CLERK_SECRET_KEY;
    if (!jwtSecret) {
      logger.error('CRITICAL: JWT_SECRET or CLERK_SECRET_KEY environment variable is missing');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const secret = new TextEncoder().encode(jwtSecret);

    let payload;
    try {
      const verified = await jwtVerify(token, secret);
      payload = verified.payload;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Extract claims
    const { documentId, userId, fileUrl } = payload as {
      documentId: string;
      userId: string;
      fileUrl: string;
    };

    // Verify document still exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // For now, redirect to the file URL
    // In production with S3/R2, you would:
    // 1. Fetch the file from S3/R2
    // 2. Stream it back to the client
    // 3. Set appropriate content-type headers

    // If it's a stored file path (local/S3), return the file
    // For demo purposes, we'll redirect to the fileUrl
    // In production, you'd fetch from S3 and stream:
    /*
    const s3 = new S3Client({ region: 'auto' })
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: extractKeyFromUrl(fileUrl),
    })
    const response = await s3.send(command)

    return new NextResponse(response.Body, {
      headers: {
        'Content-Type': document.fileType,
        'Content-Disposition': `inline; filename="${document.fileName}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    })
    */

    // For now, return JSON with file info for client-side handling
    return NextResponse.json(
      {
        success: true,
        document: {
          id: document.id,
          fileName: document.fileName,
          fileType: document.fileType,
          fileSize: document.fileSize,
          fileUrl: document.fileUrl,
        },
        message: 'Document access granted. Use fileUrl to view/download.',
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    logger.error('Error serving document:', error);
    return NextResponse.json({ error: 'Failed to serve document' }, { status: 500 });
  }
}
