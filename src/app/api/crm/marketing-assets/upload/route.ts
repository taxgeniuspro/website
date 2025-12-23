import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { v2 as cloudinary } from 'cloudinary';

// Lazy initialize Cloudinary to avoid build errors
const getCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
  });
  return cloudinary;
};

/**
 * POST /api/crm/marketing-assets/upload
 * Upload a new marketing asset to Cloudinary CDN
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: { id: true, role: true },
    });

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

    // Convert File to Buffer for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = getCloudinary().uploader.upload_stream(
        {
          folder: `marketing-assets/${profile.id}/${category}`,
          resource_type: 'image',
          public_id: `${category}_${Date.now()}`,
          overwrite: false,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(buffer);
    });

    const fileUrl = uploadResult.secure_url;

    logger.info('File uploaded to Cloudinary:', {
      profileId: profile.id,
      fileName: file.name,
      fileUrl,
      cloudinaryPublicId: uploadResult.public_id,
    });

    // Create MarketingAsset record
    const isPrimary = category === 'profile_photo';
    let asset;

    try {
      if (isPrimary) {
        // Unset other primary photos
        await prisma.marketingAsset.updateMany({
          where: {
            profileId: profile.id,
            category: 'profile_photo',
            isPrimary: true,
          },
          data: { isPrimary: false },
        });
      }

      // Create database record
      asset = await prisma.marketingAsset.create({
        data: {
          profileId: profile.id,
          category,
          fileName: file.name,
          fileUrl,
          fileSize: file.size,
          mimeType: file.type,
          isPrimary,
        },
      });

      logger.info('Marketing asset created in database:', {
        assetId: asset.id,
        profileId: profile.id,
        category,
      });
    } catch (dbError: unknown) {
      // Database error is critical - we have an orphaned file in Cloudinary
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      logger.error('Failed to create MarketingAsset database record:', {
        error: errorMessage,
        category,
        profileId: profile.id,
        cloudinaryUrl: fileUrl,
      });

      // Try to delete the orphaned Cloudinary file
      try {
        await getCloudinary().uploader.destroy(uploadResult.public_id);
        logger.info('Cleaned up orphaned Cloudinary file:', { publicId: uploadResult.public_id });
      } catch (cleanupError) {
        logger.error('Failed to cleanup orphaned Cloudinary file:', { publicId: uploadResult.public_id });
      }

      return NextResponse.json(
        { error: 'Failed to save asset to database', details: errorMessage },
        { status: 500 }
      );
    }

    // Always update Profile.avatarUrl for profile photos
    if (isPrimary && category === 'profile_photo') {
      await prisma.profile.update({
        where: { id: profile.id },
        data: { avatarUrl: fileUrl },
      });
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
        createdAt: asset.createdAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error uploading marketing asset:', error);
    return NextResponse.json({
      error: 'Failed to upload asset',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
