import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    // Find upload link by token
    const uploadLink = await prisma.folderUploadLink.findUnique({
      where: { token },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            path: true,
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
      },
    });

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
    if (new Date() > uploadLink.expiresAt) {
      return NextResponse.json(
        {
          valid: false,
          error: 'This upload link has expired',
          expiresAt: uploadLink.expiresAt.toISOString(),
        },
        { status: 410 }
      );
    }

    // Check if inactive
    if (!uploadLink.isActive) {
      return NextResponse.json(
        {
          valid: false,
          error: 'This upload link has been deactivated',
        },
        { status: 403 }
      );
    }

    // Check upload limit
    if (uploadLink.maxUploads && uploadLink.uploadCount >= uploadLink.maxUploads) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Upload limit reached for this link',
          uploadCount: uploadLink.uploadCount,
          maxUploads: uploadLink.maxUploads,
        },
        { status: 403 }
      );
    }

    // Return valid link information
    return NextResponse.json({
      valid: true,
      folder: {
        id: uploadLink.folder.id,
        name: uploadLink.folder.name,
        path: uploadLink.folder.path,
      },
      client: {
        id: uploadLink.client.id,
        firstName: uploadLink.client.firstName,
        lastName: uploadLink.client.lastName,
      },
      preparer: {
        firstName: uploadLink.creator.firstName,
        lastName: uploadLink.creator.lastName,
        companyName: uploadLink.creator.companyName,
      },
      expiresAt: uploadLink.expiresAt.toISOString(),
      uploadCount: uploadLink.uploadCount,
      maxUploads: uploadLink.maxUploads,
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
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    // Find and validate upload link
    const uploadLink = await prisma.folderUploadLink.findUnique({
      where: { token },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            path: true,
            ownerId: true,
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!uploadLink) {
      return NextResponse.json(
        { error: 'Invalid upload link' },
        { status: 404 }
      );
    }

    // Validate link is still active and not expired
    if (new Date() > uploadLink.expiresAt) {
      return NextResponse.json(
        { error: 'This upload link has expired' },
        { status: 410 }
      );
    }

    if (!uploadLink.isActive) {
      return NextResponse.json(
        { error: 'This upload link has been deactivated' },
        { status: 403 }
      );
    }

    // Check upload limit
    if (uploadLink.maxUploads && uploadLink.uploadCount >= uploadLink.maxUploads) {
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
    if (uploadLink.maxUploads) {
      const newTotal = uploadLink.uploadCount + files.length;
      if (newTotal > uploadLink.maxUploads) {
        return NextResponse.json(
          {
            error: `Upload would exceed limit. ${uploadLink.maxUploads - uploadLink.uploadCount} uploads remaining.`,
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
        uploadLink.client.id,
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
      const document = await prisma.document.create({
        data: {
          profileId: uploadLink.client.id,
          type: 'OTHER', // Default type for uploads via link
          fileName: file.name,
          fileUrl: `/uploads/documents/${uploadLink.client.id}/${defaultTaxYear}/${fileName}`,
          fileSize: file.size,
          mimeType: file.type,
          isEncrypted: false,
          taxYear: defaultTaxYear,
          status: 'PENDING', // Requires preparer review
          folderId: uploadLink.folder.id,
          uploadLinkId: uploadLink.id, // Track which link was used
          metadata: {
            uploadedViaLink: true,
            uploadLinkToken: token,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      uploadedDocuments.push({
        id: document.id,
        fileName: document.fileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
      });

      // Log file operation
      await prisma.fileOperation.create({
        data: {
          operation: 'UPLOAD',
          performedBy: uploadLink.client.id,
          documentId: document.id,
          folderId: uploadLink.folder.id,
          details: {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            uploadedViaLink: true,
            uploadLinkId: uploadLink.id,
          },
          ipAddress:
            req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
        },
      });
    }

    // Update upload link usage
    await prisma.folderUploadLink.update({
      where: { id: uploadLink.id },
      data: {
        uploadCount: { increment: files.length },
        lastUsedAt: new Date(),
      },
    });

    // Send notification to tax preparer
    try {
      const { NotificationService } = await import('@/lib/services/notification.service');
      await NotificationService.send({
        userId: uploadLink.creator.id,
        type: 'DOCUMENT_UPLOADED',
        title: 'New Documents Uploaded',
        message: `${uploadLink.client.firstName || 'Client'} ${uploadLink.client.lastName || ''} uploaded ${files.length} file(s) to ${uploadLink.folder.name}`,
        channels: ['IN_APP', 'EMAIL', 'PUSH'],
        metadata: {
          folderId: uploadLink.folder.id,
          folderName: uploadLink.folder.name,
          clientId: uploadLink.client.id,
          uploadLinkId: uploadLink.id,
          fileCount: files.length,
          documentIds: uploadedDocuments.map((d) => d.id),
          actionUrl: `/dashboard/tax-preparer/clients/${uploadLink.client.id}/documents`,
        },
      });
    } catch (notificationError) {
      logger.error('Failed to send upload notification', notificationError);
      // Don't fail the upload if notification fails
    }

    logger.info('Files uploaded via link', {
      uploadLinkId: uploadLink.id,
      clientId: uploadLink.client.id,
      folderId: uploadLink.folder.id,
      fileCount: files.length,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${files.length} file(s)`,
      documents: uploadedDocuments,
      uploadCount: uploadLink.uploadCount + files.length,
      remainingUploads: uploadLink.maxUploads
        ? uploadLink.maxUploads - (uploadLink.uploadCount + files.length)
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
