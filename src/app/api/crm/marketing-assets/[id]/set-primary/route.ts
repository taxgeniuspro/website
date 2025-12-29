import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * PATCH /api/crm/marketing-assets/[id]/set-primary
 * Set an asset as the primary photo
 */
export async function PATCH(
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

    // Only profile photos can be set as primary
    if (asset.category !== 'profile_photo') {
      return NextResponse.json(
        { error: 'Only profile photos can be set as primary' },
        { status: 400 }
      );
    }

    // Unset other primary photos in the same category
    await db
      .from('marketing_assets')
      .update({ isPrimary: false })
      .eq('profileId', profile.id)
      .eq('category', asset.category)
      .eq('isPrimary', true);

    // Set this asset as primary
    const { data: updatedAsset } = await db
      .from('marketing_assets')
      .update({ isPrimary: true })
      .eq('id', assetId)
      .select()
      .single();

    logger.info('Primary marketing asset updated:', {
      assetId: asset.id,
      profileId: profile.id,
      category: asset.category,
    });

    return NextResponse.json({
      success: true,
      asset: {
        id: updatedAsset.id,
        category: updatedAsset.category,
        fileName: updatedAsset.fileName,
        fileUrl: updatedAsset.fileUrl,
        isPrimary: updatedAsset.isPrimary,
      },
    });
  } catch (error) {
    logger.error('Error setting primary marketing asset:', error);
    return NextResponse.json({ error: 'Failed to set primary' }, { status: 500 });
  }
}
