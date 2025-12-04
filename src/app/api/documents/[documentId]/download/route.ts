import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  documentRateLimit,
  getClientIdentifier,
  getUserIdentifier,
  getRateLimitHeaders,
  checkRateLimit,
} from '@/lib/rate-limit';
import { SignJWT } from 'jose';
import { logger } from '@/lib/logger';

/**
 * GET /api/documents/[documentId]/download
 * Generates secure, time-limited URL for document download
 *
 * Epic 3, Story 3.3: Preparer Client & Document Portal
 * Security:
 * - Only accessible by assigned preparer or document owner (client)
 * - Rate limited: 30 requests per minute per user
 * - Signed URLs with 15-minute expiry
 */
export async function GET(req: NextRequest, { params }: { params: { documentId: string } }) {
  try {
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const ip = getClientIdentifier(req);
    const identifier = getUserIdentifier(user.id, ip);
    const rateLimitResult = await checkRateLimit(identifier, documentRateLimit);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const profile = await prisma.profile.findFirst({
      where: {
        user: { email: user.emailAddresses[0]?.emailAddress },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const documentId = params.documentId;

    // Get document with related tax return and profile
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        taxReturn: {
          include: {
            profile: true,
          },
        },
        profile: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Authorization check
    let isAuthorized = false;

    // Check if user is the document owner (client)
    if (document.profileId === profile.id) {
      isAuthorized = true;
    }

    // Check if user is an assigned preparer
    if (profile.role === 'PREPARER' && document.taxReturn) {
      const assignment = await prisma.clientPreparer.findFirst({
        where: {
          preparerId: profile.id,
          clientId: document.taxReturn.profileId,
          isActive: true,
        },
      });

      if (assignment) {
        isAuthorized = true;
      }
    }

    // Check if user is admin
    if (profile.role === 'ADMIN') {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Not authorized to access this document' },
        { status: 403 }
      );
    }

    // Generate signed URL with 15-minute expiry
    const signedUrl = await generateSignedUrl(document.id, document.fileUrl, user.id, 15);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    return NextResponse.json(
      {
        success: true,
        document: {
          id: document.id,
          fileName: document.fileName,
          fileType: document.fileType,
          fileSize: document.fileSize,
          downloadUrl: signedUrl,
          expiresAt: expiresAt.toISOString(),
        },
      },
      {
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    logger.error('Error generating document download URL:', error);
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }
}

/**
 * Generate signed URL with JWT for secure, time-limited document access
 * This creates a temporary URL that includes:
 * - Document ID
 * - User ID (who requested it)
 * - Expiry timestamp
 *
 * The token is verified by a separate /api/documents/view/[token] endpoint
 */
async function generateSignedUrl(
  documentId: string,
  fileUrl: string,
  userId: string,
  expiryMinutes: number = 15
): Promise<string> {
  const jwtSecret = process.env.JWT_SECRET || process.env.CLERK_SECRET_KEY;
  if (!jwtSecret) {
    throw new Error('CRITICAL: JWT_SECRET or CLERK_SECRET_KEY environment variable is missing');
  }
  const secret = new TextEncoder().encode(jwtSecret);

  // Create JWT token with document access claims
  const token = await new SignJWT({
    documentId,
    userId,
    fileUrl,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiryMinutes}m`)
    .sign(secret);

  // Return URL with token (will be verified by view endpoint)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005';
  return `${appUrl}/api/documents/view/${token}`;
}
