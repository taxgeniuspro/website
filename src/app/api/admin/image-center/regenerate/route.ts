import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN' && profile.role !== 'admin' && profile.role !== 'super_admin')) {
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
    const originalImage = await prisma.generatedImage.findUnique({
      where: { id: originalImageId },
    });

    if (!originalImage) {
      return NextResponse.json({ error: 'Original image not found' }, { status: 404 });
    }

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

      await prisma.generatedImage.update({
        where: { id: newImage.id },
        data: {
          metadata: {
            ...(newImage.metadata || {}),
            regeneratedFrom: originalImageId,
            originalPrompt: originalImage.prompt,
          },
        },
      });

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
