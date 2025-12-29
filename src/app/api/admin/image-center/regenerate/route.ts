import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
interface Profile {
  id: string;
  role: string;
  supabaseUserId?: string | null;
  userId?: string | null;
  email?: string | null;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  negativePrompt?: string | null;
  provider: string;
  width?: number | null;
  height?: number | null;
  tags?: string[];
  category?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * POST /api/admin/image-center/regenerate
 * Regenerate an image based on an existing one with modifications
 * This creates a new generation with a link to the original
 * Admin only
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

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
    const {
      originalImageId,
      prompt,
      negativePrompt,
      provider,
      size,
      tags = [],
      category,
    } = body;

    // Validate required fields
    if (!originalImageId) {
      return NextResponse.json({ error: 'Original image ID is required' }, { status: 400 });
    }

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Get original image to link generation history
    const { data: originalImageData, error: fetchError } = await db
      .from('generated_images')
      .select('*')
      .eq('id', originalImageId)
      .single();

    if (fetchError || !originalImageData) {
      return NextResponse.json({ error: 'Original image not found' }, { status: 404 });
    }

    const originalImage = originalImageData as GeneratedImage;

    // Build request body for generation endpoint
    const generateBody = {
      prompt,
      negativePrompt: negativePrompt || originalImage.negativePrompt,
      provider: provider || originalImage.provider,
      count: 1, // Regenerate only generates one image
      size: size || `${originalImage.width}x${originalImage.height}`,
      tags: tags.length > 0 ? tags : originalImage.tags,
      category: category || originalImage.category,
    };

    // Call the generate endpoint internally
    // Note: We're making an internal API call here
    const generateUrl = new URL('/api/admin/image-center/generate', req.url);
    const generateReq = new Request(generateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pass along authentication
        cookie: req.headers.get('cookie') || '',
      },
      body: JSON.stringify(generateBody),
    });

    const generateResponse = await fetch(generateReq);
    const generateResult = await generateResponse.json();

    if (!generateResponse.ok) {
      return NextResponse.json(
        { error: generateResult.error || 'Failed to regenerate image' },
        { status: generateResponse.status }
      );
    }

    // Update the new image's metadata to link it to the original
    if (generateResult.success && generateResult.images && generateResult.images.length > 0) {
      const newImage = generateResult.images[0];

      await db
        .from('generated_images')
        .update({
          metadata: {
            ...(newImage.metadata || {}),
            regeneratedFrom: originalImageId,
            originalPrompt: originalImage.prompt,
          },
        })
        .eq('id', newImage.id);

      logger.info('Image regenerated', {
        originalImageId,
        newImageId: newImage.id,
        userId: profile.id,
      });
    }

    return NextResponse.json({
      success: true,
      ...generateResult,
      message: 'Image regenerated successfully',
    });
  } catch (error) {
    logger.error('Failed to regenerate image', error);
    return NextResponse.json(
      { error: 'Failed to regenerate image. Please try again.' },
      { status: 500 }
    );
  }
}
