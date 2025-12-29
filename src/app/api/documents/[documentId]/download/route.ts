import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
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
export async function GET(req: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
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

    // Get user profile using session user ID
    const { data: profiles } = await db.from('profiles')
      .select('*')
      .or(`user_id.eq.${user.id},supabase_user_id.eq.${user.id}`);
    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { documentId } = await params;

    // Get document with related tax return
    const { data: documents } = await db.from('documents')
      .select('*, tax_returns(*, profiles(*))')
      .eq('id', documentId);
    const document = firstOrNull(documents);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Authorization check
    let isAuthorized = false;

    // Check if user is the document owner (client)
    if (document.profile_id === profile.id) {
      isAuthorized = true;
    }

    // Check if user is an assigned preparer
    if (profile.role === 'PREPARER' && document.tax_returns) {
      const { data: assignments } = await db.from('client_preparers')
        .select('*')
        .eq('preparer_id', profile.id)
        .eq('client_id', document.tax_returns.profile_id)
        .eq('is_active', true);

      if (assignments && assignments.length > 0) {
        isAuthorized = true;
      }
    }

    // Check if user is admin
    if (profile.role === 'admin') {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Not authorized to access this document' },
        { status: 403 }
      );
    }

    // Generate signed URL with 15-minute expiry
    const signedUrl = await generateSignedUrl(document.id, document.file_url, user.id, 15);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    return NextResponse.json(
      {
        success: true,
        document: {
          id: document.id,
          fileName: document.file_name,
          fileType: document.file_type,
          fileSize: document.file_size,
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
  const jwtSecret = process.env.JWT_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!jwtSecret) {
    throw new Error('CRITICAL: JWT_SECRET or AUTH_SECRET environment variable is missing');
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
