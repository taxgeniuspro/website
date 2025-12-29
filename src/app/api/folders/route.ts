import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
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

    // Get user's profile - use findFirst with OR conditions for Supabase Auth compatibility
    const { data: profiles } = await db.from('profiles')
      .select('*')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email}`);
    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Determine which folders to fetch based on role and clientId
    let ownerId = profile.id;

    if (clientId) {
      // Only admins and tax preparers can view other users' folders
      if (profile.role !== 'admin' && profile.role !== 'tax_preparer') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // For tax preparers, verify they're assigned to this client
      if (profile.role === 'tax_preparer') {
        const { data: assignments } = await db.from('client_preparers')
          .select('*')
          .eq('client_id', clientId)
          .eq('preparer_id', profile.id);

        if (!assignments || assignments.length === 0) {
          return NextResponse.json({ error: 'Not authorized for this client' }, { status: 403 });
        }
      }

      ownerId = clientId;
    }

    // Fetch folders
    const { data: folders, error } = await db.from('folders')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('is_deleted', false)
      .order('level', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    // Get document counts for each folder
    const folderIds = (folders || []).map(f => f.id);
    let documentCounts: Record<string, number> = {};

    if (folderIds.length > 0) {
      // Count documents per folder
      const { data: counts } = await db.from('documents')
        .select('folder_id')
        .in('folder_id', folderIds)
        .eq('is_deleted', false);

      // Aggregate counts
      (counts || []).forEach((doc) => {
        if (doc.folder_id) {
          documentCounts[doc.folder_id] = (documentCounts[doc.folder_id] || 0) + 1;
        }
      });
    }

    // Transform to include document count
    const foldersWithCount = (folders || []).map((folder) => ({
      id: folder.id,
      name: folder.name,
      description: folder.description,
      path: folder.path,
      parentId: folder.parent_id,
      level: folder.level,
      documentCount: documentCounts[folder.id] || 0,
      createdAt: folder.created_at,
      updatedAt: folder.updated_at,
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

    // Get user's profile - use findFirst with OR conditions for Supabase Auth compatibility
    const { data: profiles } = await db.from('profiles')
      .select('*')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email}`);
    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Determine owner
    let ownerId = profile.id;

    if (clientId) {
      // Only admins and tax preparers can create folders for other users
      if (profile.role !== 'admin' && profile.role !== 'tax_preparer') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // For tax preparers, verify they're assigned to this client
      if (profile.role === 'tax_preparer') {
        const { data: assignments } = await db.from('client_preparers')
          .select('*')
          .eq('client_id', clientId)
          .eq('preparer_id', profile.id);

        if (!assignments || assignments.length === 0) {
          return NextResponse.json({ error: 'Not authorized for this client' }, { status: 403 });
        }
      }

      ownerId = clientId;
    }

    // Calculate path and level
    let path = `/${name.trim()}`;
    let level = 0;

    if (parentId) {
      const { data: parentFolders } = await db.from('folders')
        .select('*')
        .eq('id', parentId);
      const parentFolder = firstOrNull(parentFolders);

      if (!parentFolder) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 });
      }

      if (parentFolder.owner_id !== ownerId) {
        return NextResponse.json(
          { error: 'Parent folder belongs to different user' },
          { status: 403 }
        );
      }

      path = `${parentFolder.path}/${name.trim()}`;
      level = parentFolder.level + 1;
    }

    // Check if folder with same name exists at this level
    let existingQuery = db.from('folders')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('name', name.trim())
      .eq('is_deleted', false);

    if (parentId) {
      existingQuery = existingQuery.eq('parent_id', parentId);
    } else {
      existingQuery = existingQuery.is('parent_id', null);
    }

    const { data: existingFolders } = await existingQuery;

    if (existingFolders && existingFolders.length > 0) {
      return NextResponse.json(
        { error: 'A folder with this name already exists in this location' },
        { status: 409 }
      );
    }

    // Create folder
    const { data: newFolders, error: createError } = await db.from('folders').insert({
      name: name.trim(),
      description: description?.trim() || null,
      owner_id: ownerId,
      parent_id: parentId || null,
      path,
      level,
    }).select();

    if (createError) {
      throw createError;
    }

    const folder = firstOrNull(newFolders);

    // Log operation
    await db.from('file_operations').insert({
      operation: 'FOLDER_CREATE',
      performed_by: profile.id,
      folder_id: folder?.id,
      details: {
        folderName: folder?.name,
        path: folder?.path,
      },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      user_agent: req.headers.get('user-agent') || null,
    });

    return NextResponse.json(
      {
        folder: {
          id: folder?.id,
          name: folder?.name,
          description: folder?.description,
          path: folder?.path,
          parentId: folder?.parent_id,
          level: folder?.level,
          createdAt: folder?.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}
