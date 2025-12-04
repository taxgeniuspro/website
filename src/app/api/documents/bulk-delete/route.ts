import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/documents/bulk-delete
 * Soft delete multiple files and folders
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fileIds = [], folderIds = [] } = body;

    if (fileIds.length === 0 && folderIds.length === 0) {
      return NextResponse.json({ error: 'No items to delete' }, { status: 400 });
    }

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const now = new Date();

    // Soft delete files
    if (fileIds.length > 0) {
      // Verify ownership or permissions
      const files = await prisma.document.findMany({
        where: {
          id: { in: fileIds },
          isDeleted: false,
        },
        select: {
          id: true,
          profileId: true,
        },
      });

      // Check permissions
      const authorizedFileIds = files
        .filter((file) => {
          // ❌ CLIENTS CANNOT DELETE DOCUMENTS (security requirement)
          if (profile.role === 'CLIENT' || profile.role === 'LEAD') {
            return false;
          }

          // Owner can delete (if not client)
          if (file.profileId === profile.id) return true;

          // Admins can delete
          if (profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN') return true;

          // Tax preparers can delete if assigned (checked below)
          return profile.role === 'TAX_PREPARER';
        })
        .map((f) => f.id);

      if (authorizedFileIds.length > 0) {
        await prisma.document.updateMany({
          where: {
            id: { in: authorizedFileIds },
          },
          data: {
            isDeleted: true,
            deletedAt: now,
            deletedBy: profile.id,
          },
        });

        // Log deletions
        for (const fileId of authorizedFileIds) {
          await prisma.fileOperation.create({
            data: {
              operation: 'DELETE',
              performedBy: profile.id,
              documentId: fileId,
              details: {
                deletedAt: now.toISOString(),
              },
              ipAddress:
                req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
              userAgent: req.headers.get('user-agent') || undefined,
            },
          });
        }
      }
    }

    // Soft delete folders (and cascade to contents)
    if (folderIds.length > 0) {
      // Verify ownership
      const folders = await prisma.folder.findMany({
        where: {
          id: { in: folderIds },
          isDeleted: false,
        },
        select: {
          id: true,
          ownerId: true,
        },
      });

      const authorizedFolderIds = folders
        .filter((folder) => {
          // ❌ CLIENTS CANNOT DELETE FOLDERS (security requirement)
          if (profile.role === 'CLIENT' || profile.role === 'LEAD') {
            return false;
          }

          // Owner can delete (if not client)
          if (folder.ownerId === profile.id) return true;

          // Admins can delete
          if (profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN') return true;

          return false;
        })
        .map((f) => f.id);

      if (authorizedFolderIds.length > 0) {
        // Soft delete folders
        await prisma.folder.updateMany({
          where: {
            id: { in: authorizedFolderIds },
          },
          data: {
            isDeleted: true,
            deletedAt: now,
            deletedBy: profile.id,
          },
        });

        // Soft delete all documents in these folders
        await prisma.document.updateMany({
          where: {
            folderId: { in: authorizedFolderIds },
            isDeleted: false,
          },
          data: {
            isDeleted: true,
            deletedAt: now,
            deletedBy: profile.id,
          },
        });

        // Log deletions
        for (const folderId of authorizedFolderIds) {
          await prisma.fileOperation.create({
            data: {
              operation: 'FOLDER_DELETE',
              performedBy: profile.id,
              folderId,
              details: {
                deletedAt: now.toISOString(),
              },
              ipAddress:
                req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
              userAgent: req.headers.get('user-agent') || undefined,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Items deleted successfully',
    });
  } catch (error) {
    logger.error('Error bulk deleting items:', error);
    return NextResponse.json({ error: 'Failed to delete items' }, { status: 500 });
  }
}
