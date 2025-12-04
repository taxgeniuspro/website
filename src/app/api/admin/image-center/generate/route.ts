import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/admin/image-center/generate
 * Generate AI images using OpenAI DALL-E or Replicate
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
      prompt,
      negativePrompt,
      provider = 'openai',
      count = 1,
      size = '1024x1024',
      tags = [],
      category,
    } = body;

    // Validate required fields
    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (count < 1 || count > 4) {
      return NextResponse.json({ error: 'Count must be between 1 and 4' }, { status: 400 });
    }

    // Generate a unique ID for this batch of images
    const generationId = uuidv4();

    // Create directory for generated images
    const uploadDir = join(process.cwd(), 'public', 'images', 'generated', 'pending');
    const thumbDir = join(process.cwd(), 'public', 'images', 'generated', 'thumbnails');

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    if (!existsSync(thumbDir)) {
      await mkdir(thumbDir, { recursive: true });
    }

    const generatedImages = [];

    try {
      if (provider === 'openai') {
        // OpenAI DALL-E 3 Generation
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
          return NextResponse.json(
            { error: 'OpenAI API key not configured' },
            { status: 500 }
          );
        }

        // DALL-E 3 only supports n=1, so we need to make multiple requests for multiple images
        for (let i = 0; i < count; i++) {
          const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
              model: 'dall-e-3',
              prompt: prompt,
              n: 1,
              size: size,
              quality: 'standard',
              response_format: 'url',
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            logger.error('OpenAI API error', error);
            throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
          }

          const data = await response.json();
          const imageUrl = data.data[0].url;
          const revisedPrompt = data.data[0].revised_prompt;

          // Download and save image
          const imageResponse = await fetch(imageUrl);
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

          // Generate unique filename
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 15);
          const filename = `ai-${timestamp}-${randomString}.png`;
          const filepath = join(uploadDir, filename);

          // Save original image
          await writeFile(filepath, imageBuffer);

          // Create thumbnail
          const thumbFilename = `ai-${timestamp}-${randomString}-thumb.webp`;
          const thumbFilepath = join(thumbDir, thumbFilename);

          await sharp(imageBuffer)
            .resize(400, 400, {
              fit: 'cover',
              position: 'center',
            })
            .webp({ quality: 80 })
            .toFile(thumbFilepath);

          // Get image dimensions
          const metadata = await sharp(imageBuffer).metadata();

          const savedImageUrl = `/images/generated/pending/${filename}`;
          const savedThumbUrl = `/images/generated/thumbnails/${thumbFilename}`;

          // Save to database
          const dbImage = await prisma.generatedImage.create({
            data: {
              prompt: revisedPrompt || prompt,
              negativePrompt: negativePrompt || null,
              provider: 'openai',
              modelUsed: 'dall-e-3',
              status: 'ready',
              imageUrl: savedImageUrl,
              thumbnailUrl: savedThumbUrl,
              width: metadata.width || null,
              height: metadata.height || null,
              fileSize: imageBuffer.length,
              tags: tags,
              category: category || null,
              generationId: generationId,
              createdBy: profile.id,
              metadata: {
                size,
                quality: 'standard',
                originalPrompt: prompt,
                revisedPrompt: revisedPrompt,
              },
            },
          });

          generatedImages.push(dbImage);

          logger.info('AI image generated (OpenAI)', {
            imageId: dbImage.id,
            generationId,
            userId: profile.id,
          });
        }
      } else if (provider === 'replicate') {
        // Replicate Stable Diffusion Generation
        const replicateToken = process.env.REPLICATE_API_TOKEN;
        if (!replicateToken) {
          return NextResponse.json(
            { error: 'Replicate API token not configured' },
            { status: 500 }
          );
        }

        // Parse size
        const [width, height] = size.split('x').map(Number);

        const response = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${replicateToken}`,
          },
          body: JSON.stringify({
            version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
            input: {
              prompt: prompt,
              negative_prompt: negativePrompt || '',
              width: width || 1024,
              height: height || 1024,
              num_outputs: count,
              num_inference_steps: 50,
              guidance_scale: 7.5,
            },
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          logger.error('Replicate API error', error);
          throw new Error(`Replicate API error: ${error.detail || 'Unknown error'}`);
        }

        const prediction = await response.json();

        // Create pending database entries (will be updated when images are ready)
        for (let i = 0; i < count; i++) {
          const dbImage = await prisma.generatedImage.create({
            data: {
              prompt: prompt,
              negativePrompt: negativePrompt || null,
              provider: 'replicate',
              modelUsed: 'stable-diffusion-xl',
              status: 'generating',
              imageUrl: '', // Will be updated later
              thumbnailUrl: null,
              width: width || null,
              height: height || null,
              fileSize: null,
              tags: tags,
              category: category || null,
              generationId: generationId,
              createdBy: profile.id,
              metadata: {
                predictionId: prediction.id,
                size,
                negativePrompt: negativePrompt,
              },
            },
          });

          generatedImages.push(dbImage);
        }

        logger.info('AI image generation started (Replicate)', {
          generationId,
          predictionId: prediction.id,
          userId: profile.id,
        });
      } else {
        return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        generationId,
        images: generatedImages,
        message: `${generatedImages.length} image(s) ${provider === 'openai' ? 'generated' : 'generation started'}`,
      });
    } catch (error: any) {
      logger.error('Failed to generate images', error);
      return NextResponse.json(
        { error: error.message || 'Failed to generate images' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Failed to process image generation request', error);
    return NextResponse.json(
      { error: 'Failed to process request. Please try again.' },
      { status: 500 }
    );
  }
}
