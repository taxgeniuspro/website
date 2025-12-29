import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * POST /api/folders/[id]/create-upload-link
 * Create a shareable upload link for a folder
 *
 * This allows tax preparers to create time-limited links that clients can use
 * to upload documents directly to a specific folder via camera or file picker.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: folderId } = await params;
    const body = await req.json();
    const {
      clientId,
      expiresInHours = 24, // Default 24 hours
      maxUploads,
    } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Get tax preparer's profile
    const { data: preparers } = await db.from('profiles')
      .select('*')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email}`);
    const preparer = firstOrNull(preparers);

    if (!preparer) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only tax preparers, admins, and super admins can create upload links
    if (
      preparer.role !== 'tax_preparer' &&
      preparer.role !== 'admin'
    ) {
      return NextResponse.json(
        { error: 'Only tax preparers can create upload links' },
        { status: 403 }
      );
    }

    // Verify folder exists and belongs to the client
    const { data: folders } = await db.from('folders')
      .select('*, owner:profiles!owner_id(id, first_name, last_name)')
      .eq('id', folderId);
    const folder = firstOrNull(folders);

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Verify the folder belongs to the specified client
    if (folder.owner_id !== clientId) {
      return NextResponse.json(
        { error: 'Folder does not belong to specified client' },
        { status: 400 }
      );
    }

    // For tax preparers (not admins), verify they're assigned to this client
    if (preparer.role === 'tax_preparer') {
      const { data: assignments } = await db.from('client_preparers')
        .select('*')
        .eq('client_id', clientId)
        .eq('preparer_id', preparer.id)
        .eq('is_active', true);

      if (!assignments || assignments.length === 0) {
        return NextResponse.json(
          { error: 'You are not assigned to this client' },
          { status: 403 }
        );
      }
    }

    // Verify client exists
    const { data: clients } = await db.from('profiles')
      .select('id, first_name, last_name, phone')
      .eq('id', clientId);
    const client = firstOrNull(clients);

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Create upload link
    const { data: newUploadLinks, error: createError } = await db.from('folder_upload_links').insert({
      folder_id: folderId,
      client_id: clientId,
      created_by: preparer.id,
      expires_at: expiresAt.toISOString(),
      max_uploads: maxUploads || null,
      metadata: {
        folderName: folder.name,
        folderPath: folder.path,
        clientName: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
        preparerName: `${preparer.first_name || ''} ${preparer.last_name || ''}`.trim(),
      },
    }).select('*, folder:folders(id, name, path), client:profiles!client_id(id, first_name, last_name, phone)');

    if (createError) {
      throw createError;
    }

    const uploadLink = firstOrNull(newUploadLinks);

    // Log the operation
    await db.from('file_operations').insert({
      operation: 'SHARE',
      performed_by: preparer.id,
      folder_id: folder.id,
      details: {
        action: 'create_upload_link',
        linkId: uploadLink?.id,
        clientId,
        expiresAt: expiresAt.toISOString(),
      },
      ip_address:
        req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      user_agent: req.headers.get('user-agent') || null,
    });

    logger.info('Upload link created', {
      linkId: uploadLink?.id,
      preparerId: preparer.id,
      clientId,
      folderId,
      expiresAt: expiresAt.toISOString(),
    });

    // Generate the full URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
    const uploadUrl = `${baseUrl}/upload/${uploadLink?.token}`;

    return NextResponse.json(
      {
        success: true,
        uploadLink: {
          id: uploadLink?.id,
          token: uploadLink?.token,
          url: uploadUrl,
          folderId: uploadLink?.folder_id,
          folderName: uploadLink?.folder?.name,
          clientId: uploadLink?.client_id,
          clientName: `${uploadLink?.client?.first_name || ''} ${uploadLink?.client?.last_name || ''}`.trim(),
          clientPhone: uploadLink?.client?.phone,
          expiresAt: uploadLink?.expires_at,
          maxUploads: uploadLink?.max_uploads,
          isActive: uploadLink?.is_active,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating upload link:', error);
    return NextResponse.json(
      { error: 'Failed to create upload link' },
      { status: 500 }
    );
  }
}
