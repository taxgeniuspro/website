/**
 * Individual Saved Reply API
 * GET    /api/support/saved-replies/[id] - Get saved reply
 * PATCH  /api/support/saved-replies/[id] - Update saved reply
 * DELETE /api/support/saved-replies/[id] - Delete saved reply
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getSavedReplyById,
  updateSavedReply,
  deleteSavedReply,
} from '@/lib/services/saved-reply.service';
import { logger } from '@/lib/logger';

/**
 * GET /api/support/saved-replies/[id]
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId: userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const savedReply = await getSavedReplyById(params.id);

    if (!savedReply) {
      return NextResponse.json({ error: 'Saved reply not found' }, { status: 404 });
    }

    // Check access (own reply or global)
    if (savedReply.createdById !== profile.id && !savedReply.isGlobal) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        savedReply,
      },
    });
  } catch (error) {
    logger.error('Failed to get saved reply', { error, id: params.id });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get saved reply',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/support/saved-replies/[id]
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId: userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, role: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check ownership
    const existing = await prisma.savedReply.findUnique({
      where: { id: params.id },
      select: { createdById: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Saved reply not found' }, { status: 404 });
    }

    const isAdmin = profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN';
    if (existing.createdById !== profile.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { title, content, category, isGlobal } = body;

    // Only admins can set isGlobal
    const updates: any = { title, content, category };
    if (isAdmin && isGlobal !== undefined) {
      updates.isGlobal = isGlobal;
    }

    const savedReply = await updateSavedReply(params.id, updates);

    return NextResponse.json({
      success: true,
      data: {
        savedReply,
      },
    });
  } catch (error) {
    logger.error('Failed to update saved reply', { error, id: params.id });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update saved reply',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/support/saved-replies/[id]
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId: userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    await deleteSavedReply(params.id, profile.id);

    return NextResponse.json({
      success: true,
      message: 'Saved reply deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete saved reply', { error, id: params.id });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete saved reply',
      },
      { status: 500 }
    );
  }
}
