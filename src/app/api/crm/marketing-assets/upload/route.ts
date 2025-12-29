import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { DiskStorageService } from '@/lib/services/disk-storage.service';

/**
 * POST /api/crm/marketing-assets/upload
 * Upload a new marketing asset to disk storage
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
      .select('id, role')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email || ''}`)
      .limit(1);

    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!category || !['profile_photo', 'logo', 'office', 'custom'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate storage key
    const key = DiskStorageService.generateKey(profile.id, file.name, 'marketing');

    // Upload to disk storage
    const uploadResult = await DiskStorageService.uploadFile(key, buffer, file.type, {
      encrypt: false, // Marketing assets are public
      generateThumbnail: true,
      thumbnailOptions: { width: 300, height: 300, fit: 'cover', quality: 80 },
    });

    const fileUrl = uploadResult.url;

    logger.info('File uploaded to disk storage:', {
      profileId: profile.id,
      fileName: file.name,
      fileUrl,
      storageKey: key,
    });

    // Create MarketingAsset record
    const isPrimary = category === 'profile_photo';
    let asset;

    try {
      if (isPrimary) {
        // Unset other primary photos
        await db
          .from('marketing_assets')
          .update({ isPrimary: false })
          .eq('profileId', profile.id)
          .eq('category', 'profile_photo')
          .eq('isPrimary', true);
      }

      // Create database record
      const { data: newAsset, error: insertError } = await db
        .from('marketing_assets')
        .insert({
          profileId: profile.id,
          category,
          fileName: file.name,
          fileUrl,
          fileSize: file.size,
          mimeType: file.type,
          isPrimary,
        })
        .select()
        .single();

      if (insertError || !newAsset) {
        throw new Error(insertError?.message || 'Failed to insert asset');
      }

      asset = newAsset;

      logger.info('Marketing asset created in database:', {
        assetId: asset.id,
        profileId: profile.id,
        category,
      });
    } catch (dbError: unknown) {
      // Database error is critical - we have an orphaned file on disk
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      logger.error('Failed to create MarketingAsset database record:', {
        error: errorMessage,
        category,
        profileId: profile.id,
        storageUrl: fileUrl,
      });

      // Try to delete the orphaned file
      try {
        await DiskStorageService.deleteFile(key);
        logger.info('Cleaned up orphaned file:', { storageKey: key });
      } catch (cleanupError) {
        logger.error('Failed to cleanup orphaned file:', { storageKey: key });
      }

      return NextResponse.json(
        { error: 'Failed to save asset to database', details: errorMessage },
        { status: 500 }
      );
    }

    // Always update Profile.avatarUrl for profile photos
    if (isPrimary && category === 'profile_photo') {
      await db.from('profiles').update({ avatarUrl: fileUrl }).eq('id', profile.id);
      logger.info('Updated profile avatarUrl:', { profileId: profile.id, avatarUrl: fileUrl });
    }

    logger.info('Marketing asset uploaded successfully:', {
      assetId: asset.id,
      profileId: profile.id,
      category,
      fileName: file.name,
      fileUrl,
    });

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        category: asset.category,
        fileName: asset.fileName,
        fileUrl: asset.fileUrl,
        fileSize: asset.fileSize,
        isPrimary: asset.isPrimary,
        createdAt: asset.createdAt, // Supabase returns ISO string directly
      },
    });
  } catch (error) {
    logger.error('Error uploading marketing asset:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload asset',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
