import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, firstOrNull } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';

// Local TypeScript interface (replacing Prisma types)
interface LandingPage {
  id: string;
  slug: string;
  city: string;
  state: string | null;
  headline: string;
  bodyContent: string;
  metaTitle: string;
  metaDescription: string;
  qaAccordion: { question: string; answer: string }[];
  generatedBy: string | null;
  version: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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

    // Check if landing page already exists
    const { data: existingPages } = await db
      .from('landing_pages')
      .select('id')
      .eq('slug', data.slug)
      .limit(1);

    const existingPage = firstOrNull(existingPages);

    if (existingPage) {
      return NextResponse.json(
        { error: `Landing page for ${data.city} already exists` },
        { status: 409 }
      );
    }

    // Create landing page
    const { data: landingPage, error } = await db
      .from('landing_pages')
      .insert({
        slug: data.slug,
        city: data.city,
        state: data.state || null,
        headline: data.headline,
        body_content: data.bodyContent,
        meta_title: data.metaTitle,
        meta_description: data.metaDescription,
        qa_accordion: data.qaAccordion,
        generated_by: data.generatedBy || userId,
        version: 1,
        is_published: false,
      })
      .select()
      .single();

    if (error) {
      logger.error('[Save Landing Page Error]:', error);
      return NextResponse.json({ error: 'Failed to save landing page' }, { status: 500 });
    }

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

    // Build query
    let query = db
      .from('landing_pages')
      .select('*')
      .order('created_at', { ascending: false });

    if (publishedFilter !== null) {
      query = query.eq('is_published', publishedFilter === 'true');
    }

    const { data: landingPages, error } = await query;

    if (error) {
      logger.error('[List Landing Pages Error]:', error);
      return NextResponse.json({ error: 'Failed to fetch landing pages' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: landingPages });
  } catch (error) {
    logger.error('[List Landing Pages Error]:', error);
    return NextResponse.json({ error: 'Failed to fetch landing pages' }, { status: 500 });
  }
}
