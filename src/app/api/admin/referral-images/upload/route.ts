/**
 * POST /api/admin/referral-images/upload
 *
 * Upload promotional images to disk storage and associate with an image set.
 * Supports bulk upload of up to 4 images.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { DiskStorageService } from '@/lib/services/disk-storage.service';

// Local interfaces
interface Profile {
  id: string;
  role: string;
}

interface ReferralImageSet {
  id: string;
  category: string;
  preparerId: string | null;
}

interface ReferralImage {
  sortOrder: number;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profileData } = await db.from('profiles')
      .select('id, role')
      .eq('userId', session.user.id)
      .limit(1);

    const profile = firstOrNull<Profile>(profileData);

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse form data
    const formData = await req.formData();
    const setId = formData.get('setId') as string;
    const files = formData.getAll('files') as File[];

    if (!setId) {
      return NextResponse.json(
        { error: 'Image set ID is required' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'At least one file is required' },
        { status: 400 }
      );
    }

    if (files.length > 4) {
      return NextResponse.json(
        { error: 'Maximum 4 files allowed per upload' },
        { status: 400 }
      );
    }

    // Verify image set exists
    const { data: imageSetData } = await db.from('referral_image_sets')
      .select('id, category, preparerId')
      .eq('id', setId)
      .limit(1);

    const imageSet = firstOrNull<ReferralImageSet>(imageSetData);

    if (!imageSet) {
      return NextResponse.json(
        { error: 'Image set not found' },
        { status: 404 }
      );
    }

    // Get current highest sort order
    const { data: lastImageData } = await db.from('referral_images')
      .select('sortOrder')
      .eq('setId', setId)
      .order('sortOrder', { ascending: false })
      .limit(1);

    const lastImage = firstOrNull<ReferralImage>(lastImageData);
    let nextSortOrder = (lastImage?.sortOrder ?? -1) + 1;

    // Upload files
    const uploadedImages = [];

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        continue; // Skip non-image files
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        continue; // Skip files over 5MB
      }

      // Convert File to Buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate storage key
      const ownerId = imageSet.preparerId || profile.id;
      const key = DiskStorageService.generateKey(ownerId, file.name, 'referral-images');

      // Upload to disk storage
      const uploadResult = await DiskStorageService.uploadFile(key, buffer, file.type, {
        encrypt: false, // Public images
        generateThumbnail: true,
        thumbnailOptions: { width: 300, height: 300, fit: 'cover', quality: 80 },
      });

      // Determine platform from dimensions
      let platform: string | null = null;
      if (uploadResult.width && uploadResult.height) {
        if (uploadResult.width === uploadResult.height) {
          platform = 'instagram'; // Square
        } else if (uploadResult.width > uploadResult.height) {
          platform = 'facebook'; // Landscape
        } else {
          platform = 'story'; // Portrait
        }
      }

      // Create database record
      const { data: image, error: createError } = await db.from('referral_images')
        .insert({
          setId,
          imageUrl: uploadResult.url,
          thumbnailUrl: uploadResult.thumbnailUrl || uploadResult.url,
          fileName: file.name,
          altText: `Promotional image for Tax Genius referral program`,
          sortOrder: nextSortOrder,
          platform,
          width: uploadResult.width,
          height: uploadResult.height,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      uploadedImages.push({
        id: image.id,
        url: image.imageUrl,
        thumbnailUrl: image.thumbnailUrl,
        fileName: image.fileName,
        platform: image.platform,
        width: image.width,
        height: image.height,
      });

      nextSortOrder++;
    }

    logger.info('Uploaded referral images', {
      setId,
      uploadedCount: uploadedImages.length,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedImages.length} images`,
      images: uploadedImages,
    });
  } catch (error) {
    logger.error('Error uploading referral images', { error });
    return NextResponse.json(
      { error: 'Failed to upload images' },
      { status: 500 }
    );
  }
}
