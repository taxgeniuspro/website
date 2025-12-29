import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { unlink } from 'fs/promises';
import { join } from 'path';
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
  negativePrompt?: string | null;
  provider: string;
  modelUsed?: string | null;
  status: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  tags?: string[];
  category?: string | null;
  generationId?: string | null;
  createdBy?: string | null;
  acceptedBy?: string | null;
  acceptedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/admin/image-center/images/[id]
 * Get a single generated image by ID
 * Admin only
 */
export async function GET(
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

    // Fetch the image
    const { data: imageData, error: imageError } = await db
      .from('generated_images')
      .select('*')
      .eq('id', id)
      .single();

    if (imageError || !imageData) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const image = imageData as GeneratedImage;

    // Fetch related profiles
    const profileIds = [image.createdBy, image.acceptedBy].filter(Boolean);
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
      ...image,
      createdByProfile: image.createdBy ? profilesMap[image.createdBy] || null : null,
      acceptedByProfile: image.acceptedBy ? profilesMap[image.acceptedBy] || null : null,
    };

    return NextResponse.json({ success: true, image: imageWithProfiles });
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

    const body = await req.json();
    const { tags, category, status, metadata } = body;

    // Build update data (using snake_case for Supabase)
    const updateData: Record<string, unknown> = {};

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
        updateData.accepted_by = profile.id;
        updateData.accepted_at = new Date().toISOString();
      }
    }

    if (metadata !== undefined) {
      updateData.metadata = metadata;
    }

    const { data: imageData, error: updateError } = await db
      .from('generated_images')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError || !imageData) {
      logger.error('Failed to update image', { error: updateError?.message });
      return NextResponse.json({ error: 'Failed to update image' }, { status: 500 });
    }

    const image = imageData as GeneratedImage;

    // Fetch related profiles
    const profileIds = [image.createdBy, image.acceptedBy].filter(Boolean);
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
      ...image,
      createdByProfile: image.createdBy ? profilesMap[image.createdBy] || null : null,
      acceptedByProfile: image.acceptedBy ? profilesMap[image.acceptedBy] || null : null,
    };

    logger.info('Generated image updated', {
      imageId: image.id,
      userId: profile.id,
      updates: Object.keys(updateData),
    });

    return NextResponse.json({ success: true, image: imageWithProfiles });
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

    // Get image to find file paths
    const { data: imageData, error: fetchError } = await db
      .from('generated_images')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !imageData) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const image = imageData as GeneratedImage;

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
    const { error: deleteError } = await db
      .from('generated_images')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Failed to delete image from database', { error: deleteError.message });
      return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
    }

    logger.info('Generated image deleted', {
      imageId: id,
      userId: profile.id,
    });

    return NextResponse.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete image', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
