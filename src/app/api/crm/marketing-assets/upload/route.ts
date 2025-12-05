import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/crm/marketing-assets/upload
 * Upload a new marketing asset via HTTP to VPS
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

    // Prepare upload to VPS
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('category', category);

    const uploadSecret = process.env.UPLOAD_SECRET || 'tax-genius-upload-2025';

    // Upload to VPS via HTTP
    const uploadResponse = await fetch('https://uploads.taxgeniuspro.tax/upload.php', {
      method: 'POST',
      headers: {
        'X-Upload-Secret': uploadSecret,
        'X-Profile-Id': profile.id,
      },
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({ error: 'Upload failed' }));
      logger.error('VPS upload failed:', errorData);
      return NextResponse.json({ error: errorData.error || 'Upload failed' }, { status: uploadResponse.status });
    }

    const uploadResult = await uploadResponse.json();
    const fileUrl = uploadResult.fileUrl;

    logger.info('File uploaded to VPS:', {
      profileId: profile.id,
      fileName: uploadResult.fileName,
      fileUrl,
    });

    // Try to create MarketingAsset record
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

    logger.info('Marketing asset uploaded successfully:', {
      assetId: asset?.id || 'none',
      profileId: profile.id,
      category,
      fileName: file.name,
      fileUrl,
    });

    return NextResponse.json({
      success: true,
      asset: {
        id: asset?.id || `temp_${Date.now()}`,
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
