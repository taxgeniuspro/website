/**
 * Individual Saved Reply API
 * GET    /api/support/saved-replies/[id] - Get saved reply
 * PATCH  /api/support/saved-replies/[id] - Update saved reply
 * DELETE /api/support/saved-replies/[id] - Delete saved reply
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import {
  getSavedReplyById,
  updateSavedReply,
  deleteSavedReply,
} from '@/lib/services/saved-reply.service';
import { logger } from '@/lib/logger';

/**
 * GET /api/support/saved-replies/[id]
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId: userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    const profile = firstOrNull(profileData);

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { id: replyId } = await params;
    const savedReply = await getSavedReplyById(replyId);

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
    const { id: errorId } = await params;
    logger.error('Failed to get saved reply', { error, id: errorId });
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
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId: userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id, role')
      .eq('user_id', userId)
      .limit(1);

    const profile = firstOrNull(profileData);

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { id: replyId } = await params;

    // Check ownership
    const { data: existingData, error: existingError } = await db
      .from('saved_replies')
      .select('created_by_id')
      .eq('id', replyId)
      .limit(1);

    const existing = firstOrNull(existingData);

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Saved reply not found' }, { status: 404 });
    }

    const isAdmin = profile.role === 'admin' || profile.role === 'super_admin';
    if (existing.created_by_id !== profile.id && !isAdmin) {
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

    const savedReply = await updateSavedReply(replyId, updates);

    return NextResponse.json({
      success: true,
      data: {
        savedReply,
      },
    });
  } catch (error) {
    const { id: errorId } = await params;
    logger.error('Failed to update saved reply', { error, id: errorId });
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
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId: userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    const profile = firstOrNull(profileData);

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { id: replyId } = await params;
    await deleteSavedReply(replyId, profile.id);

    return NextResponse.json({
      success: true,
      message: 'Saved reply deleted successfully',
    });
  } catch (error) {
    const { id: errorId } = await params;
    logger.error('Failed to delete saved reply', { error, id: errorId });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete saved reply',
      },
      { status: 500 }
    );
  }
}
