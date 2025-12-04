/**
 * Saved Replies API
 * POST /api/support/saved-replies - Create saved reply
 * GET  /api/support/saved-replies - List saved replies
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  createSavedReply,
  getSavedReplies,
  getSavedReplyCategories,
} from '@/lib/services/saved-reply.service';
import { logger } from '@/lib/logger';

/**
 * GET /api/support/saved-replies
 * List saved replies (user's own + global)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, role: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const includeCategories = searchParams.get('includeCategories') === 'true';

    // Get saved replies
    const savedReplies = await getSavedReplies(profile.id, {
      category,
      search,
    });

    // Optionally include categories list
    let categories = undefined;
    if (includeCategories) {
      categories = await getSavedReplyCategories();
    }

    return NextResponse.json({
      success: true,
      data: {
        replies: savedReplies, // Match component expectation
        savedReplies, // Keep for backwards compatibility
        categories,
      },
    });
  } catch (error) {
    logger.error('Failed to get saved replies', { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get saved replies',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/support/saved-replies
 * Create a new saved reply template
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, role: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only preparers and admins can create saved replies
    const canCreate =
      profile.role === 'TAX_PREPARER' || profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN';

    if (!canCreate) {
      return NextResponse.json(
        { error: 'Only tax preparers and admins can create saved replies' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, content, category, isGlobal } = body;

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content' },
        { status: 400 }
      );
    }

    // Only admins can create global replies
    const globalFlag = isGlobal && (profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN');

    // Create saved reply
    const savedReply = await createSavedReply({
      title,
      content,
      category: category || 'general',
      isGlobal: globalFlag || false,
      createdById: profile.id,
    });

    logger.info('Saved reply created via API', {
      savedReplyId: savedReply.id,
      createdById: profile.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        savedReply,
      },
    });
  } catch (error) {
    logger.error('Failed to create saved reply', { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create saved reply',
      },
      { status: 500 }
    );
  }
}
