import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { copyFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';

/**
 * POST /api/admin/image-center/images/[id]/accept
 * Accept a generated image and move it to the accepted directory
 * Admin only
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN' && profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the image
    const image = await prisma.generatedImage.findUnique({
      where: { id: params.id },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    if (image.status === 'accepted') {
      return NextResponse.json({
        success: true,
        image,
        message: 'Image already accepted'
      });
    }

    // Create accepted directory if it doesn't exist
    const acceptedDir = join(process.cwd(), 'public', 'images', 'generated', 'accepted');
    if (!existsSync(acceptedDir)) {
      await mkdir(acceptedDir, { recursive: true });
    }

    // Copy image from pending to accepted
    const currentImagePath = join(process.cwd(), 'public', image.imageUrl);
    const imageFilename = basename(image.imageUrl);
    const newImagePath = join(acceptedDir, imageFilename);
    const newImageUrl = `/images/generated/accepted/${imageFilename}`;

    if (existsSync(currentImagePath)) {
      await copyFile(currentImagePath, newImagePath);
    } else {
      logger.warn('Original image file not found', { imageId: image.id, path: currentImagePath });
    }

    // Update database
    const updatedImage = await prisma.generatedImage.update({
      where: { id: params.id },
      data: {
        status: 'accepted',
        imageUrl: newImageUrl,
        acceptedBy: profile.id,
        acceptedAt: new Date(),
      },
      include: {
        createdByProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        acceptedByProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    logger.info('Image accepted', {
      imageId: updatedImage.id,
      acceptedBy: profile.id,
    });

    return NextResponse.json({
      success: true,
      image: updatedImage,
      message: 'Image accepted successfully',
    });
  } catch (error) {
    logger.error('Failed to accept image', error);
    return NextResponse.json(
      { error: 'Failed to accept image' },
      { status: 500 }
    );
  }
}
