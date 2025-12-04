import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import {
  uploadRateLimit,
  getUserIdentifier,
  getClientIdentifier,
  getRateLimitHeaders,
} from '@/lib/rate-limit';

/**
 * POST /api/admin/products/upload
 * Upload product images (admin only)
 * Supports multiple image uploads
 * Rate limited: 20 uploads per hour per user
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check rate limit
    const ip = getClientIdentifier(req);
    const identifier = getUserIdentifier(userId, ip);
    const rateLimit = await uploadRateLimit.limit(identifier);

    if (!rateLimit.success) {
      logger.warn('Upload rate limit exceeded', { userId, ip });
      return NextResponse.json(
        { error: 'Too many upload requests. Please try again later.' },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit),
        }
      );
    }

    // Verify admin role
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate files
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Allowed: JPG, PNG, WEBP` },
          { status: 400 }
        );
      }

      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File ${file.name} is too large. Maximum size: 10MB` },
          { status: 400 }
        );
      }
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'products');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const uploadedImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `product-${timestamp}-${randomString}.webp`;
      const filepath = join(uploadDir, filename);

      // Process image with sharp
      // - Convert to webp for optimal size
      // - Resize to max 1200px width (maintain aspect ratio)
      // - Quality 85%
      await sharp(buffer)
        .resize(1200, null, {
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({ quality: 85 })
        .toFile(filepath);

      // Also create a thumbnail (400px)
      const thumbFilename = `product-${timestamp}-${randomString}-thumb.webp`;
      const thumbFilepath = join(uploadDir, thumbFilename);

      await sharp(buffer)
        .resize(400, 400, {
          withoutEnlargement: true,
          fit: 'cover',
        })
        .webp({ quality: 80 })
        .toFile(thumbFilepath);

      const imageUrl = `/uploads/products/${filename}`;
      const thumbUrl = `/uploads/products/${thumbFilename}`;

      uploadedImages.push({
        url: imageUrl,
        thumbUrl,
        altText: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        isPrimary: i === 0, // First image is primary by default
        isClientUpload: false,
      });

      logger.info('Product image uploaded', {
        filename,
        originalName: file.name,
        size: file.size,
        userId: profile.id,
      });
    }

    return NextResponse.json(
      {
        success: true,
        images: uploadedImages,
        message: `${uploadedImages.length} image(s) uploaded successfully`,
      },
      {
        headers: getRateLimitHeaders(rateLimit),
      }
    );
  } catch (error) {
    logger.error('Failed to upload product images', error);
    return NextResponse.json(
      { error: 'Failed to upload images. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Rate limiting configuration
 * Limit: 20 uploads per 15 minutes per user
 */
export const config = {
  api: {
    bodyParser: false, // Required for FormData
  },
};
