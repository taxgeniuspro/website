/**
 * Tax Preparer Referral Images API
 *
 * GET /api/tax-preparer/referral-images - List preparer's own 4 image folders
 * POST /api/tax-preparer/referral-images - Upload image to a specific folder
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { DiskStorageService } from '@/lib/services/disk-storage.service';

// Define FolderType locally (matches database enum)
type FolderType = 'preseason_loans' | 'tax_season_lead' | 'tax_season_intake' | 'client_referral';

// Folder type display configuration
const FOLDER_TYPE_INFO: Record<
  FolderType,
  { displayName: string; dateRange: string; description: string }
> = {
  preseason_loans: {
    displayName: 'Pre-Season Loans',
    dateRange: 'Dec 1 - Jan 14',
    description: 'Promote pre-season loan products to attract early filers.',
  },
  tax_season_lead: {
    displayName: 'Tax Season Lead',
    dateRange: 'Jan 15 - Apr 15',
    description: 'Get new leads during the main tax season.',
  },
  tax_season_intake: {
    displayName: 'Tax Season Intake',
    dateRange: 'Jan 15 - Apr 15',
    description: 'Drive intake form completions from your leads.',
  },
  client_referral: {
    displayName: 'Client Referral',
    dateRange: 'Year-round',
    description: 'Images clients use when sharing to earn $50-$100 referral bonuses.',
  },
};

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get preparer profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id, role, firstName, lastName')
      .eq('userId', session.user.id)
      .limit(1);

    const profile = firstOrNull(profiles);

    if (!profile || !['tax_preparer', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Not authorized as tax preparer' }, { status: 403 });
    }

    // Get preparer's 4 image folders with images
    const { data: imageSets } = await db
      .from('referral_image_sets')
      .select(
        `
        *,
        images:referral_images(*)
      `
      )
      .eq('preparerId', profile.id)
      .eq('category', 'preparer')
      .order('folderType', { ascending: true });

    // Get default folders for fallback display
    const { data: defaultSets } = await db
      .from('referral_image_sets')
      .select(
        `
        *,
        images:referral_images(*)
      `
      )
      .eq('category', 'default')
      .is('preparerId', null)
      .eq('isActive', true);

    // Create a map of default images by folder type
    type ImageRecord = { id: string; imageUrl: string; thumbnailUrl?: string; altText?: string };
    const defaultImagesByType: Record<FolderType, ImageRecord[]> = {
      preseason_loans: [],
      tax_season_lead: [],
      tax_season_intake: [],
      client_referral: [],
    };

    for (const set of defaultSets || []) {
      const folderType = set.folderType as FolderType;
      defaultImagesByType[folderType] = (set.images || []).slice(0, 4);
    }

    return NextResponse.json({
      success: true,
      folderTypeInfo: FOLDER_TYPE_INFO,
      folders: (imageSets || []).map((set) => {
        const images = set.images || [];
        const folderType = set.folderType as FolderType;
        return {
          id: set.id,
          name: set.name,
          folderType: set.folderType,
          isActive: set.isActive,
          imageCount: images.length,
          images: images.map((img: ImageRecord & { fileName?: string; platform?: string; downloadCount?: number; sortOrder?: number }) => ({
            id: img.id,
            imageUrl: img.imageUrl,
            thumbnailUrl: img.thumbnailUrl,
            fileName: img.fileName,
            altText: img.altText,
            platform: img.platform,
            downloadCount: img.downloadCount,
            sortOrder: img.sortOrder,
          })),
          // Include default images for preview when folder is empty
          defaultImages:
            images.length === 0
              ? defaultImagesByType[folderType].map((img) => ({
                  id: img.id,
                  imageUrl: img.imageUrl,
                  thumbnailUrl: img.thumbnailUrl,
                  altText: img.altText,
                }))
              : [],
          usingDefault: images.length === 0,
        };
      }),
    });
  } catch (error) {
    logger.error('Error listing preparer referral images', { error });
    return NextResponse.json({ error: 'Failed to list image folders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get preparer profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id, role')
      .eq('userId', session.user.id)
      .limit(1);

    const profile = firstOrNull(profiles);

    if (!profile || !['tax_preparer', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Not authorized as tax preparer' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderType = formData.get('folderType') as FolderType;
    const altText = formData.get('altText') as string;
    const platform = formData.get('platform') as string;

    if (!file || !folderType) {
      return NextResponse.json({ error: 'File and folderType are required' }, { status: 400 });
    }

    // Verify the folder belongs to this preparer
    const { data: imageSetsData } = await db
      .from('referral_image_sets')
      .select('id, folderType')
      .eq('preparerId', profile.id)
      .eq('folderType', folderType)
      .eq('category', 'preparer')
      .limit(1);

    const imageSet = firstOrNull(imageSetsData);

    if (!imageSet) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Count existing images
    const { count: imageCount } = await db
      .from('referral_images')
      .select('id', { count: 'exact', head: true })
      .eq('setId', imageSet.id);

    // Limit to 4 images per folder
    if ((imageCount || 0) >= 4) {
      return NextResponse.json(
        { error: 'Maximum 4 images per folder. Delete an image first.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate storage key
    const key = DiskStorageService.generateKey(profile.id, file.name, 'referral-images');

    // Upload to disk storage
    const uploadResult = await DiskStorageService.uploadFile(key, buffer, file.type, {
      encrypt: false, // Referral images are public
      generateThumbnail: true,
      thumbnailOptions: { width: 200, height: 200, fit: 'cover', quality: 80 },
    });

    // Create database record
    const { data: newImage, error: insertError } = await db
      .from('referral_images')
      .insert({
        setId: imageSet.id,
        imageUrl: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl || uploadResult.url,
        fileName: file.name,
        altText: altText || `${FOLDER_TYPE_INFO[folderType].displayName} promotional image`,
        platform: platform || null,
        sortOrder: imageCount || 0,
        width: uploadResult.width,
        height: uploadResult.height,
      })
      .select()
      .single();

    if (insertError || !newImage) {
      throw new Error(insertError?.message || 'Failed to insert image');
    }

    logger.info('Uploaded referral image', {
      imageId: newImage.id,
      preparerId: profile.id,
      folderType,
    });

    return NextResponse.json({
      success: true,
      image: {
        id: newImage.id,
        imageUrl: newImage.imageUrl,
        thumbnailUrl: newImage.thumbnailUrl,
        fileName: newImage.fileName,
        altText: newImage.altText,
        platform: newImage.platform,
      },
    });
  } catch (error) {
    logger.error('Error uploading referral image', { error });
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
