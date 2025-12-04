import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * GET /api/admin/image-center/images/[id]
 * Get a single generated image by ID
 * Admin only
 */
export async function GET(
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

    const image = await prisma.generatedImage.findUnique({
      where: { id: params.id },
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

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, image });
  } catch (error) {
    logger.error('Failed to fetch image', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/image-center/images/[id]
 * Update a generated image (tags, category, status, etc.)
 * Admin only
 */
export async function PUT(
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

    const body = await req.json();
    const { tags, category, status, metadata } = body;

    // Build update data
    const updateData: any = {};

    if (tags !== undefined) {
      updateData.tags = tags;
    }

    if (category !== undefined) {
      updateData.category = category;
    }

    if (status !== undefined) {
      if (!['generating', 'ready', 'accepted', 'rejected'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = status;

      // If status is being set to accepted, track who accepted it
      if (status === 'accepted') {
        updateData.acceptedBy = profile.id;
        updateData.acceptedAt = new Date();
      }
    }

    if (metadata !== undefined) {
      updateData.metadata = metadata;
    }

    const image = await prisma.generatedImage.update({
      where: { id: params.id },
      data: updateData,
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

    logger.info('Generated image updated', {
      imageId: image.id,
      userId: profile.id,
      updates: Object.keys(updateData),
    });

    return NextResponse.json({ success: true, image });
  } catch (error) {
    logger.error('Failed to update image', error);
    return NextResponse.json({ error: 'Failed to update image' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/image-center/images/[id]
 * Delete a generated image and its files
 * Admin only
 */
export async function DELETE(
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

    // Get image to find file paths
    const image = await prisma.generatedImage.findUnique({
      where: { id: params.id },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete files from filesystem
    try {
      if (image.imageUrl) {
        const imagePath = join(process.cwd(), 'public', image.imageUrl);
        if (existsSync(imagePath)) {
          await unlink(imagePath);
        }
      }

      if (image.thumbnailUrl) {
        const thumbPath = join(process.cwd(), 'public', image.thumbnailUrl);
        if (existsSync(thumbPath)) {
          await unlink(thumbPath);
        }
      }
    } catch (fileError) {
      logger.warn('Failed to delete image files', { imageId: image.id, error: fileError });
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await prisma.generatedImage.delete({
      where: { id: params.id },
    });

    logger.info('Generated image deleted', {
      imageId: params.id,
      userId: profile.id,
    });

    return NextResponse.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete image', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
