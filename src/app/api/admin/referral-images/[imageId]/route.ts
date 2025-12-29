/**
 * Admin Referral Image API (Single Image)
 *
 * DELETE /api/admin/referral-images/[imageId] - Delete an image
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { DiskStorageService } from '@/lib/services/disk-storage.service';

// Local interfaces
interface Profile {
  role: string;
}

interface ReferralImage {
  id: string;
  imageUrl: string;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { imageId } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profileData } = await db.from('profiles')
      .select('role')
      .eq('userId', session.user.id)
      .limit(1);

    const profile = firstOrNull<Profile>(profileData);

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the image
    const { data: imageData } = await db.from('referral_images')
      .select('*')
      .eq('id', imageId)
      .limit(1);

    const image = firstOrNull<ReferralImage>(imageData);

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete from disk storage
    const urlMatch = image.imageUrl.match(/\/api\/uploads\/(.+)$/);
    if (urlMatch) {
      const storageKey = urlMatch[1];
      try {
        await DiskStorageService.deleteFile(storageKey);
        logger.info('Deleted image from disk storage', { storageKey });
      } catch (storageError) {
        logger.warn('Failed to delete from disk storage (continuing anyway)', { error: String(storageError) });
      }
    }

    // Delete from database
    const { error: deleteError } = await db.from('referral_images')
      .delete()
      .eq('id', imageId);

    if (deleteError) {
      throw deleteError;
    }

    logger.info('Deleted referral image', { imageId });

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting referral image', { error });
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
