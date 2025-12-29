import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email || ''}`)
      .limit(1);

    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { id: assetId } = await params;

    // Get asset
    const { data: assets } = await db
      .from('marketing_assets')
      .select('*')
      .eq('id', assetId)
      .limit(1);

    const asset = firstOrNull(assets);

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
    await db
      .from('marketing_assets')
      .delete()
      .eq('id', assetId);

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
