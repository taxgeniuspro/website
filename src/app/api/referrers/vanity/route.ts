import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { ReferrerService } from '@/lib/services/referrer.service';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const vanitySlugSchema = z.object({
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(30, 'Slug must be less than 30 characters')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Slug can only contain letters, numbers, hyphens, and underscores'),
});

export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireRole('REFERRER');

    const vanityUrl = await ReferrerService.getVanityUrl(profile.id);

    return NextResponse.json({ vanityUrl });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    logger.error('Error fetching vanity URL:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireRole('REFERRER');

    const body = await request.json();
    const { slug } = vanitySlugSchema.parse(body);

    const result = await ReferrerService.setVanitySlug(profile.id, slug.toLowerCase());

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to set vanity slug' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, slug: slug.toLowerCase() });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    logger.error('Error setting vanity slug:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
