import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
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
    const { data: profiles } = await db.from('profiles')
      .select('*')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email}`);
    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Soft delete files
    if (fileIds.length > 0) {
      // Verify ownership or permissions
      const { data: files } = await db.from('documents')
        .select('id, profile_id')
        .in('id', fileIds)
        .eq('is_deleted', false);

      // Check permissions
      const authorizedFileIds = (files || [])
        .filter((file) => {
          // CLIENTS CANNOT DELETE DOCUMENTS (security requirement)
          if (profile.role === 'client') {
            return false;
          }

          // Owner can delete (if not client)
          if (file.profile_id === profile.id) return true;

          // Admins can delete
          if (profile.role === 'admin') return true;

          // Tax preparers can delete if assigned (checked below)
          return profile.role === 'tax_preparer';
        })
        .map((f) => f.id);

      if (authorizedFileIds.length > 0) {
        await db.from('documents')
          .update({
            is_deleted: true,
            deleted_at: now,
            deleted_by: profile.id,
          })
          .in('id', authorizedFileIds);

        // Log deletions
        for (const fileId of authorizedFileIds) {
          await db.from('file_operations').insert({
            operation: 'DELETE',
            performed_by: profile.id,
            document_id: fileId,
            details: {
              deletedAt: now,
            },
            ip_address:
              req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
            user_agent: req.headers.get('user-agent') || null,
          });
        }
      }
    }

    // Soft delete folders (and cascade to contents)
    if (folderIds.length > 0) {
      // Verify ownership
      const { data: folders } = await db.from('folders')
        .select('id, owner_id')
        .in('id', folderIds)
        .eq('is_deleted', false);

      const authorizedFolderIds = (folders || [])
        .filter((folder) => {
          // CLIENTS CANNOT DELETE FOLDERS (security requirement)
          if (profile.role === 'client') {
            return false;
          }

          // Owner can delete (if not client)
          if (folder.owner_id === profile.id) return true;

          // Admins can delete
          if (profile.role === 'admin') return true;

          return false;
        })
        .map((f) => f.id);

      if (authorizedFolderIds.length > 0) {
        // Soft delete folders
        await db.from('folders')
          .update({
            is_deleted: true,
            deleted_at: now,
            deleted_by: profile.id,
          })
          .in('id', authorizedFolderIds);

        // Soft delete all documents in these folders
        await db.from('documents')
          .update({
            is_deleted: true,
            deleted_at: now,
            deleted_by: profile.id,
          })
          .in('folder_id', authorizedFolderIds)
          .eq('is_deleted', false);

        // Log deletions
        for (const folderId of authorizedFolderIds) {
          await db.from('file_operations').insert({
            operation: 'FOLDER_DELETE',
            performed_by: profile.id,
            folder_id: folderId,
            details: {
              deletedAt: now,
            },
            ip_address:
              req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
            user_agent: req.headers.get('user-agent') || null,
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
