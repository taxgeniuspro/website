import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/folders
 * Fetch all folders for the current user or specific client (for admins/preparers)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Determine which folders to fetch based on role and clientId
    let ownerId = profile.id;

    if (clientId) {
      // Only admins and tax preparers can view other users' folders
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

      ownerId = clientId;
    }

    // Fetch folders
    const folders = await prisma.folder.findMany({
      where: {
        ownerId,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            documents: {
              where: {
                isDeleted: false,
              },
            },
          },
        },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    // Transform to include document count
    const foldersWithCount = folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      description: folder.description,
      path: folder.path,
      parentId: folder.parentId,
      level: folder.level,
      documentCount: folder._count.documents,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    }));

    return NextResponse.json({ folders: foldersWithCount });
  } catch (error) {
    logger.error('Error fetching folders:', error);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

/**
 * POST /api/folders
 * Create a new folder
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, parentId, clientId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Determine owner
    let ownerId = profile.id;

    if (clientId) {
      // Only admins and tax preparers can create folders for other users
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

      ownerId = clientId;
    }

    // Calculate path and level
    let path = `/${name.trim()}`;
    let level = 0;

    if (parentId) {
      const parentFolder = await prisma.folder.findUnique({
        where: { id: parentId },
      });

      if (!parentFolder) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 });
      }

      if (parentFolder.ownerId !== ownerId) {
        return NextResponse.json(
          { error: 'Parent folder belongs to different user' },
          { status: 403 }
        );
      }

      path = `${parentFolder.path}/${name.trim()}`;
      level = parentFolder.level + 1;
    }

    // Check if folder with same name exists at this level
    const existingFolder = await prisma.folder.findFirst({
      where: {
        ownerId,
        parentId: parentId || null,
        name: name.trim(),
        isDeleted: false,
      },
    });

    if (existingFolder) {
      return NextResponse.json(
        { error: 'A folder with this name already exists in this location' },
        { status: 409 }
      );
    }

    // Create folder
    const folder = await prisma.folder.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        ownerId,
        parentId: parentId || null,
        path,
        level,
      },
    });

    // Log operation
    await prisma.fileOperation.create({
      data: {
        operation: 'FOLDER_CREATE',
        performedBy: profile.id,
        folderId: folder.id,
        details: {
          folderName: folder.name,
          path: folder.path,
        },
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      },
    });

    return NextResponse.json(
      {
        folder: {
          id: folder.id,
          name: folder.name,
          description: folder.description,
          path: folder.path,
          parentId: folder.parentId,
          level: folder.level,
          createdAt: folder.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}
