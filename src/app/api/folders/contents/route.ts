import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
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
    const { data: profiles } = await db.from('profiles')
      .select('*')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email}`);
    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Determine whose files to fetch
    let profileId = profile.id;

    if (clientId) {
      // Only admins and tax preparers can view other users' files
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

      profileId = clientId;
    }

    // Build query
    let query = db.from('documents')
      .select('id, file_name, file_url, file_size, mime_type, type, tax_year, status, folder_id, tags, version, shared_with, created_at, updated_at')
      .eq('profile_id', profileId)
      .eq('is_deleted', false);

    // Folder filter
    if (folderId) {
      query = query.eq('folder_id', folderId);
    } else {
      // Root level - files without folder
      query = query.is('folder_id', null);
    }

    // Search filter
    if (search) {
      query = query.ilike('file_name', `%${search}%`);
    }

    // Tax year filter
    if (taxYear) {
      query = query.eq('tax_year', parseInt(taxYear));
    }

    // Type filter
    if (type) {
      query = query.eq('type', type.toUpperCase());
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false });

    const { data: files, error } = await query;

    if (error) {
      throw error;
    }

    // Transform to match FileManagerFile interface
    const transformedFiles = (files || []).map((file) => ({
      id: file.id,
      fileName: file.file_name,
      fileUrl: file.file_url,
      fileSize: file.file_size,
      mimeType: file.mime_type,
      type: file.type,
      taxYear: file.tax_year,
      status: file.status,
      folderId: file.folder_id,
      tags: file.tags,
      createdAt: file.created_at,
      updatedAt: file.updated_at,
    }));

    return NextResponse.json({ files: transformedFiles });
  } catch (error) {
    logger.error('Error fetching folder contents:', error);
    return NextResponse.json({ error: 'Failed to fetch folder contents' }, { status: 500 });
  }
}
