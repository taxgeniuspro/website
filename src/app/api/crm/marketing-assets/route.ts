import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/crm/marketing-assets
 * Get all marketing assets for the current user
 */
export async function GET() {
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

    // Get marketing assets
    const { data: assets } = await db
      .from('marketing_assets')
      .select('*')
      .eq('profileId', profile.id)
      .order('isPrimary', { ascending: false }) // Primary first
      .order('createdAt', { ascending: false });

    return NextResponse.json({
      success: true,
      assets: (assets || []).map((asset: any) => ({
        id: asset.id,
        category: asset.category,
        fileName: asset.fileName,
        fileUrl: asset.fileUrl,
        fileSize: asset.fileSize,
        isPrimary: asset.isPrimary,
        createdAt: asset.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Error fetching marketing assets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
