/**
 * POST /api/admin/referral-images/upload
 *
 * Upload promotional images to Cloudinary and associate with an image set.
 * Supports bulk upload of up to 4 images.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { v2 as cloudinary } from 'cloudinary';

// Lazy initialize Cloudinary
const getCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
  });
  return cloudinary;
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { role: true },
    });

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
    const imageSet = await prisma.referralImageSet.findUnique({
      where: { id: setId },
      select: {
        id: true,
        category: true,
        preparerId: true,
        _count: { select: { images: true } },
      },
    });

    if (!imageSet) {
      return NextResponse.json(
        { error: 'Image set not found' },
        { status: 404 }
      );
    }

    // Get current highest sort order
    const lastImage = await prisma.referralImage.findFirst({
      where: { setId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    let nextSortOrder = (lastImage?.sortOrder ?? -1) + 1;

    // Determine Cloudinary folder
    let folder = `referral-images/${imageSet.category}`;
    if (imageSet.preparerId) {
      const preparer = await prisma.profile.findUnique({
        where: { id: imageSet.preparerId },
        select: { customTrackingCode: true, trackingCode: true },
      });
      const code = preparer?.customTrackingCode || preparer?.trackingCode || imageSet.preparerId;
      folder = `referral-images/preparer-${code}`;
    }

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

      // Upload to Cloudinary
      const uploadResult = await new Promise<{
        secure_url: string;
        public_id: string;
        width: number;
        height: number;
      }>((resolve, reject) => {
        const uploadStream = getCloudinary().uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
            public_id: `image_${Date.now()}_${nextSortOrder}`,
            transformation: [
              { quality: 'auto:good' },
              { fetch_format: 'auto' },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as {
              secure_url: string;
              public_id: string;
              width: number;
              height: number;
            });
          }
        );
        uploadStream.end(buffer);
      });

      // Determine platform from dimensions
      let platform: string | null = null;
      if (uploadResult.width === uploadResult.height) {
        platform = 'instagram'; // Square
      } else if (uploadResult.width > uploadResult.height) {
        platform = 'facebook'; // Landscape
      } else {
        platform = 'story'; // Portrait
      }

      // Create thumbnail URL
      const thumbnailUrl = uploadResult.secure_url.replace(
        '/upload/',
        '/upload/w_300,h_300,c_fill/'
      );

      // Create database record
      const image = await prisma.referralImage.create({
        data: {
          setId,
          imageUrl: uploadResult.secure_url,
          thumbnailUrl,
          fileName: file.name,
          altText: `Promotional image for Tax Genius referral program`,
          sortOrder: nextSortOrder,
          platform,
          width: uploadResult.width,
          height: uploadResult.height,
        },
      });

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
