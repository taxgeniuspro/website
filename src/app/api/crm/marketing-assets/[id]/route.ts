import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * DELETE /api/crm/marketing-assets/[id]
 * Delete a marketing asset
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const assetId = params.id;

    // Get asset
    const asset = await prisma.marketingAsset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Verify ownership
    if (asset.profileId !== profile.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete file from disk
    const filePath = join(process.cwd(), 'public', asset.fileUrl);
    if (existsSync(filePath)) {
      try {
        await unlink(filePath);
      } catch (error) {
        logger.error('Error deleting file from disk:', error);
        // Continue anyway - we still want to delete the database record
      }
    }

    // Delete database record
    await prisma.marketingAsset.delete({
      where: { id: assetId },
    });

    logger.info('Marketing asset deleted:', {
      assetId: asset.id,
      profileId: profile.id,
      fileName: asset.fileName,
    });

    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting marketing asset:', error);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}
