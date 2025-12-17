import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ClientFolderService } from '@/lib/services/client-folder.service';

/**
 * GET /api/tax-preparer/client-folders
 * Get folder information for all assigned clients
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.role !== 'tax_preparer' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all assigned clients with their folder info
    const clientAssignments = await prisma.clientPreparer.findMany({
      where: {
        preparerId: profile.id,
        isActive: true,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Get folder info for each client
    const clientsWithFolders = await Promise.all(
      clientAssignments.map(async (assignment) => {
        const folders = await ClientFolderService.getClientFolders(assignment.clientId);
        return {
          client: assignment.client,
          hasFolder: !!folders.rootFolder,
          rootFolder: folders.rootFolder,
          yearFolders: folders.yearFolders,
        };
      })
    );

    return NextResponse.json({
      clients: clientsWithFolders,
    });
  } catch (error) {
    logger.error('Error fetching client folders:', error);
    return NextResponse.json({ error: 'Failed to fetch client folders' }, { status: 500 });
  }
}

/**
 * POST /api/tax-preparer/client-folders
 * Create folder structure for a client
 *
 * Body:
 * - clientId: The client's profile ID
 * - taxYear: Tax year for the folder (e.g., 2024)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.role !== 'tax_preparer' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { clientId, taxYear } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    if (!taxYear || typeof taxYear !== 'number') {
      return NextResponse.json({ error: 'Valid tax year is required' }, { status: 400 });
    }

    // Create folder structure
    const result = await ClientFolderService.createClientFolderStructure(
      clientId,
      profile.id,
      taxYear
    );

    // Log the operation
    await prisma.fileOperation.create({
      data: {
        operation: 'FOLDER_CREATE',
        performedBy: profile.id,
        folderId: result.folderId,
        details: {
          clientId,
          taxYear,
          createdByPreparer: true,
          yearFolderId: result.yearFolderId,
        },
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      },
    });

    logger.info('Tax preparer created folder structure for client', {
      preparerId: profile.id,
      clientId,
      taxYear,
      folderId: result.folderId,
    });

    return NextResponse.json({
      success: true,
      folder: {
        id: result.folderId,
        path: result.path,
        yearFolderId: result.yearFolderId,
        yearPath: result.yearPath,
      },
    });
  } catch (error) {
    logger.error('Error creating client folder:', error);

    if (error instanceof Error) {
      if (error.message === 'Client not found') {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }
      if (error.message === 'Profile is not a client') {
        return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 });
      }
      if (error.message === 'Preparer is not assigned to this client') {
        return NextResponse.json({ error: 'You are not assigned to this client' }, { status: 403 });
      }
    }

    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}
