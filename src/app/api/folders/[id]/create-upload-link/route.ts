import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const folderId = params.id;
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
    const preparer = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!preparer) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only tax preparers, admins, and super admins can create upload links
    if (
      preparer.role !== 'TAX_PREPARER' &&
      preparer.role !== 'ADMIN' &&
      preparer.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json(
        { error: 'Only tax preparers can create upload links' },
        { status: 403 }
      );
    }

    // Verify folder exists and belongs to the client
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Verify the folder belongs to the specified client
    if (folder.ownerId !== clientId) {
      return NextResponse.json(
        { error: 'Folder does not belong to specified client' },
        { status: 400 }
      );
    }

    // For tax preparers (not admins), verify they're assigned to this client
    if (preparer.role === 'TAX_PREPARER') {
      const assignment = await prisma.clientPreparer.findFirst({
        where: {
          clientId: clientId,
          preparerId: preparer.id,
          isActive: true,
        },
      });

      if (!assignment) {
        return NextResponse.json(
          { error: 'You are not assigned to this client' },
          { status: 403 }
        );
      }
    }

    // Verify client exists
    const client = await prisma.profile.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Create upload link
    const uploadLink = await prisma.folderUploadLink.create({
      data: {
        folderId,
        clientId,
        createdBy: preparer.id,
        expiresAt,
        maxUploads: maxUploads || null,
        metadata: {
          folderName: folder.name,
          folderPath: folder.path,
          clientName: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
          preparerName: `${preparer.firstName || ''} ${preparer.lastName || ''}`.trim(),
        },
      },
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
            phone: true,
          },
        },
      },
    });

    // Log the operation
    await prisma.fileOperation.create({
      data: {
        operation: 'SHARE',
        performedBy: preparer.id,
        folderId: folder.id,
        details: {
          action: 'create_upload_link',
          linkId: uploadLink.id,
          clientId,
          expiresAt: expiresAt.toISOString(),
        },
        ipAddress:
          req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      },
    });

    logger.info('Upload link created', {
      linkId: uploadLink.id,
      preparerId: preparer.id,
      clientId,
      folderId,
      expiresAt: expiresAt.toISOString(),
    });

    // Generate the full URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
    const uploadUrl = `${baseUrl}/upload/${uploadLink.token}`;

    return NextResponse.json(
      {
        success: true,
        uploadLink: {
          id: uploadLink.id,
          token: uploadLink.token,
          url: uploadUrl,
          folderId: uploadLink.folderId,
          folderName: uploadLink.folder.name,
          clientId: uploadLink.clientId,
          clientName: `${uploadLink.client.firstName || ''} ${uploadLink.client.lastName || ''}`.trim(),
          clientPhone: uploadLink.client.phone,
          expiresAt: uploadLink.expiresAt.toISOString(),
          maxUploads: uploadLink.maxUploads,
          isActive: uploadLink.isActive,
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
