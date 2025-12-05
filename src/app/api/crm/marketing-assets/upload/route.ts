import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { Client } from 'ssh2';

/**
 * POST /api/crm/marketing-assets/upload
 * Upload a new marketing asset to VPS
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

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const fileName = `${category}_${timestamp}.${ext}`;

    // VPS upload path
    const vpsPath = `/var/www/uploads/marketing-assets/${profile.id}`;
    const vpsFilePath = `${vpsPath}/${fileName}`;

    // Public URL for accessing the file
    const fileUrl = `https://uploads.taxgeniuspro.tax/marketing-assets/${profile.id}/${fileName}`;

    // Get file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to VPS via SFTP
    await new Promise<void>((resolve, reject) => {
      const conn = new Client();

      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) {
            conn.end();
            return reject(err);
          }

          // Create directory if it doesn't exist
          sftp.mkdir(vpsPath, { mode: 0o755 }, (mkdirErr) => {
            // Ignore error if directory already exists

            // Upload file
            const writeStream = sftp.createWriteStream(vpsFilePath, {
              mode: 0o644,
            });

            writeStream.on('error', (writeErr) => {
              conn.end();
              reject(writeErr);
            });

            writeStream.on('close', () => {
              conn.end();
              resolve();
            });

            writeStream.write(buffer);
            writeStream.end();
          });
        });
      });

      conn.on('error', (connErr) => {
        reject(connErr);
      });

      // Connect to VPS
      conn.connect({
        host: '72.60.28.175',
        port: 22,
        username: 'root',
        password: process.env.VPS_PASSWORD || 'Bobby321&Gloria321Watkins?',
      });
    });

    logger.info('File uploaded to VPS:', {
      profileId: profile.id,
      fileName,
      vpsPath: vpsFilePath,
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
