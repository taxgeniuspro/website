/**
 * Tax Preparer Referral Images API
 *
 * GET /api/tax-preparer/referral-images - List preparer's own 4 image folders
 * POST /api/tax-preparer/referral-images - Upload image to a specific folder
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { FolderType } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Folder type display configuration
const FOLDER_TYPE_INFO: Record<FolderType, { displayName: string; dateRange: string; description: string }> = {
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
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, role: true, firstName: true, lastName: true },
    });

    if (!profile || !['tax_preparer', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Not authorized as tax preparer' }, { status: 403 });
    }

    // Get preparer's 4 image folders
    const imageSets = await prisma.referralImageSet.findMany({
      where: {
        preparerId: profile.id,
        category: 'preparer',
      },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { folderType: 'asc' },
    });

    // Get default folders for fallback display
    const defaultSets = await prisma.referralImageSet.findMany({
      where: {
        category: 'default',
        preparerId: null,
        isActive: true,
      },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 4,
        },
      },
    });

    // Create a map of default images by folder type
    const defaultImagesByType: Record<FolderType, typeof defaultSets[0]['images']> = {
      preseason_loans: [],
      tax_season_lead: [],
      tax_season_intake: [],
      client_referral: [],
    };

    for (const set of defaultSets) {
      defaultImagesByType[set.folderType] = set.images;
    }

    return NextResponse.json({
      success: true,
      folderTypeInfo: FOLDER_TYPE_INFO,
      folders: imageSets.map((set) => ({
        id: set.id,
        name: set.name,
        folderType: set.folderType,
        isActive: set.isActive,
        imageCount: set.images.length,
        images: set.images.map((img) => ({
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
        defaultImages: set.images.length === 0 ? defaultImagesByType[set.folderType].map((img) => ({
          id: img.id,
          imageUrl: img.imageUrl,
          thumbnailUrl: img.thumbnailUrl,
          altText: img.altText,
        })) : [],
        usingDefault: set.images.length === 0,
      })),
    });
  } catch (error) {
    logger.error('Error listing preparer referral images', { error });
    return NextResponse.json(
      { error: 'Failed to list image folders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get preparer profile
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, role: true },
    });

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
    const imageSet = await prisma.referralImageSet.findFirst({
      where: {
        preparerId: profile.id,
        folderType,
        category: 'preparer',
      },
      include: {
        _count: { select: { images: true } },
      },
    });

    if (!imageSet) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Limit to 4 images per folder
    if (imageSet._count.images >= 4) {
      return NextResponse.json(
        { error: 'Maximum 4 images per folder. Delete an image first.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResult = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `taxgeniuspro/referral-images/${profile.id}/${folderType}`,
          resource_type: 'image',
          transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error('Upload failed'));
          } else {
            resolve(result);
          }
        }
      );
      uploadStream.end(buffer);
    });

    // Generate thumbnail URL
    const thumbnailUrl = cloudinary.url(uploadResult.public_id, {
      transformation: [{ width: 200, height: 200, crop: 'fill', quality: 'auto:low' }],
    });

    // Create database record
    const image = await prisma.referralImage.create({
      data: {
        setId: imageSet.id,
        imageUrl: uploadResult.secure_url,
        thumbnailUrl,
        fileName: file.name,
        altText: altText || `${FOLDER_TYPE_INFO[folderType].displayName} promotional image`,
        platform: platform || null,
        sortOrder: imageSet._count.images,
      },
    });

    logger.info('Uploaded referral image', {
      imageId: image.id,
      preparerId: profile.id,
      folderType,
    });

    return NextResponse.json({
      success: true,
      image: {
        id: image.id,
        imageUrl: image.imageUrl,
        thumbnailUrl: image.thumbnailUrl,
        fileName: image.fileName,
        altText: image.altText,
        platform: image.platform,
      },
    });
  } catch (error) {
    logger.error('Error uploading referral image', { error });
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
