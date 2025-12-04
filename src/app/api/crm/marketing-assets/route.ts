import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/crm/marketing-assets
 * Get all marketing assets for the current user
 */
export async function GET() {
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

    // Get marketing assets
    const assets = await prisma.marketingAsset.findMany({
      where: { profileId: profile.id },
      orderBy: [
        { isPrimary: 'desc' }, // Primary first
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      assets: assets.map((asset) => ({
        id: asset.id,
        category: asset.category,
        fileName: asset.fileName,
        fileUrl: asset.fileUrl,
        fileSize: asset.fileSize,
        isPrimary: asset.isPrimary,
        createdAt: asset.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error('Error fetching marketing assets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
