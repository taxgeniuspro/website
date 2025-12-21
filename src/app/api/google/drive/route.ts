/**
 * Google Drive Company API
 *
 * GET /api/google/drive
 * Returns Drive folder structure and backup stats
 *
 * POST /api/google/drive
 * Initializes folder structure or triggers backup
 *
 * Query params for POST:
 * - action: 'init' | 'backup'
 * - documentId: (required for backup action)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { googleDriveCompanyService } from '@/lib/services/google';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userRole = user.role as string;
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can view Google Drive status' },
        { status: 403 }
      );
    }

    // Get backup stats
    const stats = await googleDriveCompanyService.getBackupStats();

    // Get folder info for each type
    const folderTypes = ['ROOT', 'CLIENT_ARCHIVES', 'MARKETING', 'FINANCIAL', 'COMPANY'] as const;
    const folders = await Promise.all(
      folderTypes.map(async (type) => {
        const info = await googleDriveCompanyService.getFolderInfo(type);
        return { type, ...info };
      })
    );

    return NextResponse.json({
      success: true,
      stats,
      folders: folders.filter((f) => f.folderId), // Only return existing folders
    });
  } catch (error) {
    logger.error('Error fetching Google Drive status:', error);
    return NextResponse.json(
      { error: 'Failed to get Drive status', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userRole = user.role as string;
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can manage Google Drive' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'init';

    switch (action) {
      case 'init':
        await googleDriveCompanyService.initializeFolderStructure();
        logger.info('Google Drive folder structure initialized');
        return NextResponse.json({
          success: true,
          message: 'Folder structure initialized successfully',
        });

      case 'backup': {
        const body = await req.json();
        const { documentId, fileContent, preparerId, clientName, year } = body;

        if (!documentId || !fileContent) {
          return NextResponse.json(
            { error: 'documentId and fileContent are required for backup' },
            { status: 400 }
          );
        }

        // Convert base64 content to buffer
        const buffer = Buffer.from(fileContent, 'base64');

        const result = await googleDriveCompanyService.backupDocument(documentId, buffer, {
          preparerId,
          clientName,
          year,
        });

        logger.info(`Document backed up to Google Drive: ${documentId}`, { result });
        return NextResponse.json({
          success: true,
          ...result,
        });
      }

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Use 'init' or 'backup'` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Google Drive action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform Drive action', details: (error as Error).message },
      { status: 500 }
    );
  }
}
