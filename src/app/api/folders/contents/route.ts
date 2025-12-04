import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/folders/contents
 * Fetch files in a specific folder or root level
 * Supports search and filtering
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId');
    const clientId = searchParams.get('clientId');
    const search = searchParams.get('search');
    const taxYear = searchParams.get('taxYear');
    const type = searchParams.get('type');

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Determine whose files to fetch
    let profileId = profile.id;

    if (clientId) {
      // Only admins and tax preparers can view other users' files
      if (
        profile.role !== 'ADMIN' &&
        profile.role !== 'SUPER_ADMIN' &&
        profile.role !== 'TAX_PREPARER'
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // For tax preparers, verify they're assigned to this client
      if (profile.role === 'TAX_PREPARER') {
        const assignment = await prisma.clientPreparer.findFirst({
          where: {
            clientId: clientId,
            preparerId: profile.id,
          },
        });

        if (!assignment) {
          return NextResponse.json({ error: 'Not authorized for this client' }, { status: 403 });
        }
      }

      profileId = clientId;
    }

    // Build where clause
    const where: any = {
      profileId,
      isDeleted: false,
    };

    // Folder filter
    if (folderId) {
      where.folderId = folderId;
    } else {
      // Root level - files without folder
      where.folderId = null;
    }

    // Search filter
    if (search) {
      where.fileName = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Tax year filter
    if (taxYear) {
      where.taxYear = parseInt(taxYear);
    }

    // Type filter
    if (type) {
      where.type = type.toUpperCase();
    }

    // Fetch files
    const files = await prisma.document.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileSize: true,
        mimeType: true,
        type: true,
        taxYear: true,
        status: true,
        folderId: true,
        tags: true,
        version: true,
        sharedWith: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Transform to match FileManagerFile interface
    const transformedFiles = files.map((file) => ({
      id: file.id,
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      type: file.type,
      taxYear: file.taxYear,
      status: file.status,
      folderId: file.folderId,
      tags: file.tags,
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
    }));

    return NextResponse.json({ files: transformedFiles });
  } catch (error) {
    logger.error('Error fetching folder contents:', error);
    return NextResponse.json({ error: 'Failed to fetch folder contents' }, { status: 500 });
  }
}
