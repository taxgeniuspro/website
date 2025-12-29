import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ClientFolderService } from '@/lib/services/client-folder.service';

// Local type definitions
interface Profile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string;
}

interface ClientPreparer {
  id: string;
  clientId: string;
  preparerId: string;
  isActive: boolean;
  assignedAt: string;
}

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

    // Get profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id, userId, role')
      .eq('userId', userId)
      .limit(1);

    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.role !== 'tax_preparer' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all assigned clients
    const { data: clientAssignments } = await db
      .from('client_preparers')
      .select('id, clientId, preparerId, isActive, assignedAt')
      .eq('preparerId', profile.id)
      .eq('isActive', true);

    if (!clientAssignments || clientAssignments.length === 0) {
      return NextResponse.json({
        clients: [],
      });
    }

    // Get client profiles
    const clientIds = clientAssignments.map((a: ClientPreparer) => a.clientId);
    const { data: clientProfiles } = await db
      .from('profiles')
      .select('id, firstName, lastName, email')
      .in('id', clientIds);

    // Create map for quick lookup
    const clientProfileMap = new Map<string, Profile>();
    for (const client of clientProfiles || []) {
      clientProfileMap.set(client.id, client);
    }

    // Get folder info for each client
    const clientsWithFolders = await Promise.all(
      clientAssignments.map(async (assignment: ClientPreparer) => {
        const client = clientProfileMap.get(assignment.clientId);
        const folders = await ClientFolderService.getClientFolders(assignment.clientId);
        return {
          client: client || { id: assignment.clientId, firstName: null, lastName: null, email: null },
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

    // Get profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id, userId, role')
      .eq('userId', userId)
      .limit(1);

    const profile = firstOrNull(profiles);

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
    await db.from('file_operations').insert({
      operation: 'FOLDER_CREATE',
      performedBy: profile.id,
      folderId: result.folderId,
      details: {
        clientId,
        taxYear,
        createdByPreparer: true,
        yearFolderId: result.yearFolderId,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
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
