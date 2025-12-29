import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { copyFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';

// Local type definitions (replacing @prisma/client)
interface Profile {
  id: string;
  role: string;
  supabaseUserId?: string | null;
  userId?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  status: string;
  imageUrl: string;
  createdBy?: string | null;
  acceptedBy?: string | null;
}

/**
 * POST /api/admin/image-center/images/[id]/accept
 * Accept a generated image and move it to the accepted directory
 * Admin only
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profilesData, error: profileError } = await db
      .from('profiles')
      .select('*')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email || ''}`)
      .limit(1);

    if (profileError) {
      logger.error('Failed to fetch profile', { error: profileError.message });
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 });
    }

    const profile = firstOrNull<Profile>(profilesData);

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the image
    const { data: imageData, error: fetchError } = await db
      .from('generated_images')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !imageData) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const image = imageData as GeneratedImage;

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
    const { data: updatedImageData, error: updateError } = await db
      .from('generated_images')
      .update({
        status: 'accepted',
        image_url: newImageUrl,
        accepted_by: profile.id,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedImageData) {
      logger.error('Failed to update image', { error: updateError?.message });
      return NextResponse.json({ error: 'Failed to accept image' }, { status: 500 });
    }

    const updatedImage = updatedImageData as GeneratedImage;

    // Fetch related profiles
    const profileIds = [updatedImage.createdBy, updatedImage.acceptedBy].filter(Boolean);
    let profilesMap: Record<string, { id: string; firstName: string | null; lastName: string | null; avatarUrl: string | null }> = {};

    if (profileIds.length > 0) {
      const { data: relatedProfiles } = await db
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', profileIds);

      if (relatedProfiles) {
        profilesMap = relatedProfiles.reduce((acc, p) => {
          acc[p.id] = {
            id: p.id,
            firstName: p.first_name,
            lastName: p.last_name,
            avatarUrl: p.avatar_url,
          };
          return acc;
        }, {} as typeof profilesMap);
      }
    }

    const imageWithProfiles = {
      ...updatedImage,
      createdByProfile: updatedImage.createdBy ? profilesMap[updatedImage.createdBy] || null : null,
      acceptedByProfile: updatedImage.acceptedBy ? profilesMap[updatedImage.acceptedBy] || null : null,
    };

    logger.info('Image accepted', {
      imageId: updatedImage.id,
      acceptedBy: profile.id,
    });

    return NextResponse.json({
      success: true,
      image: imageWithProfiles,
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
