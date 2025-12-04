import { NextRequest, NextResponse } from 'next/server';
import { ReferrerService } from '@/lib/services/referrer.service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Slug parameter is required' }, { status: 400 });
    }

    if (slug.length < 3 || slug.length > 30) {
      return NextResponse.json(
        { error: 'Slug must be between 3 and 30 characters' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9-_]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug can only contain letters, numbers, hyphens, and underscores' },
        { status: 400 }
      );
    }

    const isAvailable = await ReferrerService.isVanitySlugAvailable(slug.toLowerCase());

    return NextResponse.json({ available: isAvailable });
  } catch (error) {
    logger.error('Error checking vanity slug availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
