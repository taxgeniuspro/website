/**
 * File Uploads API Route
 *
 * Serves files from disk storage with authorization and optional image resizing.
 * GET /api/uploads/[...path] - Serve a file
 *
 * Query params for images:
 * - w: width (default: original)
 * - h: height (default: original)
 * - fit: cover|contain|fill (default: cover)
 * - q: quality 1-100 (default: 80)
 *
 * File categories:
 * - documents: Requires authentication and ownership/permission
 * - marketing-assets: Publicly accessible
 * - referral-images: Publicly accessible (used in social shares)
 * - images: Publicly accessible
 * - avatars: Publicly accessible
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { DiskStorageService } from '@/lib/services/disk-storage.service';
import { logger } from '@/lib/logger';
import sharp from 'sharp';

// Categories that are publicly accessible
const PUBLIC_CATEGORIES = ['marketing-assets', 'referral-images', 'images', 'avatars'];

// Profile interface for local use
interface Profile {
  id: string;
  role: string;
  short_link_username?: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const key = pathSegments.join('/');
    const pathParts = key.split('/');
    const fileCategory = pathParts[0];

    // Check if authentication is required
    const isPublicCategory = PUBLIC_CATEGORIES.includes(fileCategory);

    let session = null;
    let profile: Profile | null = null;

    // Documents require authentication
    if (!isPublicCategory) {
      session = await auth();
      const userId = session?.user?.id;

      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Get user's profile
      const { data: profiles } = await db.from('profiles')
        .select('id, role, short_link_username')
        .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email}`);
      profile = firstOrNull(profiles);

      if (!profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      // Authorization check for documents
      if (fileCategory === 'documents' && pathParts.length >= 2) {
        const fileOwnerId = pathParts[1];
        let hasAccess = false;

        // Check if this is the user's file
        if (fileOwnerId === profile.id) {
          hasAccess = true;
        }
        // Legacy: Check by username
        else if (profile.short_link_username && fileOwnerId === profile.short_link_username) {
          hasAccess = true;
        }
        // Admin has access to all
        else if (profile.role === 'admin') {
          hasAccess = true;
        }
        // Tax preparer has access to their clients
        else if (profile.role === 'tax_preparer') {
          const { data: assignments } = await db.from('client_preparers')
            .select('id')
            .eq('client_id', fileOwnerId)
            .eq('preparer_id', profile.id);
          if (assignments && assignments.length > 0) {
            hasAccess = true;
          }
        }

        if (!hasAccess) {
          logger.warn('Unauthorized file access attempt', { userId, key });
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    }

    // Read file from disk
    let data: Buffer;
    let mimeType: string;

    try {
      const result = await DiskStorageService.readFile(key);
      data = result.data;
      mimeType = result.mimeType;
    } catch (error) {
      if (error instanceof Error && error.message === 'File not found') {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      throw error;
    }

    // Check for image resize params
    const searchParams = request.nextUrl.searchParams;
    const width = searchParams.get('w') ? parseInt(searchParams.get('w')!) : null;
    const height = searchParams.get('h') ? parseInt(searchParams.get('h')!) : null;
    const fit = (searchParams.get('fit') as 'cover' | 'contain' | 'fill') || 'cover';
    const quality = searchParams.get('q') ? parseInt(searchParams.get('q')!) : 80;

    let responseData = data;
    let responseMimeType = mimeType;

    // Resize image if params provided and it's an image
    if ((width || height) && mimeType.startsWith('image/') && !mimeType.includes('svg')) {
      try {
        const resized = await sharp(data)
          .resize(width || undefined, height || undefined, {
            fit,
            withoutEnlargement: true,
          })
          .jpeg({ quality })
          .toBuffer();

        responseData = resized;
        responseMimeType = 'image/jpeg';
      } catch (error) {
        logger.warn('Failed to resize image', { key, error });
        // Return original if resize fails
      }
    }

    // Log file access for documents
    if (fileCategory === 'documents' && profile) {
      try {
        await db.from('file_operations').insert({
          operation: 'VIEW',
          performed_by: profile.id,
          details: { filePath: key },
          ip_address:
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            null,
          user_agent: request.headers.get('user-agent') || null,
        });
      } catch {
        // Don't fail if logging fails
      }
    }

    // Set cache headers based on category
    const cacheControl = isPublicCategory
      ? 'public, max-age=31536000, immutable' // 1 year for public assets
      : 'private, max-age=3600'; // 1 hour for documents

    const fileName = pathParts[pathParts.length - 1];

    return new NextResponse(responseData, {
      headers: {
        'Content-Type': responseMimeType,
        'Content-Length': responseData.length.toString(),
        'Cache-Control': cacheControl,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    logger.error('Error serving file', { error });
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
}
