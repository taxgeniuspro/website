import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  generateLandingPageContent,
  generateSlug,
  type GenerateContentInput,
} from '@/lib/services/ai-content.service';
import { checkRateLimit } from '@/lib/rate-limit';
import { isAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';

// Zod validation schema for input
const GenerateContentSchema = z.object({
  city: z.string().min(1, 'City is required').max(100, 'City name too long'),
  state: z.string().max(50, 'State name too long').optional(),
  keywords: z.string().min(1, 'Keywords are required').max(500, 'Keywords too long'),
});

/**
 * POST /api/ai-content/generate
 * Generate AI-powered landing page content
 *
 * Security:
 * - Requires ADMIN role (checked via Clerk)
 * - Rate limited to 10 requests/min per user
 * - Input validated with Zod
 * - Output sanitized with DOMPurify (in service layer)
 */
export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth(); const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    // ADMIN role check (AC2, AC6)
    const userIsAdmin = await isAdmin();
    if (!userIsAdmin) {
      return NextResponse.json(
        {
          error: 'Forbidden - Admin access required',
          message: 'This endpoint is only accessible to administrators.',
        },
        { status: 403 }
      );
    }

    // Rate limiting: 10 requests per minute per user (AC17)
    const rateLimit = await checkRateLimit(userId);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${rateLimit.retryAfter} seconds.`,
          retryAfter: rateLimit.retryAfter,
          limit: rateLimit.limit,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = GenerateContentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const input: GenerateContentInput = validationResult.data;

    // Check for GEMINI_API_KEY
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured - Missing GEMINI_API_KEY' },
        { status: 500 }
      );
    }

    // Generate content using AI service
    // NOTE: Content is automatically sanitized in the service layer (AC19)
    const generatedContent = await generateLandingPageContent(input);

    // Generate slug for URL
    const slug = generateSlug(input.city);

    // Return generated content with metadata
    return NextResponse.json({
      success: true,
      data: {
        ...generatedContent,
        slug,
        city: input.city,
        state: input.state,
        generatedBy: userId,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('[AI Content Generation Error]:', error);

    // Return user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          {
            error: 'AI generation timed out',
            message: 'The AI service took too long to respond. Please try again.',
            retryable: true,
          },
          { status: 504 }
        );
      }

      if (error.message.includes('API key')) {
        return NextResponse.json(
          {
            error: 'AI service configuration error',
            message: 'Please contact support.',
            retryable: false,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          error: 'Content generation failed',
          message: error.message,
          retryable: true,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Unknown error',
        message: 'An unexpected error occurred. Please try again.',
        retryable: true,
      },
      { status: 500 }
    );
  }
}
