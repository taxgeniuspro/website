import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';

// Zod validation schema for saving landing pages
const SaveLandingPageSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must contain only lowercase letters, numbers, and hyphens'
    ),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().max(50).optional(),
  headline: z.string().min(1, 'Headline is required').max(200),
  bodyContent: z.string().min(1, 'Body content is required'),
  metaTitle: z.string().min(1, 'Meta title is required').max(200),
  metaDescription: z.string().min(1, 'Meta description is required').max(500),
  qaAccordion: z
    .array(
      z.object({
        question: z.string().min(1, 'Question is required'),
        answer: z.string().min(1, 'Answer is required'),
      })
    )
    .min(1, 'At least one Q&A is required'),
  generatedBy: z.string().optional(),
});

/**
 * POST /api/landing-pages
 * Save generated landing page content to database
 */
export async function POST(request: Request) {
  try {
    const session = await auth(); const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userIsAdmin = await isAdmin();
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = SaveLandingPageSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    const existingPage = await prisma.landingPage.findUnique({
      where: { slug: data.slug },
    });

    if (existingPage) {
      return NextResponse.json(
        { error: `Landing page for ${data.city} already exists` },
        { status: 409 }
      );
    }

    const landingPage = await prisma.landingPage.create({
      data: {
        ...data,
        generatedBy: data.generatedBy || userId,
        version: 1,
        isPublished: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Landing page saved for ${data.city}. Set to draft status.`,
      data: landingPage,
    });
  } catch (error) {
    logger.error('[Save Landing Page Error]:', error);
    return NextResponse.json({ error: 'Failed to save landing page' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth(); const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userIsAdmin = await isAdmin();
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const publishedFilter = searchParams.get('published');

    const where: Prisma.LandingPageWhereInput = {};
    if (publishedFilter !== null) {
      where.isPublished = publishedFilter === 'true';
    }

    const landingPages = await prisma.landingPage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: landingPages });
  } catch (error) {
    logger.error('[List Landing Pages Error]:', error);
    return NextResponse.json({ error: 'Failed to fetch landing pages' }, { status: 500 });
  }
}
