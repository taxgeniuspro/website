import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from '@/lib/logger';

/**
 * GET /api/uploads/[...path]
 * Serve uploaded files with authorization
 * Only allows users to access their own files or files they have permission to view
 */
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    // Reconstruct the file path first to check category
    const filePath = params.path.join('/');
    const pathParts = filePath.split('/');
    const fileCategory = pathParts[0]; // 'documents' or 'marketing-assets'

    // Marketing assets are publicly accessible (for use on business cards, flyers, etc.)
    // Documents require authentication
    if (fileCategory === 'documents') {
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Get user's profile (optional for marketing assets, required for documents)
    let profile = null;
    if (userId) {
      profile = await prisma.profile.findUnique({
        where: { userId: userId },
      });

      if (!profile && fileCategory === 'documents') {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }
    }

    // Construct full file path
    const fullPath = join(process.cwd(), 'public', 'uploads', filePath);

    // Security check: ensure path doesn't escape uploads directory
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!fullPath.startsWith(uploadsDir)) {
      logger.warn('Attempted directory traversal:', { userId, filePath });
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // Check if file exists
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Validate category and extract file owner ID
    if (!['documents', 'marketing-assets'].includes(fileCategory)) {
      return NextResponse.json({ error: 'Invalid file category' }, { status: 400 });
    }

    if (pathParts.length < 2) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const fileOwnerId = pathParts[1];

    // Authorization check
    let hasAccess = false;

    // Marketing assets: Publicly accessible (for use on business cards, flyers, etc.)
    if (fileCategory === 'marketing-assets') {
      hasAccess = true; // Public access to marketing assets
    }
    // Documents: Original authorization logic
    else if (fileCategory === 'documents') {
      if (!profile) {
        hasAccess = false; // No profile means no access to documents
      } else {
        // Check if this is the user's file by ID
        if (fileOwnerId === profile.id) {
          hasAccess = true;
        }
        // Legacy support: Check if this is the user's file by username (old uploads)
        else if (profile.shortLinkUsername && fileOwnerId === profile.shortLinkUsername) {
          hasAccess = true;
        }
        // Check if user is admin
        else if (profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN') {
          hasAccess = true;
        }
        // Check if tax preparer has access to this client
        else if (profile.role === 'TAX_PREPARER') {
          const assignment = await prisma.clientPreparer.findFirst({
            where: {
              clientId: fileOwnerId,
              preparerId: profile.id,
            },
          });

          if (assignment) {
            hasAccess = true;
          }
        }
      }
    }

    if (!hasAccess) {
      logger.warn('Unauthorized file access attempt:', { userId, filePath, fileCategory });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Read and serve the file
    const fileBuffer = await readFile(fullPath);

    // Determine content type from file extension
    const ext = fullPath.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt: 'text/plain',
      csv: 'text/csv',
    };

    const contentType = contentTypes[ext || ''] || 'application/octet-stream';

    // Log file access (only for documents, not marketing assets)
    if (fileCategory === 'documents' && profile) {
      await prisma.fileOperation.create({
        data: {
          operation: 'VIEW',
          performedBy: profile.id,
          details: {
            filePath,
            fileOwnerId,
          },
          ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
        },
      });
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': `inline; filename="${pathParts[pathParts.length - 1]}"`,
      },
    });
  } catch (error) {
    logger.error('Error serving file:', error);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
}
