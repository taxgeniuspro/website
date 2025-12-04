import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * PATCH /api/crm/marketing-assets/[id]/set-primary
 * Set an asset as the primary photo
 */
export async function PATCH(
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

    // Only profile photos can be set as primary
    if (asset.category !== 'profile_photo') {
      return NextResponse.json(
        { error: 'Only profile photos can be set as primary' },
        { status: 400 }
      );
    }

    // Unset other primary photos in the same category
    await prisma.marketingAsset.updateMany({
      where: {
        profileId: profile.id,
        category: asset.category,
        isPrimary: true,
      },
      data: { isPrimary: false },
    });

    // Set this asset as primary
    const updatedAsset = await prisma.marketingAsset.update({
      where: { id: assetId },
      data: { isPrimary: true },
    });

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
