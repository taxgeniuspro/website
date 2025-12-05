import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * POST /api/crm/marketing-assets/upload
 * Upload a new marketing asset
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

    // Create upload directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'marketing-assets', profile.id);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const fileName = `${category}_${timestamp}.${ext}`;
    const filePath = join(uploadDir, fileName);

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const fileUrl = `/api/uploads/marketing-assets/${profile.id}/${fileName}`;

    // Try to create MarketingAsset record, but if table doesn't exist yet, just update Profile
    let asset = null;
    const isPrimary = category === 'profile_photo';

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
    } catch (dbError: any) {
      // If MarketingAsset table doesn't exist yet, just log warning
      logger.warn('MarketingAsset table may not exist yet, skipping database record:', {
        error: dbError.message,
        category,
        profileId: profile.id,
      });
    }

    // Always update Profile.avatarUrl for profile photos
    if (isPrimary && category === 'profile_photo') {
      await prisma.profile.update({
        where: { id: profile.id },
        data: { avatarUrl: fileUrl },
      });
      logger.info('Updated profile avatarUrl:', { profileId: profile.id, avatarUrl: fileUrl });
    }

    logger.info('Marketing asset uploaded:', {
      assetId: asset?.id || 'none',
      profileId: profile.id,
      category,
      fileName: file.name,
      fileUrl,
    });

    return NextResponse.json({
      success: true,
      asset: {
        id: asset?.id || `temp_${timestamp}`,
        category: category,
        fileName: file.name,
        fileUrl: fileUrl,
        fileSize: file.size,
        isPrimary: isPrimary,
        createdAt: new Date().toISOString(),
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
