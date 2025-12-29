import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * GET /api/upload/[token]
 * Validate upload token and return folder/client information
 *
 * This is a PUBLIC endpoint (no auth required) for clients to access upload pages
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find upload link by token
    const { data: uploadLinks } = await db.from('folder_upload_links')
      .select(`
        *,
        folder:folders(id, name, path),
        client:profiles!client_id(id, first_name, last_name),
        creator:profiles!created_by(id, first_name, last_name, company_name)
      `)
      .eq('token', token);
    const uploadLink = firstOrNull(uploadLinks);

    if (!uploadLink) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid upload link',
        },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date() > new Date(uploadLink.expires_at)) {
      return NextResponse.json(
        {
          valid: false,
          error: 'This upload link has expired',
          expiresAt: uploadLink.expires_at,
        },
        { status: 410 }
      );
    }

    // Check if inactive
    if (!uploadLink.is_active) {
      return NextResponse.json(
        {
          valid: false,
          error: 'This upload link has been deactivated',
        },
        { status: 403 }
      );
    }

    // Check upload limit
    if (uploadLink.max_uploads && uploadLink.upload_count >= uploadLink.max_uploads) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Upload limit reached for this link',
          uploadCount: uploadLink.upload_count,
          maxUploads: uploadLink.max_uploads,
        },
        { status: 403 }
      );
    }

    // Return valid link information
    return NextResponse.json({
      valid: true,
      folder: {
        id: uploadLink.folder?.id,
        name: uploadLink.folder?.name,
        path: uploadLink.folder?.path,
      },
      client: {
        id: uploadLink.client?.id,
        firstName: uploadLink.client?.first_name,
        lastName: uploadLink.client?.last_name,
      },
      preparer: {
        firstName: uploadLink.creator?.first_name,
        lastName: uploadLink.creator?.last_name,
        companyName: uploadLink.creator?.company_name,
      },
      expiresAt: uploadLink.expires_at,
      uploadCount: uploadLink.upload_count,
      maxUploads: uploadLink.max_uploads,
    });
  } catch (error) {
    logger.error('Error validating upload token:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate upload link' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/upload/[token]
 * Upload files via shareable link
 *
 * This is a PUBLIC endpoint (no auth required) for clients to upload files
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find and validate upload link
    const { data: uploadLinks } = await db.from('folder_upload_links')
      .select(`
        *,
        folder:folders(id, name, path, owner_id),
        client:profiles!client_id(id, first_name, last_name),
        creator:profiles!created_by(id, first_name, last_name)
      `)
      .eq('token', token);
    const uploadLink = firstOrNull(uploadLinks);

    if (!uploadLink) {
      return NextResponse.json(
        { error: 'Invalid upload link' },
        { status: 404 }
      );
    }

    // Validate link is still active and not expired
    if (new Date() > new Date(uploadLink.expires_at)) {
      return NextResponse.json(
        { error: 'This upload link has expired' },
        { status: 410 }
      );
    }

    if (!uploadLink.is_active) {
      return NextResponse.json(
        { error: 'This upload link has been deactivated' },
        { status: 403 }
      );
    }

    // Check upload limit
    if (uploadLink.max_uploads && uploadLink.upload_count >= uploadLink.max_uploads) {
      return NextResponse.json(
        { error: 'Upload limit reached for this link' },
        { status: 403 }
      );
    }

    // Get form data
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Check if adding these files would exceed the upload limit
    if (uploadLink.max_uploads) {
      const newTotal = uploadLink.upload_count + files.length;
      if (newTotal > uploadLink.max_uploads) {
        return NextResponse.json(
          {
            error: `Upload would exceed limit. ${uploadLink.max_uploads - uploadLink.upload_count} uploads remaining.`,
          },
          { status: 400 }
        );
      }
    }

    const uploadedDocuments = [];
    const currentYear = new Date().getFullYear();
    const defaultTaxYear = currentYear - 1;

    // Process each file
    for (const file of files) {
      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Create upload directory: /uploads/documents/{clientId}/{taxYear}/
      const uploadDir = join(
        process.cwd(),
        'uploads',
        'documents',
        uploadLink.client?.id,
        defaultTaxYear.toString()
      );
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = join(uploadDir, fileName);

      // Save file to disk
      await writeFile(filePath, buffer);

      // Create document record
      const { data: newDocuments, error: createError } = await db.from('documents').insert({
        profile_id: uploadLink.client?.id,
        type: 'OTHER', // Default type for uploads via link
        file_name: file.name,
        file_url: `/uploads/documents/${uploadLink.client?.id}/${defaultTaxYear}/${fileName}`,
        file_size: file.size,
        mime_type: file.type,
        is_encrypted: false,
        tax_year: defaultTaxYear,
        status: 'PENDING', // Requires preparer review
        folder_id: uploadLink.folder?.id,
        upload_link_id: uploadLink.id, // Track which link was used
        metadata: {
          uploadedViaLink: true,
          uploadLinkToken: token,
          uploadedAt: new Date().toISOString(),
        },
      }).select();

      if (createError) {
        logger.error('Error creating document record:', createError);
        continue;
      }

      const document = firstOrNull(newDocuments);

      uploadedDocuments.push({
        id: document?.id,
        fileName: document?.file_name,
        fileSize: document?.file_size,
        mimeType: document?.mime_type,
      });

      // Log file operation
      await db.from('file_operations').insert({
        operation: 'UPLOAD',
        performed_by: uploadLink.client?.id,
        document_id: document?.id,
        folder_id: uploadLink.folder?.id,
        details: {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          uploadedViaLink: true,
          uploadLinkId: uploadLink.id,
        },
        ip_address:
          req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
        user_agent: req.headers.get('user-agent') || null,
      });
    }

    // Update upload link usage
    await db.from('folder_upload_links')
      .update({
        upload_count: uploadLink.upload_count + files.length,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', uploadLink.id);

    // Send notification to tax preparer
    try {
      const { NotificationService } = await import('@/lib/services/notification.service');
      await NotificationService.send({
        userId: uploadLink.created_by,
        type: 'DOCUMENT_UPLOADED',
        title: 'New Documents Uploaded',
        message: `${uploadLink.client?.first_name || 'Client'} ${uploadLink.client?.last_name || ''} uploaded ${files.length} file(s) to ${uploadLink.folder?.name}`,
        channels: ['IN_APP', 'EMAIL', 'PUSH'],
        metadata: {
          folderId: uploadLink.folder?.id,
          folderName: uploadLink.folder?.name,
          clientId: uploadLink.client?.id,
          uploadLinkId: uploadLink.id,
          fileCount: files.length,
          documentIds: uploadedDocuments.map((d) => d.id),
          actionUrl: `/dashboard/tax-preparer/clients/${uploadLink.client?.id}/documents`,
        },
      });
    } catch (notificationError) {
      logger.error('Failed to send upload notification', notificationError);
      // Don't fail the upload if notification fails
    }

    logger.info('Files uploaded via link', {
      uploadLinkId: uploadLink.id,
      clientId: uploadLink.client?.id,
      folderId: uploadLink.folder?.id,
      fileCount: files.length,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${files.length} file(s)`,
      documents: uploadedDocuments,
      uploadCount: uploadLink.upload_count + files.length,
      remainingUploads: uploadLink.max_uploads
        ? uploadLink.max_uploads - (uploadLink.upload_count + files.length)
        : null,
    });
  } catch (error) {
    logger.error('Error uploading files via link:', error);
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}
